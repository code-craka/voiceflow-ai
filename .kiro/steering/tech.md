---
inclusion: always
---

# Technical Guidelines

## Technology Stack

### Core Framework

- Next.js 15 App Router (no Pages Router)
- React 19 with TypeScript strict mode
- Package manager: `pnpm` only

### Backend & Data

- PostgreSQL with Prisma ORM (no raw SQL queries)
- Redis for caching AI responses
- S3-compatible storage with AES-256-GCM encryption

### Authentication & Security

- **Better Auth** for authentication and session management
- Arcjet for API security (rate limiting, bot protection, shield)
- See `better-auth.md` for authentication patterns

### AI Services

- Deepgram Nova-2 (primary transcription)
- AssemblyAI (fallback transcription)
- OpenAI GPT-4o (content processing)

## Critical Patterns

### AI Service Fallback (REQUIRED)

Always implement fallback for AI services:

```typescript
try {
  result = await deepgramService.transcribe(audio);
} catch (error) {
  result = await assemblyAIService.transcribe(audio);
}
```

### API Route Structure (REQUIRED)

All API routes must follow this exact order:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';

export async function POST(request: NextRequest) {
  // 1. Arcjet protection FIRST (see security.md for config selection)
  const decision = await ajAuthAPI.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // 2. Better Auth session verification
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Input validation with Zod schemas
  // 4. Business logic via service layer (use session.user.id)
  // 5. Error handling with fallback
  // 6. Structured response
}
```

### Service Layer

- All business logic in `lib/services/`
- Services are stateless with dependency injection
- Implement interfaces for testability
- Include comprehensive error handling

## TypeScript Standards

- Strict mode enabled (no `any` types)
- Return type annotations required on all functions
- Use type imports: `import type { ... }`
- Path alias: `@/` for absolute imports (maps to project root, NOT `src/`)

## Performance Requirements

- API P95 response time: <500ms
- Database queries must use proper indexing
- Full-text search via PostgreSQL GIN indexes
- Cache AI responses in Redis for similar content

## Development Commands

```bash
pnpm run dev          # Development server
pnpm run build        # Production build
pnpm run test         # Run test suite

npx prisma generate   # Generate Prisma client
npx prisma migrate dev # Create migration
```

## File Naming Conventions

- Components: PascalCase (`AudioRecorder.tsx`)
- Services: camelCase (`transcriptionService.ts`)
- Types: PascalCase interfaces (`AudioRecordingResult`)
- API routes: kebab-case directories with `route.ts`

## Import Order

1. React and Next.js
2. Third-party libraries
3. Internal services (`@/lib/services/`)
4. Components (`@/components/`)
5. Types (`@/types/`)
6. Relative imports
