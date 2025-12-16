# Testing Documentation

This directory contains the unit tests for the Claude Code UI project.

## Test Structure

```
test/
├── setup.js              # Global test setup and mocks
├── unit/                  # Unit tests
│   ├── utils.test.js      # Utility function tests
│   ├── api.test.js        # API utility tests
│   ├── mcp-detector.test.js # MCP detection tests
│   ├── useAudioRecorder.test.js # Audio recorder hook tests
│   ├── DarkModeToggle.test.jsx # React component tests
│   ├── projects.test.js   # Project management tests
│   └── claude-cli.test.js # CLI integration tests
└── integration/           # Integration tests (to be added)
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test
```

### Run tests once and exit
```bash
npm run test:run
```

### Run tests with UI
```bash
npm run test:ui
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Framework

This project uses **Vitest** as the testing framework with:
- **React Testing Library** for component testing
- **jsdom** for DOM simulation
- **@testing-library/jest-dom** for additional matchers

## Writing Tests

### Component Tests
Use `render` from React Testing Library:
```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

test('should render correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### Hook Tests
Use `renderHook` from React Testing Library:
```jsx
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

test('should update state', () => {
  const { result } = renderHook(() => useMyHook())
  act(() => {
    result.current.update()
  })
  expect(result.current.value).toBe('updated')
})
```

### API Tests
Mock fetch and localStorage:
```jsx
import { vi, beforeEach } from 'vitest'

beforeEach(() => {
  global.fetch = vi.fn()
  global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn()
  }
})
```

## Coverage

The test coverage report includes:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

Coverage reports are generated in:
- Text output in terminal
- HTML report in `coverage/index.html`
- JSON report for CI integration

## Current Test Coverage

As of now, we have tests covering:
- ✅ Utility functions (cn, MCP detector)
- ✅ API utilities (authenticatedFetch, API endpoints)
- ✅ React hooks (useAudioRecorder)
- ✅ React components (DarkModeToggle)
- ✅ Project management utilities
- ✅ CLI integration modules

### Test Status
- **Total Tests**: 83
- **Passing**: 46
- **Failed**: 37 (mostly due to mocking issues that need refinement)

## TODO

1. Fix failing tests by improving mocks
2. Add integration tests for WebSocket communication
3. Add E2E tests with Playwright or Cypress
4. Increase test coverage to >80%
5. Add visual regression tests
6. Add performance tests