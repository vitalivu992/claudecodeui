#!/bin/bash

# Semantic Version Determination Script
# Analyzes commit messages to determine appropriate version bump type

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output (to stderr in CI)
print_info() {
    if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]]; then
        echo -e "${BLUE}ℹ️  $1${NC}" >&2
    else
        echo -e "${BLUE}ℹ️  $1${NC}"
    fi
}

print_success() {
    if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]]; then
        echo -e "${GREEN}✅ $1${NC}" >&2
    else
        echo -e "${GREEN}✅ $1${NC}"
    fi
}

print_warning() {
    if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]]; then
        echo -e "${YELLOW}⚠️  $1${NC}" >&2
    else
        echo -e "${YELLOW}⚠️  $1${NC}"
    fi
}

print_error() {
    if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]]; then
        echo -e "${RED}❌ $1${NC}" >&2
    else
        echo -e "${RED}❌ $1${NC}"
    fi
}

# Function to get commits since last tag
get_commits_since_last_tag() {
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    
    if [[ -z "$last_tag" ]]; then
        print_info "No previous tags found, analyzing all commits"
        git log --pretty=format:"%s" HEAD~20..HEAD 2>/dev/null || git log --pretty=format:"%s" HEAD
    else
        print_info "Analyzing commits since last tag: $last_tag"
        git log --pretty=format:"%s" ${last_tag}..HEAD
    fi
}

# Function to analyze commit messages and determine version type
analyze_commits() {
    local commits="$1"
    local version_type="patch"  # Default to patch
    
    print_info "Analyzing commit messages..."
    
    # Count different types of changes
    local breaking_count=0
    local feat_count=0
    local fix_count=0
    local other_count=0
    
    # Check each commit
    while IFS= read -r commit; do
        if [[ -z "$commit" ]]; then
            continue
        fi
        
        print_info "  📝 $commit"
        
        # Check for breaking changes (highest priority)
        if echo "$commit" | grep -qE "^[a-zA-Z]+(\(.+\))?!:|BREAKING CHANGE:"; then
            ((breaking_count++))
            print_warning "    🚨 Breaking change detected"
        # Check for features
        elif echo "$commit" | grep -qE "^feat(\(.+\))?:"; then
            ((feat_count++))
            print_success "    ✨ Feature detected"
        # Check for fixes
        elif echo "$commit" | grep -qE "^fix(\(.+\))?:"; then
            ((fix_count++))
            print_success "    🐛 Fix detected"
        else
            ((other_count++))
            print_info "    🔧 Other change"
        fi
    done <<< "$commits"
    
    # Determine version bump based on priority
    if [[ $breaking_count -gt 0 ]]; then
        version_type="major"
        print_warning "Version bump: MAJOR (breaking changes: $breaking_count)"
    elif [[ $feat_count -gt 0 ]]; then
        version_type="minor"
        print_success "Version bump: MINOR (features: $feat_count, fixes: $fix_count, other: $other_count)"
    else
        version_type="patch"
        print_success "Version bump: PATCH (fixes: $fix_count, other: $other_count)"
    fi
    
    echo "$version_type"
}

# Function to get current version from package.json
get_current_version() {
    node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0"
}

# Function to calculate new version
calculate_new_version() {
    local current_version="$1"
    local bump_type="$2"
    
    # Split version into parts
    IFS='.' read -ra VERSION_PARTS <<< "$current_version"
    local major="${VERSION_PARTS[0]}"
    local minor="${VERSION_PARTS[1]}"
    local patch="${VERSION_PARTS[2]}"
    
    case "$bump_type" in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            print_error "Invalid bump type: $bump_type"
            exit 1
            ;;
    esac
    
    echo "${major}.${minor}.${patch}"
}

# Main function
main() {
    local mode="auto"
    local force_type=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                force_type="$2"
                mode="manual"
                shift 2
                ;;
            --help|-h)
                echo "Usage: $0 [--type patch|minor|major]"
                echo ""
                echo "Options:"
                echo "  --type TYPE    Force specific version bump type"
                echo "  --help, -h     Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                    # Auto-detect version from commits"
                echo "  $0 --type minor       # Force minor version bump"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    print_info "🚀 Starting semantic version determination..."
    
    # Ensure we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository"
        exit 1
    fi
    
    # Get current version
    local current_version=$(get_current_version)
    print_info "Current version: $current_version"
    
    local version_type
    
    if [[ "$mode" == "manual" ]]; then
        version_type="$force_type"
        print_info "Manual mode: forcing $version_type bump"
    else
        # Get commits and analyze them
        local commits=$(get_commits_since_last_tag)
        
        if [[ -z "$commits" ]]; then
            print_warning "No commits found since last tag, defaulting to patch"
            version_type="patch"
        else
            version_type=$(analyze_commits "$commits")
        fi
    fi
    
    # Calculate new version
    local new_version=$(calculate_new_version "$current_version" "$version_type")
    
    print_success "🎉 Version determination complete!"
    print_info "Current: $current_version"
    print_info "Bump type: $version_type"
    print_info "New version: $new_version"
    
    # Output for GitHub Actions and shell consumption
    if [[ -n "$CI" ]] || [[ -n "$GITHUB_ACTIONS" ]]; then
        # In CI, output clean environment variables to stdout
        echo "VERSION_TYPE=$version_type"
        echo "CURRENT_VERSION=$current_version"
        echo "NEW_VERSION=$new_version"
        
        # Also set GitHub Actions output if available
        if [[ -n "$GITHUB_OUTPUT" ]]; then
            echo "version_type=$version_type" >> "$GITHUB_OUTPUT"
            echo "current_version=$current_version" >> "$GITHUB_OUTPUT"
            echo "new_version=$new_version" >> "$GITHUB_OUTPUT"
        fi
        
        # Set environment variables if available
        if [[ -n "$GITHUB_ENV" ]]; then
            echo "VERSION_TYPE=$version_type" >> "$GITHUB_ENV"
            echo "CURRENT_VERSION=$current_version" >> "$GITHUB_ENV"
            echo "NEW_VERSION=$new_version" >> "$GITHUB_ENV"
        fi
    else
        # In local development, show the formatted output
        echo ""
        echo "export VERSION_TYPE=$version_type"
        echo "export CURRENT_VERSION=$current_version"  
        echo "export NEW_VERSION=$new_version"
        echo ""
        echo "To use these values:"
        echo "eval \$(./scripts/determine-version.sh)"
    fi
}

# Run main function with all arguments
main "$@"
