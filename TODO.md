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

### [x] M5.4: Deploy to Railway
- **Acceptance Criteria**: App deployed; accessible via URL
- **Files**: railway.json, package.json (engines)
- **Tests**: None
- **Manual Verification**: Full game flow on production
- **URL**: https://bookit-production-5539.up.railway.app

### [x] M5.5: Production smoke test
- **Acceptance Criteria**: End-to-end game works in production
- **Files**: None
- **Tests**: None
- **Manual Verification**: Create room, join, play, verify
- **Completed**: 2026-01-31

---

## M6 — Post-MVP Backlog (Placeholders)

### [ ] M6.1: Host authentication (OAuth)
### [ ] M6.2: Public question set library
### [x] M6.3: Question set import/export
- **Files**: src/app/api/question-sets/[id]/export/route.ts, src/app/api/question-sets/import/route.ts, src/components/host/ImportQuestionSet.tsx
- **Features**: Export to JSON, import from JSON, UI buttons in question sets page
### [ ] M6.4: Image support in questions
### [x] M6.5: Multi-game platform ("Mack & Lex Games")
- **Acceptance Criteria**: Rebranded to "Mack & Lex Games", quiz routes under /games/quiz, game registry, home page as game browser
- **Files**: src/lib/games/registry.ts, src/lib/games/index.ts, src/app/games/layout.tsx, src/app/games/quiz/layout.tsx, src/app/page.tsx (rewritten), plus ~17 files with route/cookie/brand updates
- **Changes**:
  - Created game registry with typed GameConfig array
  - Moved host/, join/, play/ under /games/quiz/
  - Updated all hardcoded route refs (/host → /games/quiz/host, etc.)
  - Renamed cookies: bookit_session → mack_session, bookit_oauth_state → mack_oauth_state
  - Renamed localStorage: bookit_host_session → mack_quiz_host_session, bookit_player_ → mack_player_
  - Home page now shows game cards from registry
  - Middleware protects /games/* instead of individual /host, /join, /play
  - Cross-cutting pages (login, chat, admin, etc.) link to / instead of /host
- **Tests**: 291 passing (no test changes needed)
### [ ] M6.6: Cosmetics/progression system
### [~] M6.7: Moderation tools (partial)
- **Completed**: Kick player feature (host can remove players from lobby)
- **Remaining**: Mute, ban, report features
### [ ] M6.8: Analytics dashboard
### [x] M6.9: Mobile-responsive polish
- **Files**: Sets page, editor, SpellingInput, SocketStatus, QuestionSetList, generate page, new/edit pages
- **Changes**: Responsive padding (p-4 md:p-8), flex-wrap buttons, smaller mobile letter boxes, opacity on socket status
### [~] M6.10: Accessibility audit (partial)
- **Completed**: Added ARIA roles, labels, live regions for dynamic content
- **Remaining**: Full audit with screen reader testing, focus management review

---

## M7 — User Authentication & Accounts

### [x] M7.1: Create User and Player Prisma models
- **Acceptance Criteria**: User model (email, passwordHash, approved, role), Player model (sub-account linked to User, nickname, avatar)
- **Files**: prisma/schema.prisma, prisma/migrations/20260201015237_add_user_and_player_models
- **Tests**: None
- **Manual Verification**: `npx prisma migrate dev` succeeds ✓
- **Notes**: Each User can have up to 3 Player sub-accounts
- **Added**: Role enum (USER, ADMIN), ApprovalStatus enum (PENDING, APPROVED, REJECTED)

### [x] M7.2: Implement user registration API
- **Acceptance Criteria**: POST /api/auth/register creates pending user
- **Files**: src/lib/auth/password.ts, src/lib/auth/register.ts, src/app/api/auth/register/route.ts, prisma/seed.ts
- **Tests**: Unit tests for password hashing (5) and registration validation (11)
- **Manual Verification**: Register, see pending status in DB
- **Added**: bcryptjs for password hashing, seed script for admin account

### [x] M7.3: Implement user login/logout
- **Acceptance Criteria**: POST /api/auth/login returns JWT/session; logout clears session
- **Files**: src/lib/auth/login.ts, src/lib/auth/session.ts, src/app/api/auth/login/route.ts, src/app/api/auth/logout/route.ts, src/app/api/auth/me/route.ts
- **Tests**: Existing password tests cover verification
- **Manual Verification**: Login, verify session cookie set ✓
- **Added**: JWT via jose library, HTTP-only cookies, /api/auth/me endpoint
- **Verified**: Login returns 200, session cookie works, logout clears session

### [x] M7.4: Build registration and login UI
- **Acceptance Criteria**: /register and /login pages with forms, error handling
- **Files**: src/app/register/page.tsx, src/app/login/page.tsx, src/app/page.tsx (added nav links)
- **Tests**: None (UI)
- **Manual Verification**: Register, login, see appropriate feedback ✓
- **Added**: Password confirmation, pending account message, auth links on homepage

### [x] M7.5: Build admin approval dashboard
- **Acceptance Criteria**: Admin can see pending users, approve/reject them
- **Files**: src/app/admin/users/page.tsx, src/app/api/admin/users/route.ts, src/app/api/admin/users/[id]/route.ts
- **Tests**: None
- **Manual Verification**: Approve user, they can now login ✓
- **Added**: Filter by status (pending/approved/rejected/all), admin cannot modify their own status

### [x] M7.6: Implement Player sub-account creation
- **Acceptance Criteria**: User can create up to 3 players with distinct nicknames and secret PINs
- **Files**: src/app/api/players/route.ts, src/app/api/players/[id]/route.ts, src/app/account/players/page.tsx
- **Tests**: Manual verification of 3-player limit ✓
- **Manual Verification**: Create 3 players, try to create 4th (should fail) ✓
- **Added**: Delete player endpoint, nickname validation, duplicate check, 4-digit secret PIN

### [x] M7.7: Build player selector UI
- **Acceptance Criteria**: Before joining game, user picks which player sub-account to use
- **Files**: src/components/player/PlayerSelector.tsx, src/app/join/page.tsx (updated)
- **Tests**: None (UI)
- **Manual Verification**: Select different players, join game with correct identity ✓
- **Added**: Auth check before joining, redirect to login if not authenticated

### [x] M7.8: Protect routes with authentication
- **Acceptance Criteria**: /join, /play, /host require login; redirect to /login if not authenticated
- **Files**: src/middleware.ts, src/app/login/page.tsx (updated for redirect param)
- **Tests**: Manual verification ✓
- **Manual Verification**: Try accessing /join without login, get redirected ✓
- **Protected routes**: /join, /play/*, /host, /admin/*, /account/*

---

## M8 — AI Question Set Generation

### [x] M8.1: Setup image upload infrastructure
- **Acceptance Criteria**: Users can upload images for AI processing
- **Files**: Image upload handled inline in /api/ai/generate (base64)
- **Tests**: None
- **Manual Verification**: Upload image in generate UI ✓

### [x] M8.2: Integrate vision AI for text extraction
- **Acceptance Criteria**: Send image to AI, receive extracted text/content
- **Files**: src/lib/ai/vision.ts, src/lib/ai/client.ts
- **Tests**: None
- **Manual Verification**: AI extracts content from homework photos ✓
- **Provider**: Claude Vision (claude-sonnet-4)

### [x] M8.3: Implement question generation from text
- **Acceptance Criteria**: LLM generates questions from extracted content
- **Files**: src/lib/ai/questionGenerator.ts
- **Tests**: None
- **Manual Verification**: Generate questions from vocab list ✓

### [x] M8.4: Build AI question generation UI
- **Acceptance Criteria**: Upload image → generate questions → review/edit → save
- **Files**: src/app/host/sets/generate/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Full flow from image to saved question set ✓
- **Note**: Requires ANTHROPIC_API_KEY environment variable

### [x] M8.5: Add content type detection UI
- **Acceptance Criteria**: UI shows detected content type, allows override and re-generation
- **Files**: src/app/host/sets/generate/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Upload content, see type badge, override and re-generate ✓
- **Note**: Backend detection already existed in M8.2; this adds the UI layer

---

## M9 — Spelling Mode

### [x] M9.1: Add question type to schema
- **Acceptance Criteria**: Questions can be "MULTIPLE_CHOICE" or "SPELLING"
- **Files**: prisma/schema.prisma, prisma/migrations/20260201021329_add_spelling_mode
- **Tests**: None
- **Manual Verification**: Migration runs, can create spelling questions ✓
- **Added**: QuestionType enum, answer and hint fields on Question

### [x] M9.2: Implement text-to-speech for words
- **Acceptance Criteria**: Browser speaks the word to spell; replay button available
- **Files**: src/lib/audio/textToSpeech.ts, src/components/play/SpellingAudio.tsx
- **Tests**: None (browser API)
- **Manual Verification**: Uses Web Speech API ✓

### [x] M9.3: Build spelling input UI
- **Acceptance Criteria**: Text input instead of multiple choice buttons; shows letter count hint
- **Files**: src/components/play/SpellingInput.tsx
- **Tests**: None (UI)
- **Manual Verification**: Type answer, submit ✓

### [x] M9.4: Implement spelling answer checking
- **Acceptance Criteria**: Exact match required (case-insensitive)
- **Files**: src/lib/scoring/spelling.ts
- **Tests**: Levenshtein distance for future partial credit
- **Manual Verification**: Correct and incorrect spellings scored properly ✓

### [x] M9.5: Update game flow for spelling mode
- **Acceptance Criteria**: Server handles spelling questions
- **Files**: src/lib/realtime/handlers/game.ts, src/lib/realtime/handlers/player.ts, src/lib/session/types.ts
- **Tests**: Updated player types ✓
- **Manual Verification**: Game flow supports both question types ✓

### [x] M9.6: Create spelling question set editor
- **Acceptance Criteria**: Editor supports mixed MC + spelling questions; preview pronunciation
- **Files**: src/components/host/QuestionSetEditor.tsx, src/app/host/sets/[id]/edit/page.tsx, src/app/api/question-sets/[id]/route.ts
- **Tests**: None (UI)
- **Manual Verification**: Create mixed set, save, edit, verify round-trip ✓
- **Note**: Integrated into existing editor rather than creating separate component

---

## M10 — Chat Forum (Global + In-Game)

### [x] M10.1: Design chat data model
- **Acceptance Criteria**: ChatMessage model with userId, playerId, channel (string), content, createdAt
- **Files**: prisma/schema.prisma
- **Tests**: None
- **Manual Verification**: `npx prisma generate` succeeds, migration pending DB connection
- **Design**: No separate Channel table. Uses string field: "global" for persistent chat, "game:<sessionId>" for ephemeral

### [x] M10.2: Create chat API routes
- **Acceptance Criteria**: GET with cursor-based pagination, POST with moderation, report endpoint
- **Files**: src/app/api/chat/route.ts, src/app/api/chat/report/route.ts
- **Tests**: None (API)
- **Manual Verification**: REST endpoints working

### [x] M10.3: Build global chat UI
- **Acceptance Criteria**: /chat page with player selector, ChatPanel component, nav link on homepage
- **Files**: src/components/chat/ChatPanel.tsx, src/app/chat/page.tsx, src/app/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Send messages, see them appear

### [x] M10.4: Add real-time chat via Socket.IO
- **Acceptance Criteria**: chat:join_channel, chat:leave_channel, chat:send, chat:message events
- **Files**: src/lib/realtime/handlers/chat.ts, src/server/socket.ts, src/lib/realtime/handlers/index.ts
- **Tests**: None (integration)
- **Manual Verification**: Two browsers, messages appear instantly
- **Rate limit**: 1 message per 2 seconds via sendMessage config

### [x] M10.5: Build in-game room chat
- **Acceptance Criteria**: Floating toggle button with unread badge, ephemeral socket-only messages
- **Files**: src/components/chat/GameChat.tsx, src/app/play/[sessionId]/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Chat during game

### [x] M10.6: Chat moderation
- **Acceptance Criteria**: moderateMessage() combines length, XSS, profanity checks + sanitization
- **Files**: src/lib/chat/moderation.ts, src/lib/chat/__tests__/moderation.test.ts
- **Tests**: 12 unit tests for chat filtering
- **Manual Verification**: Blocked words rejected, allowlist words pass

---

## M11 — Gold Coins & Trading Cards

### [x] M11.1: Add coins, cards, and game tracking to schema
- **Acceptance Criteria**: CardRarity enum, coins on Player, Card model, PlayerCard join table, GamePlay tracking
- **Files**: prisma/schema.prisma
- **Tests**: None
- **Manual Verification**: `npx prisma generate` succeeds, migration pending DB connection
- **Models added**: Card (28 cards, 5 rarity tiers), PlayerCard (ownership), GamePlay (anti-farming)

### [x] M11.2: Seed 28-card catalog
- **Acceptance Criteria**: All 28 cards seeded across 5 tiers with costs and seasonal tags
- **Files**: prisma/seed-cards.ts, package.json (`seed:cards` script)
- **Tests**: None
- **Manual Verification**: Run `npx tsx prisma/seed-cards.ts` after migration
- **Card tiers**: Common (6, 50c), Rare (5, 200c), Legendary (7, 500c), Mystical (6, 1500c), Iridescent (4, 5000c)

### [x] M11.3: Coin calculation logic
- **Acceptance Criteria**: 10 coins/correct answer, 5 bonus for streaks, placement bonuses, 50% repeat penalty
- **Files**: src/lib/scoring/coins.ts
- **Tests**: None (logic is straightforward pure functions)
- **Manual Verification**: Integrated into game flow

### [x] M11.4: Hook coins into game flow
- **Acceptance Criteria**: Coins tracked per question, persisted at game end, repeat play detection
- **Files**: src/lib/session/types.ts (added coinsEarned, streak), src/lib/session/index.ts, src/lib/realtime/handlers/game.ts
- **Tests**: 245 existing tests still passing
- **Manual Verification**: Play game, see coins in game:end event

### [x] M11.5: Card shop API
- **Acceptance Criteria**: GET lists available cards (seasonal filtering), POST buys cards (validation + transaction)
- **Files**: src/app/api/shop/route.ts
- **Tests**: None
- **Manual Verification**: Visit /api/shop, buy card, verify coins deducted

### [x] M11.6: Collection API + players API update
- **Acceptance Criteria**: GET returns all 28 cards with ownership status, players API includes coins
- **Files**: src/app/api/players/[id]/collection/route.ts, src/app/api/players/route.ts
- **Tests**: None
- **Manual Verification**: Check collection endpoint, verify coins in player list

### [x] M11.7: Card shop UI
- **Acceptance Criteria**: Dark theme, cards grouped by tier, seasonal badges, buy confirmation, coin balance
- **Files**: src/app/shop/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Browse shop, buy card, see balance update

### [x] M11.8: Collection UI
- **Acceptance Criteria**: All 28 cards displayed, owned in color / unowned grayed, progress bar, rarity filters, card detail modal
- **Files**: src/app/account/collection/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: View collection, filter by rarity, tap card for detail

### [x] M11.9: Game end + player profile coin display
- **Acceptance Criteria**: Coins shown on END screen, repeat play notice, coin balance + Shop/Collection links on player profile
- **Files**: src/app/play/[sessionId]/page.tsx, src/app/account/players/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Finish game, see coins earned; check player profile for links

---

## M12 — Daily Spin Wheel

### [x] M12.1: Add daily spin tracking to Player model
- **Acceptance Criteria**: lastSpinDate field on Player
- **Files**: prisma/schema.prisma
- **Tests**: None
- **Manual Verification**: `npx prisma generate` succeeds, migration pending DB connection

### [x] M12.2: Implement spin wheel logic
- **Acceptance Criteria**: 7 weighted tiers (10-1000 coins, weights sum to 100), UTC day comparison
- **Files**: src/lib/rewards/spinWheel.ts, src/lib/rewards/__tests__/spinWheel.test.ts
- **Tests**: 14 unit tests (weights, boundaries, deterministic, canSpinToday, isSameUTCDay)
- **Manual Verification**: Multiple spins return valid prizes

### [x] M12.3: Build spin wheel UI
- **Acceptance Criteria**: CSS conic-gradient wheel, cubic-bezier spin animation, prize reveal
- **Files**: src/components/rewards/SpinWheel.tsx, src/app/spin/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: Wheel spins, prize shows

### [x] M12.4: Add one-spin-per-day enforcement
- **Acceptance Criteria**: Server-authoritative spin, 429 on duplicate, coins + lastSpinDate updated atomically
- **Files**: src/app/api/spin/route.ts
- **Tests**: Covered by spinWheel.test.ts canSpinToday tests
- **Manual Verification**: Spin once, try again, get denied
- **Navigation**: Daily Spin button added to account/players page, /spin added to protectedPaths

---

## M13 — AI Generation Usage Limits (Cost Control)

### [x] M13.1: Add AiGeneration tracking model
- **Acceptance Criteria**: AiGeneration model tracks each AI call per user, indexed by userId+createdAt
- **Files**: prisma/schema.prisma (AiGeneration model + User relation)
- **Tests**: None (schema only)
- **Manual Verification**: `npx prisma generate` succeeds
- **Migration pending**: `npx prisma migrate dev --name add_ai_generation_tracking`

### [x] M13.2: Add daily AI generation limit config
- **Acceptance Criteria**: `dailyAiGenerationLimit` in AppConfig, default 3, env var override, 0 = disabled
- **Files**: src/lib/config.ts
- **Tests**: None (config)

### [x] M13.3: Implement usage checking + recording
- **Acceptance Criteria**: getAiUsage() counts today's generations, recordAiGeneration() creates records
- **Files**: src/lib/limits/usage.ts
- **Tests**: 8 unit tests (getUTCDayStart, getAiUsage under/at/over limit, limit disabled, recordAiGeneration)
- **Manual Verification**: None (tested via unit tests)

### [x] M13.4: Enforce limit in AI generate API
- **Acceptance Criteria**: Returns 429 when daily limit reached, records after success, includes usage in response
- **Files**: src/app/api/ai/generate/route.ts
- **Tests**: Covered by M13.3 unit tests
- **Manual Verification**: Generate 3 times, 4th returns 429

### [x] M13.5: Usage info API endpoint
- **Acceptance Criteria**: GET /api/usage returns current AI usage for authenticated user
- **Files**: src/app/api/usage/route.ts
- **Tests**: None (simple endpoint)
- **Manual Verification**: Fetch /api/usage, see correct counts

### [x] M13.6: Show remaining generations in UI
- **Acceptance Criteria**: Generate page shows "X of Y remaining", disables button at 0
- **Files**: src/app/games/quiz/host/sets/generate/page.tsx
- **Tests**: None (UI)
- **Manual Verification**: See counter decrease after each generation, button disabled at 0

---

## Current Status

**Current Task**: M13 COMPLETE! AI generation daily limits for cost control.
**Next Up**: TBD
**Note**: Run `npx prisma migrate dev --name add_chat_and_spin` when DB is available (covers M10 ChatMessage + M12 lastSpinDate). Also pending: `npx prisma migrate dev --name add_coins_cards_system` and `npx tsx prisma/seed-cards.ts` from M11. Also pending: `npx prisma migrate dev --name add_ai_generation_tracking` from M13.

**Production URL**: https://bookit-production-5539.up.railway.app

**Last Updated**: 2026-02-06

### Completed Milestones:
- **M0**: Project Bootstrap ✓
- **M1**: Walking Skeleton (rooms, roster, realtime) ✓
- **M2**: Question Set CRUD ✓
- **M3**: Gameplay Loop (classic mode) ✓
- **M4**: Resilience & Correctness ✓
- **M5**: Deployment (Railway) ✓
- **M7**: User Authentication ✓
- **M8**: AI Question Generation ✓ (switched to Haiku for cost savings)
- **M9**: Spelling Mode ✓
- **M10**: Chat Forum (Global + In-Game) ✓
- **M11**: Gold Coins & Trading Cards ✓
- **M12**: Daily Spin Wheel ✓
- **M13**: AI Generation Usage Limits ✓ (3/day default, server-authoritative)

### In Progress:
- **M6**: Post-MVP features (partial — M6.5 multi-game platform, M6.9 mobile polish done)
- **M14**: Soccer Stud Game ✓ (second game in registry — quiz + penalty kicks)

**Tests**: 313 passing
