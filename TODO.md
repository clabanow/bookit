# TODO.md - Bookit Development Backlog

This is the single source of truth for all development tasks. Work items are ordered by priority and dependency. Each task is a small slice (1-2 hours max).

---

## M0 — Project Bootstrap

### [x] M0.1: Initialize documentation structure
- **Acceptance Criteria**: All /docs files exist with initial content
- **Files**: /docs/PRD.md, /docs/ARCHITECTURE.md, /docs/REALTIME_PROTOCOL.md, /docs/SETUP.md, /docs/CONTRIBUTING.md, /docs/adr/ADR-0001-stack-and-deployment.md
- **Tests**: None
- **Manual Verification**: All files readable, no broken links

### [x] M0.2: Configure ESLint + Prettier
- **Acceptance Criteria**: `npm run lint` and `npm run format` work; CI-ready config
- **Files**: eslint.config.mjs, .prettierrc, package.json scripts
- **Tests**: Lint passes on existing files
- **Manual Verification**: Run `npm run lint`, `npm run format:check`

### [x] M0.3: Add Vitest for unit testing
- **Acceptance Criteria**: `npm run test` runs vitest; sample test passes
- **Files**: vitest.config.ts, src/lib/__tests__/sample.test.ts, package.json
- **Tests**: Sample test file with 1 passing test
- **Manual Verification**: `npm run test` shows green

### [x] M0.4: Add typecheck script
- **Acceptance Criteria**: `npm run typecheck` runs tsc --noEmit
- **Files**: package.json, tsconfig.json (verify strict mode)
- **Tests**: None
- **Manual Verification**: `npm run typecheck` passes

### [x] M0.5: Install and configure shadcn/ui
- **Acceptance Criteria**: shadcn/ui initialized, Button component added as proof
- **Files**: components.json, src/components/ui/button.tsx, tailwind config updates
- **Tests**: None
- **Manual Verification**: Import Button in page.tsx, dev server renders it

### [x] M0.6: Add GitHub Actions CI workflow
- **Acceptance Criteria**: CI runs lint, typecheck, test on push/PR
- **Files**: .github/workflows/ci.yml
- **Tests**: CI workflow syntax valid
- **Manual Verification**: Push branch, see Actions run

### [x] M0.7: Setup Prisma with Postgres schema
- **Acceptance Criteria**: Prisma installed, schema defined, can generate client
- **Files**: prisma/schema.prisma, src/lib/db.ts, package.json scripts
- **Tests**: None (DB not connected yet)
- **Manual Verification**: `npx prisma generate` succeeds

### [x] M0.8: Create initial app route structure
- **Acceptance Criteria**: Placeholder pages exist for /host, /join, /play/[sessionId]
- **Files**: src/app/host/page.tsx, src/app/join/page.tsx, src/app/play/[sessionId]/page.tsx
- **Tests**: None
- **Manual Verification**: Navigate to each route in browser

---

## M1 — Walking Skeleton: Rooms + Roster

### [x] M1.1: Setup Socket.IO server integration
- **Acceptance Criteria**: Socket.IO server runs alongside Next.js; client can connect
- **Files**: src/server/socket.ts, src/lib/realtime/client.ts, src/server/index.ts, src/components/SocketStatus.tsx
- **Tests**: Unit test for socket initialization
- **Manual Verification**: Browser console shows socket connected, SocketStatus component shows green indicator

### [x] M1.2: Implement in-memory session store (Redis-ready interface)
- **Acceptance Criteria**: SessionStore interface with in-memory implementation; can create/get/update sessions
- **Files**: src/lib/session/types.ts, src/lib/session/memory-store.ts, src/lib/session/index.ts
- **Tests**: Unit tests for CRUD operations on sessions (26 tests)
- **Manual Verification**: None (tested via unit tests)

### [x] M1.3: Implement room creation (host)
- **Acceptance Criteria**: Host calls API/socket to create room; receives room code
- **Files**: src/lib/realtime/handlers/host.ts, src/lib/room/create.ts, src/lib/room/index.ts
- **Tests**: Unit tests for room code generation, uniqueness (11 tests)
- **Manual Verification**: Host page creates room, displays code

### [x] M1.4: Build Host lobby UI
- **Acceptance Criteria**: Host page shows room code prominently, player roster area
- **Files**: src/app/host/page.tsx, src/components/host/LobbyView.tsx
- **Tests**: None (UI)
- **Manual Verification**: Visual check of lobby UI

### [x] M1.5: Implement player join flow
- **Acceptance Criteria**: Player enters code + nickname; joins room; host sees them
- **Files**: src/lib/realtime/handlers/player.ts, src/lib/validation/nickname.ts
- **Tests**: Unit tests for nickname validation (16 tests)
- **Manual Verification**: Join from second browser, see roster update

### [x] M1.6: Build Join page UI
- **Acceptance Criteria**: Clean form for room code + nickname input
- **Files**: src/app/join/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Form submits, navigates on success

### [x] M1.7: Implement roster sync (realtime)
- **Acceptance Criteria**: Host sees live roster; updates when players join/leave
- **Files**: src/components/host/PlayerRoster.tsx, socket event handlers
- **Tests**: Integration test for join -> roster update (4 tests)
- **Manual Verification**: Open 3 browser tabs, join, verify roster

### [x] M1.8: Handle player disconnect
- **Acceptance Criteria**: Disconnected players marked in roster; can reconnect
- **Files**: src/lib/realtime/handlers/disconnect.ts
- **Tests**: Unit test for disconnect state
- **Manual Verification**: Close player tab, see status change

---

## M2 — Question Set CRUD

### [x] M2.1: Create QuestionSet + Question Prisma models
- **Acceptance Criteria**: Models defined; migration runs
- **Files**: prisma/schema.prisma, prisma/migrations/
- **Tests**: None
- **Manual Verification**: `npx prisma migrate dev` succeeds

### [x] M2.2: Implement question set API routes
- **Acceptance Criteria**: POST/GET/PUT for question sets
- **Files**: src/app/api/question-sets/route.ts, src/app/api/question-sets/[id]/route.ts
- **Tests**: API routes tested via curl
- **Manual Verification**: curl CRUD operations working

### [x] M2.3: Build question set list page
- **Acceptance Criteria**: Host can see their question sets
- **Files**: src/app/host/sets/page.tsx, src/components/host/QuestionSetList.tsx
- **Tests**: None (UI)
- **Manual Verification**: Page loads, shows sets

### [x] M2.4: Build question set editor UI
- **Acceptance Criteria**: Create/edit questions with prompt, 4 options, correct answer, time limit
- **Files**: src/app/host/sets/[id]/edit/page.tsx, src/components/host/QuestionEditor.tsx
- **Tests**: None (UI)
- **Manual Verification**: Create set with 3 questions, save, reload, verify

### [x] M2.5: Host selects question set before game
- **Acceptance Criteria**: Host picks a set in lobby; set ID stored in session
- **Files**: src/components/host/SetSelector.tsx, session store update
- **Tests**: Unit test for set selection
- **Manual Verification**: Select set, start game, verify correct questions

---

## M3 — Gameplay Loop (Classic Mode)

### [x] M3.1: Implement server-side state machine
- **Acceptance Criteria**: Phase transitions enforced; invalid transitions rejected
- **Files**: src/lib/stateMachine/types.ts, src/lib/stateMachine/machine.ts
- **Tests**: Unit tests for all valid/invalid transitions
- **Manual Verification**: None (tested via unit tests)

### [x] M3.2: Implement scoring logic
- **Acceptance Criteria**: Points calculated based on correctness + speed
- **Files**: src/lib/scoring/classic.ts
- **Tests**: Unit tests for scoring formula
- **Manual Verification**: None (tested via unit tests)

### [x] M3.3: Host starts game -> COUNTDOWN phase
- **Acceptance Criteria**: Host clicks start; all clients receive countdown
- **Files**: src/lib/realtime/handlers/game.ts
- **Tests**: Integration test for start flow
- **Manual Verification**: Click start, see countdown on all screens

### [x] M3.4: QUESTION phase implementation
- **Acceptance Criteria**: Question sent to players; timer runs server-side
- **Files**: src/lib/realtime/handlers/game.ts, timing logic
- **Tests**: Unit test for question timing
- **Manual Verification**: Question appears, timer counts down

### [x] M3.5: Build player game UI
- **Acceptance Criteria**: Player sees question + options; can submit answer
- **Files**: src/app/play/[sessionId]/page.tsx, src/components/play/QuestionView.tsx
- **Tests**: None (UI)
- **Manual Verification**: See question, click answer

### [x] M3.6: Player answer submission
- **Acceptance Criteria**: Player submits once; server records answer + timestamp
- **Files**: src/lib/realtime/handlers/player.ts
- **Tests**: Unit test for duplicate answer prevention
- **Manual Verification**: Submit answer, try again (should fail)

### [x] M3.7: REVEAL phase implementation
- **Acceptance Criteria**: Correct answer shown; players see if they were right
- **Files**: src/lib/realtime/handlers/game.ts, src/components/play/RevealView.tsx
- **Tests**: Integration test for reveal
- **Manual Verification**: See reveal screen after question ends

### [x] M3.8: LEADERBOARD phase implementation
- **Acceptance Criteria**: Sorted leaderboard shown after each question
- **Files**: src/components/shared/Leaderboard.tsx
- **Tests**: Unit test for leaderboard sorting
- **Manual Verification**: See standings, verify order

### [x] M3.9: Question progression (NEXT phase)
- **Acceptance Criteria**: Host/auto advances to next question; loop continues
- **Files**: src/lib/realtime/handlers/game.ts
- **Tests**: Integration test for full loop
- **Manual Verification**: Play through 3 questions

### [x] M3.10: END phase and final standings
- **Acceptance Criteria**: Game ends after last question; final leaderboard shown
- **Files**: src/components/play/EndView.tsx, src/components/host/EndView.tsx
- **Tests**: Integration test for game end
- **Manual Verification**: Complete game, see final standings

---

## M4 — Resilience & Correctness

### [x] M4.1: Player reconnect logic
- **Acceptance Criteria**: Player refresh returns to current game state
- **Files**: src/lib/realtime/handlers/reconnect.ts
- **Tests**: Integration test for reconnect
- **Manual Verification**: Refresh player page mid-game, verify state restored

### [x] M4.2: Host disconnect handling
- **Acceptance Criteria**: Game pauses if host disconnects; resumes on reconnect
- **Files**: src/lib/realtime/handlers/host.ts
- **Tests**: Integration test for host disconnect
- **Manual Verification**: Close host tab, reopen, verify game state

### [x] M4.3: Session expiration + cleanup
- **Acceptance Criteria**: Inactive sessions cleaned up after timeout
- **Files**: src/lib/session/cleanup.ts
- **Tests**: Unit test for expiration logic
- **Manual Verification**: Create session, wait, verify cleanup

### [x] M4.4: Rate limiting implementation
- **Acceptance Criteria**: Join + answer endpoints rate limited
- **Files**: src/lib/middleware/rateLimit.ts
- **Tests**: Unit test for rate limit logic
- **Manual Verification**: Rapid requests, see 429 responses

### [x] M4.5: Input validation + sanitization
- **Acceptance Criteria**: All inputs validated; XSS prevented
- **Files**: src/lib/validation/schemas.ts
- **Tests**: Unit tests for validation (37 tests)
- **Manual Verification**: Try malicious inputs, verify rejected

### [x] M4.6: Profanity filter stub
- **Acceptance Criteria**: Nicknames filtered; configurable word list
- **Files**: src/lib/validation/profanity.ts
- **Tests**: Unit tests for filter (23 tests)
- **Manual Verification**: Try blocked word, see rejection

---

## M5 — Deployment MVP

### [x] M5.1: Environment configuration
- **Acceptance Criteria**: All secrets via env vars; .env.example documented
- **Files**: .env.example, src/lib/config.ts
- **Tests**: None
- **Manual Verification**: App runs with only .env

### [x] M5.2: Production database setup
- **Acceptance Criteria**: Managed Postgres provisioned; migrations run
- **Files**: docs/SETUP.md updated
- **Tests**: None
- **Manual Verification**: Connect to prod DB
- **Provider**: Neon (neondb at us-east-1)

### [x] M5.3: Redis session store implementation
- **Acceptance Criteria**: Redis store implements SessionStore interface
- **Files**: src/lib/session/redis-store.ts
- **Tests**: Unit tests with mock Redis (19 tests)
- **Manual Verification**: Sessions persist across restarts

### [ ] M5.4: Deploy to Vercel/Fly.io
- **Acceptance Criteria**: App deployed; accessible via URL
- **Files**: vercel.json or fly.toml, deployment docs
- **Tests**: None
- **Manual Verification**: Full game flow on production

### [ ] M5.5: Production smoke test
- **Acceptance Criteria**: End-to-end game works in production
- **Files**: None
- **Tests**: None
- **Manual Verification**: Create room, join, play, verify

---

## M6 — Post-MVP Backlog (Placeholders)

### [ ] M6.1: Host authentication (OAuth)
### [ ] M6.2: Public question set library
### [x] M6.3: Question set import/export
- **Files**: src/app/api/question-sets/[id]/export/route.ts, src/app/api/question-sets/import/route.ts, src/components/host/ImportQuestionSet.tsx
- **Features**: Export to JSON, import from JSON, UI buttons in question sets page
### [ ] M6.4: Image support in questions
### [ ] M6.5: Additional game modes (plugin interface)
### [ ] M6.6: Cosmetics/progression system
### [~] M6.7: Moderation tools (partial)
- **Completed**: Kick player feature (host can remove players from lobby)
- **Remaining**: Mute, ban, report features
### [ ] M6.8: Analytics dashboard
### [ ] M6.9: Mobile-responsive polish
### [~] M6.10: Accessibility audit (partial)
- **Completed**: Added ARIA roles, labels, live regions for dynamic content
- **Remaining**: Full audit with screen reader testing, focus management review

---

## Current Status

**Current Task**: Completed for now - remaining tasks require infrastructure
**Completed This Session**:
  - M4.5-M4.6: Input validation, profanity filter
  - M5.1, M5.3: Environment config, Redis session store
  - M6.3: Question set import/export
  - M6.7 (partial): Kick player feature
  - M6.10 (partial): Accessibility improvements (ARIA labels, live regions)
  - Integration: Profanity filter, rate limiting, input validation in handlers
  - Validation: Question set existence check in room creation
  - UX: Error boundary, loading state, 404 page
**Tests**: 229 passing
**M5.1 + M5.3 Completed**: Environment config, Redis session store
**M4 Completed**: Resilience & Correctness
  - Player/host reconnect, session cleanup
  - Rate limiting, input validation, profanity filter
**M3 Completed**: Gameplay Loop (116 tests)
  - State machine, scoring logic
  - Game flow: countdown, question, reveal, leaderboard, end
  - Player game UI with answer submission
**Last Updated**: 2026-01-31
**M0 Completed**: All bootstrap tasks done
**M1 Completed**: Walking Skeleton complete
  - Socket.IO server, session store, room creation
  - Host lobby, player join, roster sync, disconnect handling
**M2 Completed**: Question Set CRUD (70 tests)
  - Prisma models, API routes for question sets
  - Question set list page, editor UI
  - Host selects question set before starting game
