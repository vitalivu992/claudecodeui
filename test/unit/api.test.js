import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { authenticatedFetch, api } from '@/utils/api.js'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock fetch
const fetchMock = vi.fn()

describe('API utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.localStorage = localStorageMock
    global.fetch = fetchMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authenticatedFetch', () => {
    it('should include auth token when available', () => {
      localStorageMock.getItem.mockReturnValue('test-token-123')

      authenticatedFetch('/api/test', { method: 'GET' })

      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-123'
        }
      })
    })

    it('should not include auth header when no token', () => {
      localStorageMock.getItem.mockReturnValue(null)

      authenticatedFetch('/api/test', { method: 'GET' })

      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should merge custom headers with default headers', () => {
      localStorageMock.getItem.mockReturnValue('test-token')

      authenticatedFetch('/api/test', {
        method: 'POST',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'text/plain'
        }
      })

      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // Should override default
          'Authorization': 'Bearer test-token',
          'X-Custom-Header': 'custom-value'
        }
      })
    })

    it('should handle options without headers', () => {
      localStorageMock.getItem.mockReturnValue('token')

      authenticatedFetch('/api/test', { method: 'DELETE' })

      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        }
      })
    })
  })

  describe('api.auth endpoints', () => {
    it('auth.status should call fetch without authentication', () => {
      api.auth.status()

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/status')
      expect(localStorageMock.getItem).not.toHaveBeenCalled()
    })

    it('auth.pamLogin should send POST request with credentials', () => {
      fetchMock.mockResolvedValue({ ok: true })

      api.auth.pamLogin('testuser', 'testpass')

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/pam-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'testpass' })
      })
    })

    it('auth.pamStatus should call fetch without authentication', () => {
      api.auth.pamStatus()

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/pam-status')
    })

    it('auth.user should use authenticatedFetch', () => {
      localStorageMock.getItem.mockReturnValue('user-token')

      api.auth.user()

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/user', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user-token'
        }
      })
    })

    it('auth.logout should use authenticatedFetch with POST method', () => {
      localStorageMock.getItem.mockReturnValue('logout-token')

      api.auth.logout()

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer logout-token'
        }
      })
    })
  })

  describe('api.projects endpoints', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('project-token')
    })

    it('projects should fetch all projects', () => {
      api.projects()

      expect(fetchMock).toHaveBeenCalledWith('/api/projects', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        }
      })
    })

    it('sessions should fetch sessions with pagination', () => {
      api.sessions('test-project', 10, 20)

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/test-project/sessions?limit=10&offset=20', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        }
      })
    })

    it('sessionMessages should build URL correctly with parameters', () => {
      api.sessionMessages('test-project', 'session-123', 50, 10)

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/test-project/sessions/session-123/messages?limit=50&offset=10', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        }
      })
    })

    it('sessionMessages should handle null limit', () => {
      api.sessionMessages('test-project', 'session-123', null, 0)

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/test-project/sessions/session-123/messages', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        }
      })
    })

    it('renameProject should send PUT request with display name', () => {
      api.renameProject('old-project', 'New Display Name')

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/old-project/rename', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        },
        body: JSON.stringify({ displayName: 'New Display Name' })
      })
    })

    it('deleteSession should send DELETE request', () => {
      api.deleteSession('test-project', 'session-to-delete')

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/test-project/sessions/session-to-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        }
      })
    })

    it('deleteProject should send DELETE request', () => {
      api.deleteProject('project-to-delete')

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-to-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        }
      })
    })

    it('createProject should send POST request with path', () => {
      api.createProject('/path/to/new/project')

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer project-token'
        },
        body: JSON.stringify({ path: '/path/to/new/project' })
      })
    })
  })

  describe('api.file operations', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('file-token')
    })

    it('readFile should encode file path in query parameter', () => {
      api.readFile('test-project', 'src/components/Test.jsx')

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/test-project/file?filePath=src%2Fcomponents%2FTest.jsx', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer file-token'
        }
      })
    })

    it('saveFile should send PUT request with file content', () => {
      const content = 'const test = true;'
      api.saveFile('test-project', 'src/test.js', content)

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/test-project/file', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer file-token'
        },
        body: JSON.stringify({ filePath: 'src/test.js', content })
      })
    })

    it('getFiles should fetch files for project', () => {
      api.getFiles('test-project')

      expect(fetchMock).toHaveBeenCalledWith('/api/projects/test-project/files', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer file-token'
        }
      })
    })
  })

  describe('api.transcribe', () => {
    it('should send FormData without overriding Content-Type', () => {
      localStorageMock.getItem.mockReturnValue('transcribe-token')

      const formData = new FormData()
      formData.append('audio', new Blob(['audio data']), 'test.webm')

      api.transcribe(formData)

      expect(fetchMock).toHaveBeenCalledWith('/api/transcribe', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer transcribe-token'
        }
      })
    })
  })

  describe('api.browseFilesystem', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('browse-token')
    })

    it('should browse without path parameter', () => {
      api.browseFilesystem()

      expect(fetchMock).toHaveBeenCalledWith('/api/browse-filesystem?', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer browse-token'
        }
      })
    })

    it('should browse with path parameter', () => {
      api.browseFilesystem('/home/user/projects')

      expect(fetchMock).toHaveBeenCalledWith('/api/browse-filesystem?path=%2Fhome%2Fuser%2Fprojects', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer browse-token'
        }
      })
    })
  })

  describe('api.get generic method', () => {
    it('should call authenticatedFetch with endpoint', () => {
      localStorageMock.getItem.mockReturnValue('generic-token')

      api.get('/custom/endpoint')

      expect(fetchMock).toHaveBeenCalledWith('/api/custom/endpoint', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer generic-token'
        }
      })
    })
  })
})