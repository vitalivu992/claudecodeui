# Linux PAM Authentication Implementation Guide

This document provides a comprehensive analysis of how Linux PAM (Pluggable Authentication Modules) authentication is implemented in the Claude Code UI application. This approach can be adapted for other web applications that need to authenticate users against their Linux system credentials.

## Overview

The Claude Code UI implements a robust authentication system that allows users to log in using their existing Linux system credentials through PAM. This eliminates the need for separate user management and provides seamless integration with the underlying operating system.

## Architecture

### Authentication Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │   Backend API    │    │   PAM Service   │    │   Linux System   │
│  (LoginForm)    │◄──►│   (/api/auth)    │◄──►│  (pamAuth.js)   │◄──►│     (su)         │
│                 │    │                  │    │                 │    │                  │
│ React Component │    │ Express.js       │    │ Node.js         │    │ PAM Libraries    │
│ AuthContext     │    │ JWT Tokens       │    │ Child Process   │    │ System Accounts  │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
```

### Key Components

1. **Frontend**: React-based authentication UI and context management
2. **Backend API**: Express.js routes handling authentication requests
3. **PAM Service**: Node.js service interfacing with Linux PAM
4. **Database**: SQLite for storing user session metadata
5. **JWT System**: Token-based session management

## Implementation Details

### 1. PAM Authentication Service (`server/services/pamAuth.js`)

The core PAM authentication logic is encapsulated in a dedicated service class:

```javascript
class PAMAuthService {
  constructor() {
    this.serviceName = 'login'; // Default PAM service
  }

  async authenticate(username, password) {
    try {
      const result = await this.authenticateWithSu(username, password);
      return result;
    } catch (error) {
      console.error('PAM authentication error:', error);
      return false;
    }
  }

  async authenticateWithSu(username, password) {
    return new Promise((resolve) => {
      const child = spawn('su', [username, '-c', 'exit'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Send password to stdin and check exit code
      child.stdin.write(password + '\n');
      child.stdin.end();

      child.on('close', (code) => {
        resolve(code === 0);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          resolve(false);
        }
      }, 5000);
    });
  }
}
```

**Key Points:**
- Uses the `su` command to authenticate against PAM
- Sends password via stdin (secure approach)
- Checks exit code to determine authentication success
- Implements timeout to prevent hanging
- No passwords are logged or stored

### 2. Backend API Routes (`server/routes/auth.js`)

#### Authentication Endpoints

```javascript
// PAM authentication endpoint
router.post('/pam-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check PAM availability
    const pamAvailable = await pamAuth.isAvailable();
    if (!pamAvailable) {
      return res.status(501).json({ error: 'PAM authentication is not available' });
    }

    // Authenticate using PAM
    const isAuthenticated = await pamAuth.authenticate(username, password);
    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Get user info from system
    const userInfo = await pamAuth.getUserInfo(username);

    // Create or update user in database
    let user = userDb.getUserByUsername(username);
    if (!user) {
      user = userDb.createUser(username);
    }

    // Generate JWT token
    const token = generateToken(user);
    userDb.updateLastLogin(user.id);

    res.json({
      success: true,
      user: { id: user.id, username: user.username, userInfo },
      token
    });

  } catch (error) {
    console.error('PAM login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### Status Check Endpoint

```javascript
router.get('/status', async (req, res) => {
  try {
    const pamAvailable = await pamAuth.isAvailable();
    res.json({
      needsSetup: false,
      pamAvailable,
      isAuthenticated: false
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3. JWT Token Management (`server/middleware/auth.js`)

```javascript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

// Generate JWT token (never expires)
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET
    // No expiration - token lasts forever
  );
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = userDb.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Get user info from system
    const userInfo = await pamAuth.getUserInfo(user.username);
    req.user = { ...user, userInfo };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

### 4. Database Schema (`server/database/init.sql`)

```sql
-- Users table (single PAM user system)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
```

### 5. Frontend Authentication Flow

#### AuthContext (`src/contexts/AuthContext.jsx`)

```javascript
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth-token'));
  const [pamAvailable, setPamAvailable] = useState(false);

  const pamLogin = async (username, password) => {
    try {
      const response = await api.auth.pamLogin(username, password);
      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('auth-token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    // Verify token exists and is valid
    // Get user info and set auth state
  };
};
```

#### LoginForm Component (`src/components/LoginForm.jsx`)

```javascript
const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { pamLogin, pamAvailable } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pamAvailable) {
      setError('PAM authentication is not available on this system');
      return;
    }

    setIsLoading(true);
    const result = await pamLogin(username, password);

    if (!result.success) {
      setError(result.error);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
};
```

#### ProtectedRoute Component (`src/components/ProtectedRoute.jsx`)

```javascript
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return children;
};
```

## Security Considerations

### 1. Password Handling
- **Never store passwords** in the application or database
- Passwords are only used temporarily for PAM authentication
- Passwords are sent via stdin to child processes, not command line arguments
- All password transmission happens over HTTPS in production

### 2. Token Security
- JWT tokens are used for session management
- Tokens are stored in localStorage (consider httpOnly cookies for higher security)
- Server-side token verification on every protected request
- Tokens contain minimal user information (id, username)

### 3. PAM Integration
- Uses system's `su` command which leverages PAM under the hood
- No direct PAM library dependencies in Node.js
- Inherits all security features of the underlying PAM configuration
- Respects system password policies, account lockouts, etc.

### 4. System Requirements
- Application must run with sufficient privileges to authenticate users
- PAM must be properly configured on the host system
- User running the application needs appropriate permissions

## Adaptation Guide for Other Applications

### 1. Backend Integration

**Install Dependencies:**
```bash
npm install express jsonwebtoken better-sqlite3
```

**Copy Core Files:**
- `server/services/pamAuth.js` - PAM authentication service
- `server/middleware/auth.js` - JWT middleware
- `server/routes/auth.js` - Authentication routes
- `server/database/db.js` - Database setup
- `server/database/init.sql` - Database schema

**Configure Server:**
```javascript
import express from 'express';
import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/auth.js';

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);

// Protect your routes
app.use('/api/protected', authenticateToken, yourProtectedRoutes);
```

### 2. Frontend Integration

**React Components:**
- `src/contexts/AuthContext.jsx` - Authentication state management
- `src/components/LoginForm.jsx` - Login form component
- `src/components/ProtectedRoute.jsx` - Route protection wrapper
- `src/utils/api.js` - API client with authentication

**App Structure:**
```jsx
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <YourProtectedComponent />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
```

### 3. Environment Configuration

**.env File:**
```
JWT_SECRET=your-secret-key-here
PORT=3001
NODE_ENV=production
```

### 4. Database Setup

The system uses SQLite for minimal setup, but you can adapt to any database:

**SQLite (Default):**
- Requires `better-sqlite3` package
- Database file: `server/database/auth.db`
- Auto-initialized on first run

**Other Databases:**
- Modify `server/database/db.js` to use your preferred database
- Update the schema accordingly
- Ensure the same user management functionality

## Advanced Configuration

### 1. Custom PAM Service

```javascript
// In pamAuth.js
const pamAuth = new PAMAuthService();
pamAuth.setServiceName('custom-service'); // Use custom PAM service
```

### 2. Token Expiration

```javascript
// In middleware/auth.js
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' } // Add expiration
  );
};
```

### 3. Enhanced User Information

```javascript
// In pamAuth.js
async getUserInfo(username) {
  const child = spawn('id', [username]);
  // Get user ID, group ID, and additional information
}
```

### 4. Multi-Factor Authentication

Extend the system to support additional authentication factors:

```javascript
// Add MFA check after PAM authentication
if (isAuthenticated) {
  const mfaRequired = await checkMFARequirement(username);
  if (mfaRequired) {
    // Prompt for second factor
  }
}
```

## Troubleshooting

### Common Issues

1. **PAM Authentication Fails**
   - Check if `su` command is available: `which su`
   - Verify system PAM configuration: `/etc/pam.d/su`
   - Ensure application has sufficient permissions

2. **Database Connection Issues**
   - Check SQLite file permissions
   - Verify database initialization
   - Ensure `better-sqlite3` is properly installed

3. **JWT Token Issues**
   - Verify JWT_SECRET is set consistently
   - Check token expiration settings
   - Ensure proper token transmission

4. **Frontend State Issues**
   - Clear browser localStorage if tokens are corrupted
   - Check network requests in browser dev tools
   - Verify API endpoint URLs

### Debug Mode

Enable debug logging:

```javascript
// In server/services/pamAuth.js
async authenticateWithSu(username, password) {
  return new Promise((resolve) => {
    const child = spawn('su', [username, '-c', 'exit'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Debug output
    child.stderr.on('data', (data) => {
      console.error('su stderr:', data.toString());
    });

    // ... rest of implementation
  });
}
```

## Conclusion

The PAM authentication implementation in Claude Code UI provides a secure, robust method for authenticating users against their Linux system credentials. The key advantages are:

1. **No Password Storage**: System handles credential verification
2. **Centralized Authentication**: Uses existing system user management
3. **Security Policies**: Inherits system security configurations
4. **Easy Integration**: Minimal setup required for new applications

By following this guide, you can adapt this authentication approach to other web applications that need Linux system integration while maintaining security best practices.