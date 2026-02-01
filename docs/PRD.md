# Product Requirements Document: Bookit

## Overview

Bookit is a live classroom quiz platform where a host (teacher) runs real-time quiz games with players (students). Players join via room code and compete by answering timed multiple-choice questions.

## MVP Scope

### Roles

**Host (Teacher)**
- Creates a game room with unique join code
- Selects a question set to play
- Controls game flow (start, advance)
- Views live player roster and leaderboard

**Player (Student)**
- Joins room with code + nickname
- Answers questions within time limit
- Sees feedback and standings

### Game Mode: Classic

The MVP includes one game mode called "Classic":

1. **Timed Questions**: Each question has a configurable time limit (default 20s)
2. **Scoring**: Points awarded for correct answers; bonus points for speed
3. **Leaderboard**: Rankings shown after each question
4. **Final Standings**: Complete results shown at game end

### Question Sets

- Host creates question sets with title
- Each question has:
  - Prompt text
  - 4 answer options
  - One correct answer (index 0-3)
  - Time limit in seconds
- Questions are multiple-choice only (MVP)

### User Flow

```
Host Flow:
1. Navigate to /host
2. Create or select question set
3. Create room -> display join code
4. Wait for players (see live roster)
5. Start game
6. Watch game progress
7. See final standings

Player Flow:
1. Navigate to /join
2. Enter room code + nickname
3. Wait in lobby
4. Answer questions as they appear
5. See feedback after each question
6. View final standings
```

## Out of Scope (MVP)

- User authentication
- Persistent player accounts
- Multiple game modes
- Images/media in questions
- Import/export question sets
- Public question library
- Cosmetics/rewards
- Game history/analytics

## Success Criteria

1. Host can create room and see join code
2. 10+ players can join simultaneously
3. Full game loop completes without errors
4. Scores calculated correctly
5. Leaderboard reflects actual standings
6. Game handles player disconnects gracefully

## Technical Constraints

- Server-authoritative: All scoring and state on server
- Real-time updates within 100ms for local, 500ms for remote
- Room codes expire after 2 hours of inactivity
- Maximum 50 players per room (MVP)
- Maximum 50 questions per set (MVP)
