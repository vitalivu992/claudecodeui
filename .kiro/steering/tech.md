# Technology Stack

## Frontend
- **React 18** - Modern component architecture with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **React Router** - Client-side routing
- **CodeMirror** - Advanced code editor with syntax highlighting
- **WebSocket** - Real-time communication with backend

## Backend
- **Node.js** - Runtime environment
- **Express** - Web framework for REST API
- **WebSocket Server** - Real-time bidirectional communication
- **SQLite** - Database for authentication and session storage
- **node-pty** - Terminal emulation for shell integration
- **chokidar** - File system watching for project updates

## Key Libraries
- **@uiw/react-codemirror** - React wrapper for CodeMirror
- **react-markdown** - Markdown rendering
- **react-dropzone** - File upload handling
- **lucide-react** - Icon library
- **class-variance-authority** - Component variant management
- **xterm** - Terminal emulator

## Build & Development

### Common Commands
```bash
# Development (runs both frontend and backend)
npm run dev

# Frontend only (Vite dev server)
npm run client

# Backend only (Express server)
npm run server

# Production build
npm run build

# Start production server
npm start

# Release management
npm run release
```

### Environment Configuration
- Uses `.env` file for configuration
- Default ports: Backend (3001), Frontend (5173)
- Supports custom Claude CLI path configuration

### Architecture
- **Monorepo structure** with frontend (`src/`) and backend (`server/`)
- **WebSocket-based communication** for real-time updates
- **Session protection system** prevents UI updates during active conversations
- **File system integration** with project directory watching