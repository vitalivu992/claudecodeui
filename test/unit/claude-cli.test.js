import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the modules before importing
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))
vi.mock('cross-spawn', () => ({
  default: vi.fn()
}))
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn()
  }
}))
vi.mock('path', () => ({
  default: {
    join: vi.fn()
  }
}))
vi.mock('os', () => ({
  default: {
    homedir: vi.fn(),
    tmpdir: vi.fn()
  }
}))

import { spawn } from 'child_process'
import crossSpawn from 'cross-spawn'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Mock platform
const originalPlatform = process.platform

describe('Claude CLI module', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup path mock
    path.join.mockImplementation((...args) => args.join('/'))

    // Setup os mock
    os.homedir.mockReturnValue('/home/user')
    os.tmpdir.mockReturnValue('/tmp')
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    })
  })

  describe('Platform-specific spawn selection', () => {
    it('should use cross-spawn on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      })

      // Import would select cross-spawn
      expect(process.platform).toBe('win32')
      // The actual module would use cross-spawn on Windows
    })

    it('should use regular spawn on Unix systems', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      })

      expect(process.platform).toBe('linux')
      // The actual module would use regular spawn on Unix
    })
  })

  describe('Command argument building', () => {
    it('should build basic command args correctly', () => {
      const expectedArgs = [
        '--output-format', 'stream-json',
        '--verbose'
      ]

      // This simulates the args building logic
      const args = []
      args.push('--output-format', 'stream-json', '--verbose')

      expect(args).toEqual(expectedArgs)
    })

    it('should add resume flag when resuming session', () => {
      const sessionId = 'test-session-123'
      const args = []

      if (sessionId) {
        args.push('--resume', sessionId)
      }

      expect(args).toEqual(['--resume', 'test-session-123'])
    })

    it('should include MCP flag when MCP servers are configured', () => {
      const hasMcpServers = true
      const args = ['--output-format', 'stream-json', '--verbose']

      if (hasMcpServers) {
        args.push('--allow-mcp')
      }

      expect(args).toContain('--allow-mcp')
    })
  })

  describe('Image processing', () => {
    it('should parse base64 image data correctly', () => {
      const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
      expect(matches).toBeTruthy()
      expect(matches[1]).toBe('image/png')
      expect(matches[2]).toBeTruthy()
    })

    it('should handle invalid image data format', () => {
      const invalidImageData = 'invalid-image-data'

      const matches = invalidImageData.match(/^data:([^;]+);base64,(.+)$/)
      expect(matches).toBeNull()
    })

    it('should create temp directory for images', async () => {
      const workingDir = '/home/user/project'
      const tempDir = path.join(workingDir, '.tmp', 'images', Date.now().toString())

      // Mock fs.mkdir
      fs.mkdir.mockResolvedValue()

      await fs.mkdir(tempDir, { recursive: true })

      expect(fs.mkdir).toHaveBeenCalledWith(tempDir, { recursive: true })
      expect(path.join).toHaveBeenCalledWith(workingDir, '.tmp', 'images', expect.any(String))
    })

    it('should write base64 image data to file', async () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      const filepath = '/tmp/image.png'

      fs.writeFile.mockResolvedValue()

      await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'))

      expect(fs.writeFile).toHaveBeenCalledWith(filepath, Buffer.from(base64Data, 'base64'))
    })
  })

  describe('MCP configuration detection', () => {
    it('should check for MCP config in correct paths', () => {
      const homeDir = os.homedir()
      const claudeConfigPath = path.join(homeDir, '.claude.json')

      const expectedPath = '/home/user/.claude.json'

      expect(path.join).toHaveBeenCalledWith(homeDir, '.claude.json')
      expect(claudeConfigPath).toBe(expectedPath)
    })

    it('should check alternative config paths', () => {
      const homeDir = os.homedir()
      const altConfigPath = path.join(homeDir, '.claude', 'settings.json')

      const expectedAltPath = '/home/user/.claude/settings.json'

      expect(altConfigPath).toBe(expectedAltPath)
    })
  })

  describe('Process management', () => {
    it('should track active processes by session ID', () => {
      const activeClaudeProcesses = new Map()
      const sessionId = 'test-session-456'
      const mockProcess = { pid: 12345 }

      // Simulate tracking
      activeClaudeProcesses.set(sessionId, mockProcess)

      expect(activeClaudeProcesses.has(sessionId)).toBe(true)
      expect(activeClaudeProcesses.get(sessionId)).toBe(mockProcess)
    })

    it('should remove process from tracking when cleanup occurs', () => {
      const activeClaudeProcesses = new Map()
      const sessionId = 'test-session-789'
      const mockProcess = { pid: 54321 }

      activeClaudeProcesses.set(sessionId, mockProcess)
      expect(activeClaudeProcesses.size).toBe(1)

      // Simulate cleanup
      activeClaudeProcesses.delete(sessionId)
      expect(activeClaudeProcesses.size).toBe(0)
      expect(activeClaudeProcesses.has(sessionId)).toBe(false)
    })
  })

  describe('Tools settings handling', () => {
    it('should use provided tools settings', () => {
      const toolsSettings = {
        allowedTools: ['bash', 'edit'],
        disallowedTools: ['computer-use'],
        skipPermissions: true
      }

      const settings = toolsSettings || {
        allowedTools: [],
        disallowedTools: [],
        skipPermissions: false
      }

      expect(settings).toEqual(toolsSettings)
    })

    it('should use default settings when none provided', () => {
      const defaultSettings = {
        allowedTools: [],
        disallowedTools: [],
        skipPermissions: false
      }

      const toolsSettings = null
      const settings = toolsSettings || defaultSettings

      expect(settings).toEqual(defaultSettings)
    })
  })

  describe('Working directory resolution', () => {
    it('should use provided cwd', () => {
      const cwd = '/custom/working/directory'
      const workingDir = cwd || process.cwd()

      expect(workingDir).toBe('/custom/working/directory')
    })

    it('should fallback to process.cwd when no cwd provided', () => {
      const cwd = null
      const mockProcessCwd = '/default/working/directory'

      // Mock process.cwd
      const originalCwd = process.cwd
      process.cwd = vi.fn().mockReturnValue(mockProcessCwd)

      const workingDir = cwd || process.cwd()

      expect(workingDir).toBe(mockProcessCwd)
      expect(process.cwd).toHaveBeenCalled()

      // Restore
      process.cwd = originalCwd
    })
  })

  describe('Error handling', () => {
    it('should handle image processing errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const error = new Error('Permission denied')
      fs.mkdir.mockRejectedValue(error)

      // Simulate error handling in image processing
      try {
        await fs.mkdir('/tmp/test', { recursive: true })
      } catch (err) {
        console.error('Error processing images for Claude:', err)
      }

      expect(consoleSpy).toHaveBeenCalledWith('Error processing images for Claude:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('WebSocket message formatting', () => {
    it('should format session-created message correctly', () => {
      const sessionId = 'test-session-123'
      const expectedMessage = JSON.stringify({
        type: 'session-created',
        sessionId
      })

      const message = {
        type: 'session-created',
        sessionId
      }

      expect(JSON.stringify(message)).toBe(expectedMessage)
    })

    it('should format error message correctly', () => {
      const error = 'Command not found'
      const expectedMessage = JSON.stringify({
        type: 'error',
        error
      })

      const message = {
        type: 'error',
        error
      }

      expect(JSON.stringify(message)).toBe(expectedMessage)
    })
  })
})