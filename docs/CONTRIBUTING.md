# Contributing Guide

## Development Workflow

### Before Starting Work

1. Check `/TODO.md` for the current task
2. Read the task's acceptance criteria
3. Update task status to indicate you're working on it

### Making Changes

1. Create a feature branch: `git checkout -b feature/task-name`
2. Make small, focused commits
3. Run checks before committing:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```
4. Update documentation if needed
5. Update `/TODO.md` to mark task complete

### Commit Messages

Use conventional commits:

```
feat: add player join functionality
fix: prevent duplicate answer submission
docs: update realtime protocol spec
test: add scoring unit tests
refactor: extract session store interface
chore: update dependencies
```

### Pull Requests

- Reference the TODO item in PR description
- Include manual testing steps
- Ensure CI passes
- Keep PRs small and focused

## Code Standards

### TypeScript

- Enable strict mode
- Prefer interfaces over types for objects
- Export types from dedicated files
- Use `unknown` over `any`

### React Components

- Use function components with hooks
- Colocate styles with components
- Extract reusable components to `/components`
- Page components in `/app` should be thin

### State Management

- Server state: React Query or SWR (future)
- UI state: useState/useReducer
- Real-time: Socket.IO events

### Testing

- Unit tests for pure functions
- Integration tests for API routes
- Test files next to source: `foo.ts` → `foo.test.ts`
- Use descriptive test names

### Styling

- Use Tailwind utility classes
- Avoid custom CSS unless necessary
- Use shadcn/ui components where possible
- Mobile-first responsive design

## Architecture Rules

### Server Authority

All game logic must be server-authoritative:

```typescript
// WRONG: Client decides if answer is correct
const isCorrect = selectedIndex === correctIndex;
socket.emit('answer', { isCorrect });

// RIGHT: Client just sends selection
socket.emit('player:submit_answer', { answerIndex: selectedIndex });
// Server validates and scores
```

### Session Store Interface

When touching session logic, use the interface:

```typescript
// WRONG: Direct Redis/memory access
const session = await redis.get(`session:${id}`);

// RIGHT: Use store interface
const session = await sessionStore.getSession(id);
```

### Phase Validation

Always validate phase before actions:

```typescript
// WRONG: Assume phase is correct
handleAnswer(answer);

// RIGHT: Validate phase first
if (session.phase !== 'QUESTION') {
  throw new Error('INVALID_PHASE');
}
handleAnswer(answer);
```

## File Organization

```
src/
├── app/                 # Next.js routes
│   ├── api/            # API routes
│   ├── host/           # Host pages
│   ├── join/           # Join page
│   └── play/           # Player game view
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── host/           # Host-specific
│   ├── play/           # Player-specific
│   └── shared/         # Shared components
├── lib/                 # Core logic
│   ├── realtime/       # Socket handlers
│   ├── session/        # Session store
│   ├── stateMachine/   # Game phases
│   ├── scoring/        # Scoring logic
│   └── validation/     # Input validation
└── server/              # Server-specific code
```

## Adding New Features

1. Document in TODO.md first
2. Update ARCHITECTURE.md if needed
3. Update REALTIME_PROTOCOL.md for new events
4. Write tests before or alongside code
5. Manual test the happy path
6. Handle edge cases

## Questions?

Check existing ADRs in `/docs/adr/` for past decisions.
