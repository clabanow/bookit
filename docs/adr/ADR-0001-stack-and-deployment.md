# ADR-0001: Technology Stack and Deployment

## Status

Accepted

## Date

2024-01-31

## Context

We need to select a technology stack for building a real-time classroom quiz platform (Bookit). Key requirements:

1. Real-time communication between host and 50+ players
2. Persistent storage for question sets
3. Ephemeral storage for live game sessions
4. Fast development iteration
5. Production deployment with minimal ops overhead

## Decision

### Frontend + Backend: Next.js 16 (App Router)

**Rationale**:
- Single codebase for frontend and API
- App Router provides modern React patterns
- Built-in API routes reduce need for separate backend
- TypeScript first-class support
- Vercel deployment is trivial

**Alternatives considered**:
- Separate Fastify/Nest backend: More complexity, separate deployment
- Remix: Less mature ecosystem, smaller community

### UI: Tailwind CSS + shadcn/ui

**Rationale**:
- Tailwind enables rapid styling without context switching
- shadcn/ui provides accessible, customizable components
- No runtime CSS-in-JS overhead
- Easy to maintain consistency

### Real-time: Socket.IO

**Rationale**:
- Mature library with excellent fallback handling
- Built-in room/namespace support maps well to game rooms
- Good TypeScript support
- Works with Vercel serverless (with caveats) or self-hosted

**Alternatives considered**:
- Raw WebSockets (ws): Lower level, more boilerplate
- Pusher/Ably: External dependency, potential latency
- Server-Sent Events: Not bidirectional

**Note**: Socket.IO requires a persistent server. For Vercel deployment, we'll use a separate Socket.IO server on Fly.io or Railway. See ADR-0002 (future) for deployment specifics.

### Database: PostgreSQL + Prisma

**Rationale**:
- PostgreSQL is reliable, well-understood
- Prisma provides type-safe queries and migrations
- Works with Vercel Postgres, Neon, Supabase, etc.
- Good developer experience

**Alternatives considered**:
- MongoDB: Less structured, harder to maintain consistency
- SQLite: Not suitable for serverless/edge deployment

### Ephemeral State: Redis (with in-memory fallback)

**Rationale**:
- Live game sessions need fast read/write
- TTL support for automatic cleanup
- Pub/sub for multi-instance scaling (future)
- In-memory store for development simplicity

**Implementation**:
- Define `SessionStore` interface
- `MemorySessionStore` for development
- `RedisSessionStore` for production
- Swap via environment variable

**Alternatives considered**:
- Only in-memory: Won't scale, loses state on restart
- Postgres for everything: Slower for ephemeral data

### Testing: Vitest

**Rationale**:
- Fast, Vite-native
- Jest-compatible API
- Good TypeScript support
- Parallel test execution

### Deployment: Vercel (web) + Fly.io (sockets)

**Rationale**:
- Vercel excels at Next.js deployment
- Fly.io provides persistent servers for Socket.IO
- Both have generous free tiers
- Easy to provision managed Postgres/Redis

**Architecture**:
```
[Vercel - Next.js App]
       │
       ├─── API Routes (REST)
       │
       └─── Static + SSR Pages

[Fly.io - Socket.IO Server]
       │
       ├─── WebSocket connections
       │
       └─── Game state coordination
```

**Alternatives considered**:
- All on Fly.io: Possible, but loses Vercel's edge caching
- All on Vercel: Socket.IO doesn't work well with serverless
- Railway: Good alternative to Fly.io

## Consequences

### Positive

- Fast development with familiar tools
- Type safety throughout the stack
- Good developer experience
- Scalable architecture
- Reasonable hosting costs

### Negative

- Two deployment targets adds complexity
- Socket.IO server needs separate scaling strategy
- Redis adds operational overhead in production

### Risks

- Socket.IO + serverless is tricky; may need to reconsider if issues arise
- Redis connection management in serverless requires pooling

## Future Considerations

- May consolidate to single platform if Socket.IO on Vercel improves
- May add edge caching for question sets
- May move to managed WebSocket service if scale demands
