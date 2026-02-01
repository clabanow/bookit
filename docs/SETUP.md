# Development Setup

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+ (local or managed)
- Redis 7+ (optional for dev, required for prod)

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd bookit
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database URL

# Setup database
npx prisma generate
npx prisma migrate dev

# Run development server
npm run dev
```

Visit http://localhost:3000

## Environment Variables

Create a `.env` file (see `.env.example` for full documentation):

```env
# Environment
NODE_ENV="development"

# Database (required)
DATABASE_URL="postgresql://user:password@localhost:5432/bookit?schema=public"

# Session Store
SESSION_STORE_TYPE="memory"  # Use "redis" for production
REDIS_URL="redis://localhost:6379"  # Required if SESSION_STORE_TYPE=redis

# Security
CORS_ORIGIN="*"  # Set specific domain(s) in production
RATE_LIMIT_ENABLED="true"

# Client URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

See `.env.example` for detailed documentation of all variables.

## Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run format:check # Check formatting
npm run typecheck    # TypeScript type checking
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## Database Setup

### Local PostgreSQL

```bash
# Create database
createdb bookit

# Run migrations
npx prisma migrate dev

# View database (optional)
npx prisma studio
```

### Using Docker

```bash
docker run --name bookit-postgres \
  -e POSTGRES_USER=bookit \
  -e POSTGRES_PASSWORD=bookit \
  -e POSTGRES_DB=bookit \
  -p 5432:5432 \
  -d postgres:14
```

## Redis Setup (Optional for Dev)

For development, the app uses an in-memory session store. For production-like testing:

```bash
# Local Redis
redis-server

# Or Docker
docker run --name bookit-redis -p 6379:6379 -d redis:7
```

## Manual Testing

### Test Room Creation

1. Open http://localhost:3000/host
2. Create a question set (or use seeded data)
3. Click "Create Room"
4. Note the room code

### Test Player Join

1. Open http://localhost:3000/join in incognito/another browser
2. Enter the room code
3. Enter a nickname
4. Click "Join"
5. Verify player appears in host roster

### Test Full Game Flow

1. Create room with host
2. Join with 2-3 players (use multiple browsers/tabs)
3. Host clicks "Start Game"
4. Players answer questions
5. Verify:
   - Questions appear for all players
   - Answers can only be submitted once
   - Correct answer revealed after timeout
   - Leaderboard shows correct scores
   - Final standings shown at end

## Troubleshooting

### Socket connection fails

- Check `NEXT_PUBLIC_SOCKET_URL` matches your server
- Ensure no firewall blocking WebSocket connections
- Check browser console for CORS errors

### Database connection fails

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database exists: `psql -l`

### Prisma errors

```bash
# Regenerate client
npx prisma generate

# Reset database (DELETES ALL DATA)
npx prisma migrate reset
```

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```
