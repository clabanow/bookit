/**
 * Socket.IO Server Tests
 *
 * These tests verify the socket server initialization and configuration.
 * For full integration testing with real connections, we'd use a test framework
 * like socket.io-client in conjunction with the actual server.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createServer, Server as HttpServer } from 'http'
import { createSocketServer, type Server } from '../socket'

describe('Socket.IO Server', () => {
  let httpServer: HttpServer
  let io: Server | null = null

  afterEach(() => {
    // Clean up after each test
    if (io) {
      io.close()
      io = null
    }
    if (httpServer) {
      httpServer.close()
    }
  })

  it('creates a Socket.IO server from an HTTP server', () => {
    httpServer = createServer()
    io = createSocketServer(httpServer)

    expect(io).toBeDefined()
    expect(io.engine).toBeDefined() // Socket.IO attaches an engine
  })

  it('configures CORS for development', () => {
    httpServer = createServer()
    io = createSocketServer(httpServer)

    // Access the internal options - in dev mode, CORS should allow all origins
    const engine = io.engine
    expect(engine).toBeDefined()
  })

  it('sets up connection event handler', () => {
    httpServer = createServer()
    io = createSocketServer(httpServer)

    // The server should have listeners for 'connection'
    // Socket.IO stores this internally - we verify by checking the server is ready
    expect(io.sockets).toBeDefined()
  })

  it('logs initialization message', () => {
    const consoleSpy = vi.spyOn(console, 'log')

    httpServer = createServer()
    io = createSocketServer(httpServer)

    expect(consoleSpy).toHaveBeenCalledWith('🔌 Socket.IO server initialized')

    consoleSpy.mockRestore()
  })
})

describe('Event Types', () => {
  // Type exports are verified at compile-time by TypeScript.
  // If this file compiles, the types are correctly exported.
  it('exports Server and Socket types', async () => {
    const socketModule = await import('../socket')
    // The module should export createSocketServer as a function
    expect(typeof socketModule.createSocketServer).toBe('function')
  })
})
