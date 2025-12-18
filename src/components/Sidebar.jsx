import React, { useState, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

import { FolderOpen, Folder, Plus, MessageSquare, Clock, ChevronDown, Check, X, Trash2, FolderPlus, RefreshCw, Edit2, Star, Search } from 'lucide-react';
import UserMenu from './UserMenu';
import { cn } from '../lib/utils';
import ClaudeLogo from './ClaudeLogo';
import CursorLogo from './CursorLogo.jsx';
import { api } from '../utils/api';

// Move formatTimeAgo outside component to avoid recreation on every render
const formatTimeAgo = (dateString, currentTime) => {
  const date = new Date(dateString);
  const now = currentTime;

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Unknown';
  }

  const diffInMs = now - date;
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInSeconds < 60) return 'Just now';
  if (diffInMinutes === 1) return '1 min ago';
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return date.toLocaleDateString();
};

function Sidebar({
  projects,
  selectedProject,
  selectedSession,
  onProjectSelect,
  onSessionSelect,
  onNewSession,
  onSessionDelete,
  onProjectDelete,
  isLoading,
  onRefresh,
  onShowSettings,
  updateAvailable,
  latestVersion,
  currentVersion,
  onShowVersionModal,
  isPWA,
  isMobile
}) {
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [editingProject, setEditingProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState({});
  const [additionalSessions, setAdditionalSessions] = useState({});
  const [initialSessionsLoaded, setInitialSessionsLoaded] = useState(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [projectSortOrder, setProjectSortOrder] = useState('date');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState({});
  const [searchFilter, setSearchFilter] = useState('');
  const [showPathDropdown, setShowPathDropdown] = useState(false);
  const [pathList, setPathList] = useState([]);
  const [filteredPaths, setFilteredPaths] = useState([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState(-1);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [projectDropdownFilter, setProjectDropdownFilter] = useState('');
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(-1);



  // Starred projects state - persisted in localStorage
  const [starredProjects, setStarredProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('starredProjects');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      console.error('Error loading starred projects:', error);
      return new Set();
    }
  });

  // Touch handler to prevent double-tap issues on iPad (only for buttons, not scroll areas)
  const handleTouchClick = (callback) => {
    return (e) => {
      // Only prevent default for buttons/clickable elements, not scrollable areas
      if (e.target.closest('.overflow-y-auto') || e.target.closest('[data-scroll-container]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      callback();
    };
  };

  // Auto-update timestamps every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(timer);
  }, []);

  // Close project dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProjectDropdown) {
        const dropdownElement = document.querySelector('[data-project-dropdown]');
        if (dropdownElement && !dropdownElement.contains(event.target)) {
          setShowProjectDropdown(false);
          setSelectedProjectIndex(-1);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProjectDropdown]);

  // Clear additional sessions when projects list changes (e.g., after refresh)
  useEffect(() => {
    setAdditionalSessions({});
    setInitialSessionsLoaded(new Set());
  }, [projects]);

  // Auto-expand project folder when a session is selected
  useEffect(() => {
    if (selectedSession && selectedProject) {
      setExpandedProjects(prev => new Set([...prev, selectedProject.name]));
    }
  }, [selectedSession, selectedProject]);

  // Mark sessions as loaded when projects come in
  useEffect(() => {
    if (projects.length > 0 && !isLoading) {
      const newLoaded = new Set();
      projects.forEach(project => {
        if (project.sessions && project.sessions.length >= 0) {
          newLoaded.add(project.name);
        }
      });
      setInitialSessionsLoaded(newLoaded);
    }
  }, [projects, isLoading]);

  // Load project sort order from settings
  useEffect(() => {
    const loadSortOrder = () => {
      try {
        const savedSettings = localStorage.getItem('claude-settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setProjectSortOrder(settings.projectSortOrder || 'date');
        }
        // Also check localStorage directly for projectSortOrder (QuickSettings stores it separately)
        const directSortOrder = localStorage.getItem('projectSortOrder');
        if (directSortOrder) {
          setProjectSortOrder(directSortOrder);
        }
      } catch (error) {
        console.error('Error loading sort order:', error);
      }
    };

    // Load initially
    loadSortOrder();

    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'claude-settings') {
        loadSortOrder();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Listen for custom event from QuickSettings
    const handleProjectSortOrderChange = (e) => {
      setProjectSortOrder(e.detail);
    };
    window.addEventListener('projectSortOrderChanged', handleProjectSortOrderChange);

    // Also check periodically when component is focused (for same-tab changes)
    const checkInterval = setInterval(() => {
      if (document.hasFocus()) {
        loadSortOrder();
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectSortOrderChanged', handleProjectSortOrderChange);
      clearInterval(checkInterval);
    };
  }, []);

  // Load available paths for suggestions
  useEffect(() => {
    const loadPaths = async () => {
      try {
        // Get recent paths from localStorage
        const recentPaths = JSON.parse(localStorage.getItem('recentProjectPaths') || '[]');

        // Load common/home directory paths
        const response = await api.browseFilesystem();
        const data = await response.json();

        if (data.suggestions) {
          const homePaths = data.suggestions.map(s => ({ name: s.name, path: s.path }));
          const allPaths = [...recentPaths.map(path => ({ name: path.split('/').pop(), path })), ...homePaths];
          setPathList(allPaths);
        } else {
          setPathList(recentPaths.map(path => ({ name: path.split('/').pop(), path })));
        }
      } catch (error) {
        console.error('Error loading paths:', error);
        const recentPaths = JSON.parse(localStorage.getItem('recentProjectPaths') || '[]');
        setPathList(recentPaths.map(path => ({ name: path.split('/').pop(), path })));
      }
    };

    loadPaths();
  }, []);

  // Handle input change and path filtering with dynamic browsing (ChatInterface pattern + dynamic browsing)
  useEffect(() => {
    const inputValue = newProjectPath.trim();

    if (inputValue.length === 0) {
      setShowPathDropdown(false);
      return;
    }

    // Show dropdown when user starts typing
    setShowPathDropdown(true);

    const updateSuggestions = async () => {
      // First show filtered existing suggestions from pathList
      const staticFiltered = pathList.filter(pathItem =>
        pathItem.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        pathItem.path.toLowerCase().includes(inputValue.toLowerCase())
      );

      // Check if input looks like a directory path for dynamic browsing
      const isDirPath = inputValue.includes('/') && inputValue.length > 1;

      if (isDirPath) {
        try {
          let dirToSearch;

          // Determine which directory to search
          if (inputValue.endsWith('/')) {
            // User typed "/home/simos/" - search inside /home/simos
            dirToSearch = inputValue.slice(0, -1);
          } else {
            // User typed "/home/simos/con" - search inside /home/simos for items starting with "con"
            const lastSlashIndex = inputValue.lastIndexOf('/');
            dirToSearch = inputValue.substring(0, lastSlashIndex);
          }

          // Only search if we have a valid directory path (not root only)
          if (dirToSearch && dirToSearch !== '') {
            const response = await api.browseFilesystem(dirToSearch);
            const data = await response.json();

            if (data.suggestions) {
              // Filter directories that match the current input
              const partialName = inputValue.substring(inputValue.lastIndexOf('/') + 1);
              const dynamicPaths = data.suggestions
                .filter(suggestion => {
                  const dirName = suggestion.name;
                  return partialName ? dirName.toLowerCase().startsWith(partialName.toLowerCase()) : true;
                })
                .map(s => ({ name: s.name, path: s.path }))
                .slice(0, 8);

              // Combine static and dynamic suggestions, prioritize dynamic
              const combined = [...dynamicPaths, ...staticFiltered].slice(0, 8);
              setFilteredPaths(combined);
              setSelectedPathIndex(-1);
              return;
            }
          }
        } catch (error) {
          console.debug('Dynamic browsing failed:', error.message);
        }
      }

      // Fallback to just static filtered suggestions
      setFilteredPaths(staticFiltered.slice(0, 8));
      setSelectedPathIndex(-1);
    };

    updateSuggestions();
  }, [newProjectPath, pathList]);

  // Select path from dropdown (ChatInterface pattern)
  const selectPath = (pathItem) => {
    setNewProjectPath(pathItem.path);
    setShowPathDropdown(false);
    setSelectedPathIndex(-1);
  };

  // Save path to recent paths
  const saveToRecentPaths = (path) => {
    try {
      const recentPaths = JSON.parse(localStorage.getItem('recentProjectPaths') || '[]');
      const updatedPaths = [path, ...recentPaths.filter(p => p !== path)].slice(0, 10);
      localStorage.setItem('recentProjectPaths', JSON.stringify(updatedPaths));
    } catch (error) {
      console.error('Error saving recent paths:', error);
    }
  };

  const toggleProject = (projectName) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectName)) {
      newExpanded.delete(projectName);
    } else {
      newExpanded.add(projectName);
    }
    setExpandedProjects(newExpanded);
  };

  // Starred projects utility functions
  const toggleStarProject = (projectName) => {
    const newStarred = new Set(starredProjects);
    if (newStarred.has(projectName)) {
      newStarred.delete(projectName);
    } else {
      newStarred.add(projectName);
    }
    setStarredProjects(newStarred);

    // Persist to localStorage
    try {
      localStorage.setItem('starredProjects', JSON.stringify([...newStarred]));
    } catch (error) {
      console.error('Error saving starred projects:', error);
    }
  };

  const isProjectStarred = (projectName) => {
    return starredProjects.has(projectName);
  };

  // Helper function to get all sessions for a project (initial + additional)
  const getAllSessions = (project) => {
    // Combine Claude and Cursor sessions; Sidebar will display icon per row
    const claudeSessions = [...(project.sessions || []), ...(additionalSessions[project.name] || [])].map(s => ({ ...s, __provider: 'claude' }));
    const cursorSessions = (project.cursorSessions || []).map(s => ({ ...s, __provider: 'cursor' }));
    // Sort by most recent activity/date
    const normalizeDate = (s) => new Date(s.__provider === 'cursor' ? s.createdAt : s.lastActivity);
    return [...claudeSessions, ...cursorSessions].sort((a, b) => normalizeDate(b) - normalizeDate(a));
  };

  // Helper function to get the last activity date for a project
  const getProjectLastActivity = (project) => {
    const allSessions = getAllSessions(project);
    if (allSessions.length === 0) {
      return new Date(0); // Return epoch date for projects with no sessions
    }

    // Find the most recent session activity
    const mostRecentDate = allSessions.reduce((latest, session) => {
      const sessionDate = new Date(session.lastActivity);
      return sessionDate > latest ? sessionDate : latest;
    }, new Date(0));

    return mostRecentDate;
  };

  // Combined sorting: starred projects first, then by selected order
  const sortedProjects = [...projects].sort((a, b) => {
    const aStarred = isProjectStarred(a.name);
    const bStarred = isProjectStarred(b.name);

    // First, sort by starred status
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;

    // For projects with same starred status, sort by selected order
    if (projectSortOrder === 'date') {
      // Sort by most recent activity (descending)
      return getProjectLastActivity(b) - getProjectLastActivity(a);
    } else {
      // Sort by display name (user-defined) or fallback to name (ascending)
      const nameA = a.displayName || a.name;
      const nameB = b.displayName || b.name;
      return nameA.localeCompare(nameB);
    }
  });

  const startEditing = (project) => {
    setEditingProject(project.name);
    setEditingName(project.displayName);
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setEditingName('');
  };

  const saveProjectName = async (projectName) => {
    try {
      const response = await api.renameProject(projectName, editingName);

      if (response.ok) {
        // Refresh projects to get updated data
        if (window.refreshProjects) {
          window.refreshProjects();
        } else {
          window.location.reload();
        }
      } else {
        console.error('Failed to rename project');
      }
    } catch (error) {
      console.error('Error renaming project:', error);
    }

    setEditingProject(null);
    setEditingName('');
  };

  const deleteSession = async (projectName, sessionId) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.deleteSession(projectName, sessionId);

      if (response.ok) {
        // Call parent callback if provided
        if (onSessionDelete) {
          onSessionDelete(sessionId);
        }
      } else {
        console.error('Failed to delete session');
        alert('Failed to delete session. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session. Please try again.');
    }
  };

  const updateSessionSummary = async (projectName, sessionId, summary) => {
    try {
      const response = await api.updateSessionSummary(projectName, sessionId, summary);

      if (response.ok) {
        // Update local session data immediately
        const project = projects.find(p => p.name === projectName);
        if (project) {
          const sessionIndex = (project.sessions || []).findIndex(s => s.id === sessionId);
          if (sessionIndex !== -1) {
            project.sessions[sessionIndex].summary = summary;
          }

          const additionalSessionIndex = (additionalSessions[projectName] || []).findIndex(s => s.id === sessionId);
          if (additionalSessionIndex !== -1) {
            additionalSessions[projectName][additionalSessionIndex].summary = summary;
          }
        }

        setEditingSession(null);
        setEditingSessionName('');
      } else {
        console.error('Failed to update session summary');
        alert('Failed to update session summary. Please try again.');
      }
    } catch (error) {
      console.error('Error updating session summary:', error);
      alert('Error updating session summary. Please try again.');
    }
  };

  const deleteProject = async (projectName) => {
    if (!confirm('Are you sure you want to delete this empty project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.deleteProject(projectName);

      if (response.ok) {
        // Call parent callback if provided
        if (onProjectDelete) {
          onProjectDelete(projectName);
        }
      } else {
        const error = await response.json();
        console.error('Failed to delete project');
        alert(error.error || 'Failed to delete project. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project. Please try again.');
    }
  };

  const createNewProject = async () => {
    if (!newProjectPath.trim()) {
      alert('Please enter a project path');
      return;
    }

    setCreatingProject(true);

    try {
      const response = await api.createProject(newProjectPath.trim());

      if (response.ok) {
        const result = await response.json();

        // Save the path to recent paths before clearing
        saveToRecentPaths(newProjectPath.trim());

        setShowNewProject(false);
        setNewProjectPath('');
        setShowSuggestions(false);

        // Refresh projects to show the new one
        if (window.refreshProjects) {
          window.refreshProjects();
        } else {
          window.location.reload();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project. Please try again.');
    } finally {
      setCreatingProject(false);
    }
  };

  const cancelNewProject = () => {
    setShowNewProject(false);
    setNewProjectPath('');
    setShowSuggestions(false);
  };

  const loadMoreSessions = async (project) => {
    // Check if we can load more sessions
    const canLoadMore = project.sessionMeta?.hasMore !== false;

    if (!canLoadMore || loadingSessions[project.name]) {
      return;
    }

    setLoadingSessions(prev => ({ ...prev, [project.name]: true }));

    try {
      const currentSessionCount = (project.sessions?.length || 0) + (additionalSessions[project.name]?.length || 0);
      const response = await api.sessions(project.name, 5, currentSessionCount);

      if (response.ok) {
        const result = await response.json();

        // Store additional sessions locally
        setAdditionalSessions(prev => ({
          ...prev,
          [project.name]: [
            ...(prev[project.name] || []),
            ...result.sessions
          ]
        }));

        // Update project metadata if needed
        if (result.hasMore === false) {
          // Mark that there are no more sessions to load
          project.sessionMeta = { ...project.sessionMeta, hasMore: false };
        }
      }
    } catch (error) {
      console.error('Error loading more sessions:', error);
    } finally {
      setLoadingSessions(prev => ({ ...prev, [project.name]: false }));
    }
  };

  // Filter projects based on search input
  const filteredProjects = sortedProjects.filter(project => {
    if (!searchFilter.trim()) return true;

    const searchLower = searchFilter.toLowerCase();
    const displayName = (project.displayName || project.name).toLowerCase();
    const projectName = project.name.toLowerCase();

    // Search in both display name and actual project name/path
    return displayName.includes(searchLower) || projectName.includes(searchLower);
  });

  // Filter projects for dropdown based on dropdown filter
  const filteredProjectsForDropdown = sortedProjects.filter(project => {
    if (!projectDropdownFilter.trim()) return true;

    const filterLower = projectDropdownFilter.toLowerCase();
    const displayName = (project.displayName || project.name).toLowerCase();
    const projectName = project.name.toLowerCase();

    return displayName.includes(filterLower) || projectName.includes(filterLower);
  });

  // Handle project selection from dropdown
  const handleProjectSelectFromDropdown = (project) => {
    setShowProjectDropdown(false);
    setProjectDropdownFilter('');
    setSelectedProjectIndex(-1);
    onProjectSelect(project);
  };

  // Handle dropdown navigation
  const handleProjectDropdownKeydown = (e) => {
    if (!showProjectDropdown) return;

    const filtered = filteredProjectsForDropdown;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedProjectIndex(prev =>
        prev < filtered.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedProjectIndex(prev =>
        prev > 0 ? prev - 1 : filtered.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedProjectIndex >= 0 && filtered[selectedProjectIndex]) {
        handleProjectSelectFromDropdown(filtered[selectedProjectIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowProjectDropdown(false);
      setSelectedProjectIndex(-1);
    }
  };


  return (
    <div
      className="h-full flex flex-col bg-card md:select-none"
      style={isPWA && isMobile ? { paddingTop: '44px' } : {}}
    >
      {/* Header */}
      <div className="md:p-4 md:border-b md:border-border">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Claude Code UI</h1>
              <p className="text-sm text-muted-foreground">AI coding assistant interface</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 px-0 hover:bg-accent transition-colors duration-200 group"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefresh();
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              title="Refresh projects and sessions (Ctrl+R)"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform duration-300`} />
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        <div
          className="md:hidden p-3 border-b border-border"
          style={isPWA && isMobile ? { paddingTop: '16px' } : {}}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Claude Code UI</h1>
                <p className="text-sm text-muted-foreground">Projects</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center active:scale-95 transition-all duration-150"
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await onRefresh();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 text-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* New Project Form */}
      {showNewProject && (
        <div className="md:p-3 md:border-b md:border-border md:bg-muted/30">
          {/* Desktop Form */}
          <div className="hidden md:block space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FolderPlus className="w-4 h-4" />
              Create New Project
            </div>
            <div className="relative">
              <Input
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                placeholder="/path/to/project or relative/path"
                className="text-sm focus:ring-2 focus:ring-primary/20"
                autoFocus
                onKeyDown={(e) => {
                  // Handle path dropdown navigation (ChatInterface pattern)
                  if (showPathDropdown && filteredPaths.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedPathIndex(prev =>
                        prev < filteredPaths.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedPathIndex(prev =>
                        prev > 0 ? prev - 1 : filteredPaths.length - 1
                      );
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (selectedPathIndex >= 0) {
                        selectPath(filteredPaths[selectedPathIndex]);
                      } else if (filteredPaths.length > 0) {
                        selectPath(filteredPaths[0]);
                      } else {
                        createNewProject();
                      }
                      return;
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowPathDropdown(false);
                      return;
                    } else if (e.key === 'Tab') {
                      e.preventDefault();
                      if (selectedPathIndex >= 0) {
                        selectPath(filteredPaths[selectedPathIndex]);
                      } else if (filteredPaths.length > 0) {
                        selectPath(filteredPaths[0]);
                      }
                      return;
                    }
                  }

                  // Regular input handling
                  if (e.key === 'Enter') {
                    createNewProject();
                  }
                  if (e.key === 'Escape') {
                    cancelNewProject();
                  }
                }}
              />

              {/* Path dropdown (ChatInterface pattern) */}
              {showPathDropdown && filteredPaths.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                  {filteredPaths.map((pathItem, index) => (
                    <div
                      key={pathItem.path}
                      className={`px-3 py-2 cursor-pointer border-b border-border last:border-b-0 ${
                        index === selectedPathIndex
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectPath(pathItem);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Folder className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{pathItem.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {pathItem.path}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={createNewProject}
                disabled={!newProjectPath.trim() || creatingProject}
                className="flex-1 h-8 text-xs hover:bg-primary/90 transition-colors"
              >
                {creatingProject ? 'Creating...' : 'Create Project'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelNewProject}
                disabled={creatingProject}
                className="h-8 text-xs hover:bg-accent transition-colors"
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Mobile Form - Simple Overlay */}
          <div className="md:hidden fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end justify-center px-4 pb-24">
            <div className="w-full max-w-sm bg-card rounded-t-lg border-t border-border p-4 space-y-4 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                    <FolderPlus className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">New Project</h2>
                  </div>
                </div>
                <button
                  onClick={cancelNewProject}
                  disabled={creatingProject}
                  className="w-6 h-6 rounded-md bg-muted flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Input
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    placeholder="/path/to/project or relative/path"
                    className="text-sm h-10 rounded-md focus:border-primary transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      // Handle path dropdown navigation (same as desktop)
                      if (showPathDropdown && filteredPaths.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedPathIndex(prev =>
                            prev < filteredPaths.length - 1 ? prev + 1 : 0
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedPathIndex(prev =>
                            prev > 0 ? prev - 1 : filteredPaths.length - 1
                          );
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (selectedPathIndex >= 0) {
                            selectPath(filteredPaths[selectedPathIndex]);
                          } else if (filteredPaths.length > 0) {
                            selectPath(filteredPaths[0]);
                          } else {
                            createNewProject();
                          }
                          return;
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowPathDropdown(false);
                          return;
                        }
                      }

                      // Regular input handling
                      if (e.key === 'Enter') {
                        createNewProject();
                      }
                      if (e.key === 'Escape') {
                        cancelNewProject();
                      }
                    }}
                    style={{
                      fontSize: '16px', // Prevents zoom on iOS
                      WebkitAppearance: 'none'
                    }}
                  />

                  {/* Mobile Path dropdown */}
                  {showPathDropdown && filteredPaths.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredPaths.map((pathItem, index) => (
                        <div
                          key={pathItem.path}
                          className={`px-3 py-2.5 cursor-pointer border-b border-border last:border-b-0 active:scale-95 transition-all ${
                            index === selectedPathIndex
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent/50'
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            selectPath(pathItem);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <div>
                              <div className="font-medium text-sm">{pathItem.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {pathItem.path}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={cancelNewProject}
                    disabled={creatingProject}
                    variant="outline"
                    className="flex-1 h-9 text-sm rounded-md active:scale-95 transition-transform"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createNewProject}
                    disabled={!newProjectPath.trim() || creatingProject}
                    className="flex-1 h-9 text-sm rounded-md bg-primary hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    {creatingProject ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>

              {/* Safe area for mobile */}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Project Dropdown */}
      {projects.length > 0 && !isLoading && (
        <div className="px-3 md:px-4 py-2 border-b border-border">
          <div className="relative" data-project-dropdown>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Select or search projects..."
              value={projectDropdownFilter}
              onChange={(e) => {
                setProjectDropdownFilter(e.target.value);
                setShowProjectDropdown(true);
              }}
              onFocus={() => setShowProjectDropdown(true)}
              onKeyDown={handleProjectDropdownKeydown}
              onClick={() => setShowProjectDropdown(true)}
              className="pl-9 h-9 text-sm bg-muted/50 border-0 focus:bg-background focus:ring-1 focus:ring-primary/20"
            />
            {projectDropdownFilter && (
              <button
                onClick={() => {
                  setProjectDropdownFilter('');
                  setSelectedProjectIndex(-1);
                }}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={() => {
                setShowProjectDropdown(!showProjectDropdown);
                setSelectedProjectIndex(-1);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent rounded"
            >
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Project Dropdown */}
            {showProjectDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
                {filteredProjectsForDropdown.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No projects found
                  </div>
                ) : (
                  filteredProjectsForDropdown.map((project, index) => {
                    const isSelected = selectedProject?.name === project.name;
                    const isStarred = isProjectStarred(project.name);
                    const sessionCount = getAllSessions(project).length;
                    const hasMore = project.sessionMeta?.hasMore !== false;
                    const count = hasMore && sessionCount >= 5 ? `${sessionCount}+` : sessionCount;

                    return (
                      <div
                        key={project.name}
                        className={`px-3 py-2 cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                          index === selectedProjectIndex
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50'
                        } ${isSelected ? 'bg-primary/5 border-primary/20' : ''} ${
                          isStarred && !isSelected ? 'bg-yellow-50/50 dark:bg-yellow-900/5 border-yellow-200/30 dark:border-yellow-800/30' : ''
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleProjectSelectFromDropdown(project);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Folder className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate text-foreground">
                                {project.displayName}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono truncate">
                                {project.fullPath}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isStarred && (
                              <Star className="w-3 h-3 text-yellow-600 dark:text-yellow-400 fill-current" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {count} session{count === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects List */}
      <ScrollArea className="flex-1 md:px-2 md:py-3 overflow-y-auto overscroll-contain">
        <div className="md:space-y-1 pb-safe-area-inset-bottom">
          {isLoading ? (
            <div className="text-center py-12 md:py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-3">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2 md:mb-1">Loading projects...</h3>
              <p className="text-sm text-muted-foreground">
                Fetching your Claude projects and sessions
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 md:py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-3">
                <Folder className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2 md:mb-1">No projects found</h3>
              <p className="text-sm text-muted-foreground">
                Run Claude CLI in a project directory to get started
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 md:py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-3">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2 md:mb-1">No matching projects</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search term
              </p>
            </div>
          ) : selectedProject ? (
            /* Show only selected project's sessions */
            (() => {
              const project = selectedProject;
              const isStarred = isProjectStarred(project.name);
              const allSessions = getAllSessions(project);

              return (
                <div key={project.name} className="md:space-y-1">
                  {/* Selected Project Header */}
                  <div className="group md:group">
                    {/* Mobile Project Header */}
                    <div className="md:hidden p-3 mx-3 my-1 rounded-lg bg-card border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">
                            {project.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project.fullPath !== project.displayName && (
                              <span title={project.fullPath}>
                                {project.fullPath.length > 25 ? `...${project.fullPath.slice(-22)}` : project.fullPath}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isStarred && (
                            <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400 fill-current" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {allSessions.length} session{allSessions.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Project Header */}
                    <div className="hidden md:flex items-center gap-3 p-3 mb-2 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {project.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {project.fullPath !== project.displayName && (
                            <span title={project.fullPath}>
                              {project.fullPath.length > 25 ? `...${project.fullPath.slice(-22)}` : project.fullPath}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isStarred && (
                          <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400 fill-current" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {allSessions.length} session{allSessions.length === 1 ? '' : 's'}
                        </span>
                        <button
                          className="w-6 h-6 rounded-md bg-muted/30 flex items-center justify-center hover:bg-accent transition-colors"
                          onClick={() => {
                            setProjectDropdownFilter('');
                            setShowProjectDropdown(true);
                          }}
                          title="Change project"
                        >
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sessions List */}
                  <div className="ml-3 space-y-1 border-l border-border pl-3">
                    {!initialSessionsLoaded.has(project.name) ? (
                      // Loading skeleton for sessions
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-2 rounded-md">
                          <div className="flex items-start gap-2">
                            <div className="w-3 h-3 bg-muted rounded-full animate-pulse mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${60 + i * 15}%` }} />
                              <div className="h-2 bg-muted rounded animate-pulse w-1/2" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : allSessions.length === 0 && !loadingSessions[project.name] ? (
                      <div className="py-2 px-3 text-left">
                        <p className="text-xs text-muted-foreground">No sessions yet</p>
                      </div>
                    ) : (
                      allSessions.map((session) => {
                        // Handle both Claude and Cursor session formats
                        const isCursorSession = session.__provider === 'cursor';

                        // Calculate if session is active (within last 10 minutes)
                        const sessionDate = new Date(isCursorSession ? session.createdAt : session.lastActivity);
                        const diffInMinutes = Math.floor((currentTime - sessionDate) / (1000 * 60));
                        const isActive = diffInMinutes < 10;

                        // Get session display values
                        const sessionName = isCursorSession ? (session.name || 'Untitled Session') : (session.summary || 'New Session');
                        const sessionTime = isCursorSession ? session.createdAt : session.lastActivity;
                        const messageCount = session.messageCount || 0;

                        return (
                          <div key={session.id} className="group relative">
                            {/* Active session indicator dot */}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              </div>
                            )}
                            {/* Mobile Session Item */}
                            <div className="md:hidden">
                              <div
                                className={cn(
                                  'p-2 mx-3 my-0.5 rounded-md bg-card border active:scale-[0.98] transition-all duration-150 relative',
                                  selectedSession?.id === session.id ? 'bg-primary/5 border-primary/20' :
                                    isActive ? 'border-green-500/30 bg-green-50/5 dark:bg-green-900/5' : 'border-border/30'
                                )}
                                onClick={() => {
                                  onSessionSelect(session);
                                }}
                                onTouchEnd={handleTouchClick(() => {
                                  onSessionSelect(session);
                                })}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
                                    selectedSession?.id === session.id ? 'bg-primary/10' : 'bg-muted/50'
                                  )}>
                                    {isCursorSession ? (
                                      <CursorLogo className="w-3 h-3" />
                                    ) : (
                                      <ClaudeLogo className="w-3 h-3" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium truncate text-foreground">
                                      {sessionName}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {formatTimeAgo(sessionTime, currentTime)}
                                      </span>
                                      {messageCount > 0 && (
                                        <Badge variant="secondary" className="text-xs px-1 py-0 ml-auto">
                                          {messageCount}
                                        </Badge>
                                      )}
                                      {/* Provider tiny icon */}
                                      <span className="ml-1 opacity-70">
                                        {isCursorSession ? (
                                          <CursorLogo className="w-3 h-3" />
                                        ) : (
                                          <ClaudeLogo className="w-3 h-3" />
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Mobile delete button - only for Claude sessions */}
                                  {!isCursorSession && (
                                    <button
                                      className="w-5 h-5 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center active:scale-95 transition-transform opacity-70 ml-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSession(project.name, session.id);
                                      }}
                                      onTouchEnd={handleTouchClick(() => deleteSession(project.name, session.id))}
                                    >
                                      <Trash2 className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Desktop Session Item */}
                            <div className="hidden md:block">
                              <Button
                                variant="ghost"
                                className={cn(
                                  'w-full justify-start p-2 h-auto font-normal text-left hover:bg-accent/50 transition-colors duration-200',
                                  selectedSession?.id === session.id && 'bg-accent text-accent-foreground'
                                )}
                                onClick={() => onSessionSelect(session)}
                                onTouchEnd={handleTouchClick(() => onSessionSelect(session))}
                              >
                                <div className="flex items-start gap-2 min-w-0 w-full">
                                  {isCursorSession ? (
                                    <CursorLogo className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <ClaudeLogo className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium truncate text-foreground">
                                      {sessionName}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {formatTimeAgo(sessionTime, currentTime)}
                                      </span>
                                      {messageCount > 0 && (
                                        <Badge variant="secondary" className="text-xs px-1 py-0 ml-auto">
                                          {messageCount}
                                        </Badge>
                                      )}
                                      {/* Provider tiny icon */}
                                      <span className="ml-1 opacity-70">
                                        {isCursorSession ? (
                                          <CursorLogo className="w-3 h-3" />
                                        ) : (
                                          <ClaudeLogo className="w-3 h-3" />
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </Button>
                              {/* Desktop hover buttons - only for Claude sessions */}
                              {!isCursorSession && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  {editingSession === session.id ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingSessionName}
                                        onChange={(e) => setEditingSessionName(e.target.value)}
                                        onKeyDown={(e) => {
                                          e.stopPropagation();
                                          if (e.key === 'Enter') {
                                            updateSessionSummary(project.name, session.id, editingSessionName);
                                          } else if (e.key === 'Escape') {
                                            setEditingSession(null);
                                            setEditingSessionName('');
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-32 px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                        autoFocus
                                      />
                                      <button
                                        className="w-6 h-6 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded flex items-center justify-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateSessionSummary(project.name, session.id, editingSessionName);
                                        }}
                                        title="Save"
                                      >
                                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                      </button>
                                      <button
                                        className="w-6 h-6 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-900/40 rounded flex items-center justify-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSession(null);
                                          setEditingSessionName('');
                                        }}
                                        title="Cancel"
                                      >
                                        <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {/* Edit button */}
                                      <button
                                        className="w-6 h-6 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-900/40 rounded flex items-center justify-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSession(session.id);
                                          setEditingSessionName(session.summary || 'New Session');
                                        }}
                                        title="Manually edit session name"
                                      >
                                        <Edit2 className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                      </button>
                                      {/* Delete button */}
                                      <button
                                        className="w-6 h-6 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded flex items-center justify-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSession(project.name, session.id);
                                        }}
                                        title="Delete this session permanently"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Show More Sessions Button */}
                    {allSessions.length > 0 && project.sessionMeta?.hasMore !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center gap-2 mt-2 text-muted-foreground"
                        onClick={() => loadMoreSessions(project)}
                        disabled={loadingSessions[project.name]}
                      >
                        {loadingSessions[project.name] ? (
                          <>
                            <div className="w-3 h-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Show more sessions
                          </>
                        )}
                      </Button>
                    )}

                    {/* New Session Button */}
                    <div className="md:hidden px-3 pb-2">
                      <button
                        className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md flex items-center justify-center gap-2 font-medium text-xs active:scale-[0.98] transition-all duration-150"
                        onClick={() => {
                          onNewSession(project);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        New Session
                      </button>
                    </div>

                    <Button
                      variant="default"
                      size="sm"
                      className="hidden md:flex w-full justify-start gap-2 mt-1 h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
                      onClick={() => onNewSession(project)}
                    >
                      <Plus className="w-3 h-3" />
                      New Session
                    </Button>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Show empty state when no project is selected */
            <div className="text-center py-12 md:py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4 md:mb-3">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2 md:mb-1">Select a project</h3>
              <p className="text-sm text-muted-foreground">
                Choose a project from the dropdown above to view its sessions
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Version Update Notification */}
      {updateAvailable && (
        <div className="md:p-2 border-t border-border/50 flex-shrink-0">
          {/* Desktop Version Notification */}
          <div className="hidden md:block">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 p-3 h-auto font-normal text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 border border-blue-200 dark:border-blue-700 rounded-lg mb-2"
              onClick={onShowVersionModal}
            >
              <div className="relative">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Update Available</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Version {latestVersion} is ready</div>
              </div>
            </Button>
          </div>

          {/* Mobile Version Notification */}
          <div className="md:hidden p-3 pb-2">
            <button
              className="w-full h-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl flex items-center justify-start gap-3 px-4 active:scale-[0.98] transition-all duration-150"
              onClick={onShowVersionModal}
            >
              <div className="relative">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Update Available</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Version {latestVersion} is ready</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* User Menu Section */}
      <div className="md:p-2 md:border-t md:border-border flex-shrink-0">
        <UserMenu onShowSettings={onShowSettings} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default Sidebar;
