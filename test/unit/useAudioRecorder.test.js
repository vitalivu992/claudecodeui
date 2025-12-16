import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn()
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia
  },
  writable: true
})

// Mock MediaRecorder
class MockMediaRecorder {
  constructor(stream, options) {
    this.stream = stream
    this.options = options
    this.state = 'inactive'
    this.ondataavailable = null
    this.onstop = null
    this.onerror = null
  }

  start() {
    this.state = 'recording'
    // Simulate data available event
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['audio data']) })
      }
    }, 10)
  }

  stop() {
    this.state = 'stopped'
    // Simulate stop event
    setTimeout(() => {
      if (this.onstop) {
        this.onstop()
      }
    }, 10)
  }
}

Object.defineProperty(window, 'MediaRecorder', {
  value: MockMediaRecorder,
  writable: true
})

Object.defineProperty(MockMediaRecorder, 'isTypeSupported', {
  value: vi.fn().mockReturnValue(true),
  writable: true
})

describe('useAudioRecorder hook', () => {
  let mockStream

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock stream
    mockStream = {
      getTracks: () => [
        { stop: vi.fn() }
      ]
    }
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAudioRecorder())

    expect(result.current.isRecording).toBe(false)
    expect(result.current.audioBlob).toBe(null)
    expect(result.current.error).toBe(null)
    expect(typeof result.current.start).toBe('function')
    expect(typeof result.current.stop).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('should start recording successfully', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      result.current.start()
    })

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000
      }
    })
    expect(result.current.isRecording).toBe(true)
    expect(result.current.error).toBe(null)
  })

  it('should handle start recording error', async () => {
    const errorMessage = 'Permission denied'
    mockGetUserMedia.mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      result.current.start()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })

  it('should stop recording and create audio blob', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { result } = renderHook(() => useAudioRecorder())

    // Start recording
    await act(async () => {
      result.current.start()
    })

    expect(result.current.isRecording).toBe(true)

    // Stop recording and wait for blob to be set
    await act(async () => {
      result.current.stop()
      // Wait for onstop handler to execute
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.audioBlob).toBeInstanceOf(Blob)
  })

  it('should reset state', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { result } = renderHook(() => useAudioRecorder())

    // Start recording
    await act(async () => {
      result.current.start()
    })

    // Stop recording to create blob
    await act(async () => {
      result.current.stop()
      // Wait for onstop handler to execute
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(result.current.audioBlob).not.toBe(null)

    // Reset
    act(() => {
      result.current.reset()
    })

    expect(result.current.audioBlob).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should handle multiple start/stop cycles', async () => {
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { result } = renderHook(() => useAudioRecorder())

    // First cycle
    await act(async () => {
      result.current.start()
    })
    await act(async () => {
      result.current.stop()
      // Wait for onstop handler to execute
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.audioBlob).toBeInstanceOf(Blob)

    // Second cycle
    await act(async () => {
      result.current.start()
    })
    await act(async () => {
      result.current.stop()
      // Wait for onstop handler to execute
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.audioBlob).toBeInstanceOf(Blob)
  })

  it('should clean up stream tracks on stop', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStreamWithTracks = {
      getTracks: () => [mockTrack]
    }
    mockGetUserMedia.mockResolvedValue(mockStreamWithTracks)

    const { result } = renderHook(() => useAudioRecorder())

    // Start and stop recording
    await act(async () => {
      result.current.start()
    })
    await act(async () => {
      result.current.stop()
    })

    expect(mockTrack.stop).toHaveBeenCalled()
  })

  it('should use webm MIME type when supported', async () => {
    // Mock isTypeSupported to return true for webm
    vi.spyOn(MediaRecorder, 'isTypeSupported').mockReturnValue(true)
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      result.current.start()
    })

    expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm')
  })

  it('should fallback to mp4 MIME type when webm not supported', async () => {
    // Mock isTypeSupported to return false for webm
    vi.spyOn(MediaRecorder, 'isTypeSupported').mockReturnValue(false)
    mockGetUserMedia.mockResolvedValue(mockStream)

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      result.current.start()
    })

    expect(MediaRecorder.isTypeSupported).toHaveBeenCalledWith('audio/webm')
  })
})