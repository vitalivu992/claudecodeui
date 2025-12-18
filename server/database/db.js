import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = path.join(__dirname, 'auth.db');
const INIT_SQL_PATH = path.join(__dirname, 'init.sql');

// Create database connection
const db = new Database(DB_PATH);
console.log('Connected to SQLite database');

// Initialize database with schema
const initializeDatabase = async () => {
  try {
    const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');
    db.exec(initSQL);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  }
};

// User database operations
const userDb = {
  // Check if any users exist
  hasUsers: () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return row.count > 0;
  },

  // Create a new user (PAM only)
  createUser: (username) => {
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?)');
    const result = stmt.run(username);
    return { id: result.lastInsertRowid, username };
  },

  // Get user by username
  getUserByUsername: (username) => {
    const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    return row;
  },

  // Update last login time
  updateLastLogin: (userId) => {
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
  },

  // Get user by ID
  getUserById: (userId) => {
    const row = db.prepare('SELECT id, username, created_at, last_login FROM users WHERE id = ? AND is_active = 1').get(userId);
    return row;
  }
};

export {
  db,
  initializeDatabase,
  userDb
};
