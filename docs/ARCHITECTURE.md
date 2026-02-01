# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │  Host App    │         │  Player App  │  (multiple)         │
│   │  /host/*     │         │  /join       │                     │
│   │              │         │  /play/[id]  │                     │
│   └──────┬───────┘         └──────┬───────┘                     │
│          │                        │                              │
│          │    WebSocket + HTTP    │                              │
│          └───────────┬────────────┘                              │
│                      │                                           │
└──────────────────────┼───────────────────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────────────────┐
│                      ▼                SERVER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Next.js App                           │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│   │  │ API Routes  │  │   Pages     │  │  Socket.IO      │  │   │
│   │  │ /api/*      │  │   (SSR)     │  │  Server         │  │   │
│   │  └──────┬──────┘  └─────────────┘  └────────┬────────┘  │   │
│   │         │                                    │           │   │
│   │         └────────────────┬───────────────────┘           │   │
│   │                          ▼                               │   │
│   │         ┌────────────────────────────────────┐           │   │
│   │         │          Core Libraries            │           │   │
│   │         │  ┌──────────┐  ┌───────────────┐   │           │   │
│   │         │  │ State    │  │   Scoring     │   │           │   │
│   │         │  │ Machine  │  │   Engine      │   │           │   │
│   │         │  └──────────┘  └───────────────┘   │           │   │
│   │         │  ┌──────────┐  ┌───────────────┐   │           │   │
│   │         │  │ Session  │  │   Validation  │   │           │   │
│   │         │  │ Store    │  │               │   │           │   │
│   │         │  └────┬─────┘  └───────────────┘   │           │   │
│   │         └───────┼────────────────────────────┘           │   │
│   │                 │                                        │   │
│   └─────────────────┼────────────────────────────────────────┘   │
│                     │                                            │
│         ┌───────────┴───────────┐                                │
│         ▼                       ▼                                │
│   ┌───────────┐           ┌───────────┐                         │
│   │   Redis   │           │ Postgres  │                         │
│   │ (Session) │           │ (Persist) │                         │
│   └───────────┘           └───────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Frontend (Next.js App Router)

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/host` | Host lobby - create room, manage game |
| `/host/sets` | Question set management |
| `/host/sets/[id]/edit` | Question set editor |
| `/join` | Player join form |
| `/play/[sessionId]` | Player game view |

### Backend Services

**API Routes (`/api/*`)**
- Question set CRUD
- Room creation (REST fallback)
- Health checks

**Socket.IO Server**
- Real-time game events
- Room management
- Player connections

### Core Libraries

**State Machine (`/src/lib/stateMachine/`)**
- Manages game phases: LOBBY → COUNTDOWN → QUESTION → REVEAL → LEADERBOARD → NEXT → END
- Validates transitions
- Server-authoritative

**Scoring Engine (`/src/lib/scoring/`)**
- Calculates points per answer
- Classic mode: correctness + speed bonus
- Pluggable for future modes

**Session Store (`/src/lib/session/`)**
- Interface-based design
- In-memory implementation for dev
- Redis implementation for production
- Stores: LiveSession, Players, Answers

**Validation (`/src/lib/validation/`)**
- Input sanitization
- Schema validation (zod)
- Profanity filtering

### Data Storage

**Postgres (Persistent)**
```
QuestionSet
  - id: UUID
  - title: String
  - ownerId: String? (for future auth)
  - createdAt: DateTime

Question
  - id: UUID
  - setId: FK -> QuestionSet
  - prompt: String
  - options: String[] (4 items)
  - correctIndex: Int (0-3)
  - timeLimitSec: Int
  - order: Int
```

**Redis (Ephemeral)**
```
LiveSession
  - sessionId: String
  - roomCode: String (6 chars)
  - hostSocketId: String
  - questionSetId: String
  - phase: Phase enum
  - currentQuestionIndex: Int
  - questionStartedAt: Timestamp
  - createdAt: Timestamp

Player (per session)
  - playerId: String
  - nickname: String
  - socketId: String
  - score: Int
  - connected: Boolean
  - lastAnswerIndex: Int?
  - lastAnswerTime: Timestamp?
```

## Key Design Decisions

### Server-Authoritative

All game state lives on the server. Clients receive state snapshots and render accordingly. This prevents cheating and ensures consistency.

### Phase-Based State Machine

The game progresses through defined phases. Each phase has:
- Entry conditions
- Valid actions
- Exit triggers
- Timeout behavior

### Pluggable Game Modes

Classic mode is implemented first, but the architecture supports adding modes:
- Each mode provides its own scoring function
- Phase timings can vary by mode
- Future: mode-specific UI components

### Session Store Interface

```typescript
interface SessionStore {
  createSession(hostSocketId: string, questionSetId: string): Promise<LiveSession>
  getSession(sessionId: string): Promise<LiveSession | null>
  getSessionByCode(roomCode: string): Promise<LiveSession | null>
  updateSession(sessionId: string, updates: Partial<LiveSession>): Promise<void>
  deleteSession(sessionId: string): Promise<void>

  addPlayer(sessionId: string, player: Player): Promise<void>
  getPlayers(sessionId: string): Promise<Player[]>
  updatePlayer(sessionId: string, playerId: string, updates: Partial<Player>): Promise<void>
  removePlayer(sessionId: string, playerId: string): Promise<void>
}
```

This interface allows swapping between in-memory (dev) and Redis (prod) without changing application code.

## Security Model

1. **Room codes**: 6 alphanumeric characters, randomly generated, checked for uniqueness
2. **Rate limiting**: Join attempts and answer submissions throttled
3. **Input validation**: All user input validated and sanitized
4. **No client trust**: Scoring happens server-side; clients only submit answer index
5. **Session expiry**: Rooms auto-delete after inactivity timeout
