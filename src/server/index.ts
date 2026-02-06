/**
 * Custom Server Entry Point
 *
 * This file creates an HTTP server that runs both:
 * 1. Next.js - for serving pages and API routes
 * 2. Socket.IO - for real-time game communication
 *
 * Why a custom server?
 * Next.js's App Router doesn't have built-in WebSocket support.
 * By creating our own HTTP server and attaching both Next.js and Socket.IO,
 * we can serve everything from the same port.
 *
 * Trade-off: Can't use Vercel's serverless deployment (we'll use Fly.io instead)
 */

// Load environment variables from .env file BEFORE any other imports
import 'dotenv/config'

import { createServer } from 'http'
import next from 'next'
import { createSocketServer } from './socket.js'
import { config, logConfig, validateProductionConfig } from '../lib/config.js'

// Use centralized configuration
const { isDevelopment: dev, port } = config

// Initialize Next.js (don't pass hostname - let it use defaults)
const app = next({ dev })
const nextHandler = app.getRequestHandler()

async function start() {
  try {
    // Validate configuration in production
    validateProductionConfig(config)

    // Log configuration
    logConfig()

    // Prepare Next.js (compile pages, etc.)
    await app.prepare()

    // Create a raw HTTP server
    // This is what both Next.js and Socket.IO will attach to
    const httpServer = createServer(async (req, res) => {
      // Log incoming requests in production for debugging
      if (!dev) {
        console.log(`📨 ${req.method} ${req.url}`)
      }

      // Simple health check endpoint (bypasses Next.js)
      if (req.url === '/health') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
        return
      }

      try {
        // Let Next.js handle all HTTP requests
        // Socket.IO intercepts WebSocket upgrade requests before they reach here
        await nextHandler(req, res)
      } catch (err) {
        console.error('❌ Error handling request:', err)
        res.statusCode = 500
        res.end('Internal Server Error')
      }
    })

    // Attach Socket.IO to the HTTP server
    const io = createSocketServer(httpServer)

    // Store io instance for use in API routes if needed
    // (Alternative: use a module-level export)
    ;(global as Record<string, unknown>).__socketIO = io

    // Start listening (let Node choose the interface)
    httpServer.listen(port, () => {
      console.log('')
      console.log('  ╔══════════════════════════════════════════════╗')
      console.log('  ║        🎮 Mack & Lex Game Server            ║')
      console.log('  ╠══════════════════════════════════════════════╣')
      console.log(`  ║  Port:     ${port}                              ║`)
      console.log(`  ║  Mode:     ${dev ? 'Development' : 'Production'}                  ║`)
      console.log('  ║  Socket:   Ready                             ║')
      console.log('  ╚══════════════════════════════════════════════╝')
      console.log('')
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Run the server
start()
