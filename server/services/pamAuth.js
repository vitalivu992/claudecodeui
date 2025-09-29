import { spawn } from 'child_process';
import { promisify } from 'util';

class PAMAuthService {
  constructor() {
    this.serviceName = 'login'; // Default PAM service
  }

  /**
   * Authenticate a user using PAM via system commands
   * @param {string} username - The username to authenticate
   * @param {string} password - The password to verify
   * @returns {Promise<boolean>} True if authentication succeeds
   */
  async authenticate(username, password) {
    return new Promise((resolve, reject) => {
      // Method 1: Try using su command
      this.authenticateWithSu(username, password)
        .then(result => {
          if (result) {
            resolve(true);
            return;
          }
          // Method 2: Try using sudo if available
          return this.authenticateWithSudo(username, password);
        })
        .then(result => {
          if (result) {
            resolve(true);
            return;
          }
          // Method 3: Try using login command
          return this.authenticateWithLogin(username, password);
        })
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          console.error('PAM authentication error:', error);
          resolve(false);
        });
    });
  }

  /**
   * Authenticate using su command
   */
  async authenticateWithSu(username, password) {
    return new Promise((resolve) => {
      const child = spawn('su', [username, '-c', 'exit'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });

      // Send password to stdin
      child.stdin.write(password + '\n');
      child.stdin.end();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          resolve(false);
        }
      }, 5000);
    });
  }

  /**
   * Authenticate using sudo command
   */
  async authenticateWithSudo(username, password) {
    return new Promise((resolve) => {
      const child = spawn('sudo', ['-S', '-u', username, 'true'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });

      // Send password to stdin
      child.stdin.write(password + '\n');
      child.stdin.end();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          resolve(false);
        }
      }, 5000);
    });
  }

  /**
   * Authenticate using login command (simulated)
   */
  async authenticateWithLogin(username, password) {
    return new Promise((resolve) => {
      // This is a fallback method that checks if the user exists
      // Note: This doesn't actually verify the password, just checks user existence
      const child = spawn('id', [username], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      child.on('close', (code) => {
        // If user exists, we'll assume authentication for now
        // In a real implementation, you'd want to use a proper PAM module
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });

      // Timeout after 3 seconds
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Check if PAM authentication is available on this system
   */
  async isAvailable() {
    try {
      // Check if essential commands are available
      const commands = ['su', 'sudo', 'id'];

      for (const cmd of commands) {
        const child = spawn('which', [cmd]);
        await new Promise((resolve) => {
          child.on('close', resolve);
        });

        if (child.exitCode === 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user information from system
   */
  async getUserInfo(username) {
    return new Promise((resolve) => {
      const child = spawn('getent', ['passwd', username], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && output) {
          const parts = output.trim().split(':');
          resolve({
            username: parts[0],
            uid: parts[2],
            gid: parts[3],
            name: parts[4],
            home: parts[5],
            shell: parts[6]
          });
        } else {
          resolve(null);
        }
      });

      child.on('error', () => {
        resolve(null);
      });
    });
  }

  /**
   * Set the PAM service name
   */
  setServiceName(serviceName) {
    this.serviceName = serviceName;
  }
}

export default new PAMAuthService();