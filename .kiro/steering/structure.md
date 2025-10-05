# Project Structure

## Root Directory
```
├── src/                    # Frontend React application
├── server/                 # Backend Node.js/Express server
├── public/                 # Static assets and PWA files
├── dist/                   # Production build output
├── .kiro/                  # Kiro IDE configuration
└── scripts/                # Build and deployment scripts
```

## Frontend Structure (`src/`)
```
src/
├── components/             # React components
│   ├── ui/                # Reusable UI components (shadcn/ui style)
│   ├── ChatInterface.jsx  # Main chat component
│   ├── FileTree.jsx       # File browser component
│   ├── Sidebar.jsx        # Project/session navigation
│   └── MainContent.jsx    # Main application layout
├── contexts/              # React context providers
│   ├── AuthContext.jsx    # Authentication state
│   ├── ThemeContext.jsx   # Theme management
│   └── WebSocketContext.jsx # WebSocket connection
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions and API clients
├── lib/                   # Shared libraries
└── main.jsx              # Application entry point
```

## Backend Structure (`server/`)
```
server/
├── routes/                # Express route handlers
├── middleware/            # Authentication and validation
├── services/              # Business logic (PAM auth, etc.)
├── database/              # SQLite database setup and queries
├── utils/                 # Server utilities (MCP detection, etc.)
├── claude-cli.js          # Claude CLI integration
├── cursor-cli.js          # Cursor CLI integration
├── projects.js            # Project management logic
└── index.js              # Main server entry point
```

## Key Architectural Patterns

### Component Organization
- **UI Components**: Reusable components in `src/components/ui/`
- **Feature Components**: Specific functionality components in `src/components/`
- **Layout Components**: Main layout and navigation components

### State Management
- **Context Providers**: Used for global state (auth, theme, WebSocket)
- **Local State**: Component-level state with React hooks
- **Session Protection**: Centralized in App.jsx to prevent UI conflicts

### API Structure
- **REST Endpoints**: `/api/*` for CRUD operations
- **WebSocket Endpoints**: `/ws` for chat, `/shell` for terminal
- **Authentication**: JWT-based with middleware protection

### File Naming Conventions
- **Components**: PascalCase with `.jsx` extension
- **Utilities**: camelCase with `.js` extension
- **Contexts**: PascalCase with `Context.jsx` suffix
- **Hooks**: camelCase with `use` prefix

### Import Patterns
- **Relative imports** for local components and utilities
- **Absolute imports** from `node_modules`
- **Barrel exports** not commonly used - direct imports preferred