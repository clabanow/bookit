# Realtime Protocol Specification

This document defines all Socket.IO events, their payloads, and expected behaviors.

## Connection

**Namespace**: `/` (default)

**Connection Query Parameters**:
```typescript
{
  role: 'host' | 'player'
  sessionId?: string  // For reconnection
  playerId?: string   // For player reconnection
}
```

## Events: Host → Server

### `host:create_room`

Create a new game room.

**Payload**:
```typescript
{
  questionSetId: string
}
```

**Response** (`room:created`):
```typescript
{
  sessionId: string
  roomCode: string
}
```

**Errors**:
- `INVALID_QUESTION_SET`: Question set not found
- `RATE_LIMITED`: Too many room creations

---

### `host:start_game`

Start the game from lobby.

**Payload**:
```typescript
{
  sessionId: string
}
```

**Response**: Broadcasts `game:phase_update` to room

**Errors**:
- `NOT_HOST`: Socket is not the host
- `INVALID_PHASE`: Not in LOBBY phase
- `NO_PLAYERS`: No players have joined
- `NO_QUESTIONS`: Question set is empty

---

### `host:next_question`

Advance to next question (from LEADERBOARD phase).

**Payload**:
```typescript
{
  sessionId: string
}
```

**Response**: Broadcasts `game:phase_update` then `game:question`

**Errors**:
- `NOT_HOST`: Socket is not the host
- `INVALID_PHASE`: Not in LEADERBOARD phase

---

### `host:end_game`

End the game early.

**Payload**:
```typescript
{
  sessionId: string
}
```

**Response**: Broadcasts `game:end`

---

## Events: Player → Server

### `player:join_room`

Join an existing room.

**Payload**:
```typescript
{
  roomCode: string
  nickname: string
}
```

**Response** (`player:joined`):
```typescript
{
  sessionId: string
  playerId: string
  players: Player[]  // Current roster
}
```

**Errors**:
- `ROOM_NOT_FOUND`: Invalid room code
- `GAME_IN_PROGRESS`: Cannot join after game started
- `NICKNAME_TAKEN`: Nickname already in use
- `NICKNAME_INVALID`: Failed validation/profanity check
- `ROOM_FULL`: Maximum players reached
- `RATE_LIMITED`: Too many join attempts

---

### `player:submit_answer`

Submit answer for current question.

**Payload**:
```typescript
{
  sessionId: string
  playerId: string
  answerIndex: number  // 0-3
}
```

**Response** (`player:answer_received`):
```typescript
{
  received: true
  timestamp: number
}
```

**Errors**:
- `INVALID_PHASE`: Not in QUESTION phase
- `ALREADY_ANSWERED`: Player already submitted
- `INVALID_ANSWER`: answerIndex out of range
- `TIME_EXPIRED`: Question timer ended
- `RATE_LIMITED`: Too many submissions

---

### `player:reconnect`

Reconnect to an active session.

**Payload**:
```typescript
{
  sessionId: string
  playerId: string
}
```

**Response** (`player:state_sync`):
```typescript
{
  phase: Phase
  currentQuestion?: Question  // If in QUESTION phase
  timeRemaining?: number
  score: number
  leaderboard?: LeaderboardEntry[]
}
```

**Errors**:
- `SESSION_NOT_FOUND`: Session expired or invalid
- `PLAYER_NOT_FOUND`: Player ID not in session

---

## Events: Server → Clients

### `room:roster_update`

Sent when players join or leave.

**Payload**:
```typescript
{
  players: {
    playerId: string
    nickname: string
    connected: boolean
  }[]
  count: number
}
```

**Recipients**: Host + all players in room

---

### `game:phase_update`

Sent when game phase changes.

**Payload**:
```typescript
{
  phase: 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'REVEAL' | 'LEADERBOARD' | 'END'
  timestamp: number
}
```

**Recipients**: All clients in room

---

### `game:countdown`

Sent at start of COUNTDOWN phase.

**Payload**:
```typescript
{
  seconds: number  // Countdown duration (e.g., 3)
}
```

---

### `game:question`

Sent when QUESTION phase begins.

**Payload**:
```typescript
{
  questionIndex: number
  totalQuestions: number
  prompt: string
  options: string[]
  timeLimitSec: number
  startTime: number  // Server timestamp
}
```

**Note**: `correctIndex` is NOT sent to players.

---

### `game:reveal`

Sent when REVEAL phase begins.

**Payload**:
```typescript
{
  correctIndex: number
  playerResults: {
    playerId: string
    answerIndex: number | null
    correct: boolean
    pointsEarned: number
    newTotal: number
  }[]
}
```

**Recipients**: All clients

---

### `game:leaderboard`

Sent when LEADERBOARD phase begins.

**Payload**:
```typescript
{
  standings: {
    rank: number
    playerId: string
    nickname: string
    score: number
    change: number  // Position change from previous
  }[]
  questionIndex: number
  totalQuestions: number
}
```

---

### `game:end`

Sent when game ends.

**Payload**:
```typescript
{
  finalStandings: {
    rank: number
    playerId: string
    nickname: string
    score: number
  }[]
  stats: {
    totalQuestions: number
    avgCorrectRate: number
    fastestAnswer: {
      playerId: string
      nickname: string
      timeMs: number
    }
  }
}
```

---

### `error`

Sent when an error occurs.

**Payload**:
```typescript
{
  code: string
  message: string
  details?: any
}
```

---

## Type Definitions

```typescript
type Phase =
  | 'LOBBY'
  | 'COUNTDOWN'
  | 'QUESTION'
  | 'REVEAL'
  | 'LEADERBOARD'
  | 'END'

interface Player {
  playerId: string
  nickname: string
  connected: boolean
  score: number
}

interface Question {
  prompt: string
  options: string[]
  timeLimitSec: number
}

interface LeaderboardEntry {
  rank: number
  playerId: string
  nickname: string
  score: number
  change: number
}
```

## Timing Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `COUNTDOWN_DURATION` | 3s | Pre-game countdown |
| `DEFAULT_QUESTION_TIME` | 20s | Default per-question time |
| `REVEAL_DURATION` | 3s | Time to show correct answer |
| `LEADERBOARD_DURATION` | 5s | Time to show standings |
| `RECONNECT_GRACE` | 30s | Time before marking player disconnected |
| `SESSION_TIMEOUT` | 2h | Inactive session expiry |

## Error Codes

| Code | HTTP Equiv | Description |
|------|------------|-------------|
| `ROOM_NOT_FOUND` | 404 | Room code invalid or expired |
| `SESSION_NOT_FOUND` | 404 | Session ID invalid |
| `PLAYER_NOT_FOUND` | 404 | Player ID not in session |
| `INVALID_PHASE` | 400 | Action not allowed in current phase |
| `NOT_HOST` | 403 | Only host can perform action |
| `ALREADY_ANSWERED` | 409 | Duplicate answer submission |
| `NICKNAME_TAKEN` | 409 | Nickname in use |
| `NICKNAME_INVALID` | 400 | Validation failed |
| `ROOM_FULL` | 403 | Max players reached |
| `RATE_LIMITED` | 429 | Too many requests |
| `GAME_IN_PROGRESS` | 403 | Cannot join active game |
| `NO_PLAYERS` | 400 | Cannot start without players |
| `NO_QUESTIONS` | 400 | Question set is empty |
