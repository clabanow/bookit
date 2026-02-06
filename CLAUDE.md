# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Learning Mode

**The developer is a beginner learning full-stack development through this project.**

When implementing features:
- Explain *why* we're doing things, not just *what*
- Briefly describe new concepts (e.g., WebSockets, state machines) when first introduced
- Point out common patterns and best practices as they come up
- Keep explanations concise but educational

## Project Overview

Mack & Lex Games is a multi-game platform for fun and learning. The first game is Bookit Quiz — a live classroom quiz where hosts create rooms, players join via code, answer timed questions, and compete on a leaderboard. The platform is designed so new game genres can be added via the game registry.

## Development Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix lint issues
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run typecheck    # TypeScript type check
npm run test         # Run Vitest tests
npm run test:watch   # Run tests in watch mode

# Database
npx prisma generate  # Generate Prisma client
npx prisma migrate dev  # Run migrations (requires DATABASE_URL)
npx prisma studio    # Open database GUI
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Database**: PostgreSQL + Prisma 7
- **Realtime**: Socket.IO (to be added)
- **Testing**: Vitest
- **Linting**: ESLint 9, Prettier

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # REST API routes
│   ├── games/
│   │   └── quiz/          # Bookit Quiz game
│   │       ├── host/      # Host pages (lobby, sets)
│   │       ├── join/      # Player join page
│   │       └── play/[sessionId]/  # Player game view
│   ├── chat/              # Global chat
│   ├── shop/              # Card shop
│   └── spin/              # Daily spin
├── components/
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── db.ts             # Prisma client
│   ├── games/            # Game registry (multi-game config)
│   ├── session/          # Session store (memory/Redis)
│   ├── stateMachine/     # Game phase management
│   ├── scoring/          # Scoring logic
│   ├── realtime/         # Socket handlers
│   └── validation/       # Input validation
└── test/                  # Test setup

prisma/
└── schema.prisma         # Database schema

docs/
├── PRD.md               # Product requirements
├── ARCHITECTURE.md      # System design
├── REALTIME_PROTOCOL.md # Socket event specs
├── SETUP.md             # Dev setup guide
└── adr/                 # Architecture decisions
```

## Key Patterns

### Server-Authoritative
All game logic runs server-side. Clients send actions (e.g., answer index), server validates and updates state.

### State Machine Phases
Game progresses: LOBBY → COUNTDOWN → QUESTION → REVEAL → LEADERBOARD → (repeat) → END

### Session Store Interface
Abstract interface allows swapping between in-memory (dev) and Redis (prod).

## Non-negotiable Rules

1. **Server-authoritative** - Never trust client for scoring or state transitions
2. **Small slices** - Each task ≤1-2 hours, ends with verification
3. **Update TODO.md** - Before coding: scope, acceptance criteria. After: mark complete.
4. **Run checks** - Always run `npm run lint && npm run typecheck && npm run test` before declaring done
5. **Schema discipline** - Don't change Prisma schema without explicit request

## Working Style

- Check `/TODO.md` for current task
- Work sequentially through backlog
- Test manually after implementation
- Document decisions in `/docs/adr/` when non-trivial
