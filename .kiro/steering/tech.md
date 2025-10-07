---
inclusion: always
---

# VoiceFlow AI Technical Guidelines

## Required Technology Stack

### Frontend (Next.js 15 + React 19)

- Use App Router exclusively, no Pages Router
- TypeScript strict mode required for all files
- Audio recording: Web Audio API with MediaRecorder, Opus codec at 64 kbps
- Service Worker for PWA offline capabilities

### Backend & Data

- Vercel Edge Functions for API routes
- PostgreSQL with Prisma ORM (no raw SQL)
- S3-compatible storage with AES-256-GCM encryption
- Redis for AI response caching

### AI Services (Always Use Fallback Pattern)

```typescript
// Required pattern for all AI service calls
try {
  result = await deepgramService.transcribe(audio);
} catch (error) {
  result = await assemblyAIService.transcribe(audio);
}
```

## Mandatory Code Patterns

### API Route Structure

```typescript
// src/app/api/*/route.ts - Required structure
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(request: Request) {
  // 1. Arcjet security protection (REQUIRED)
  const decision = await ajAuthAPI.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // 2. Input validation with Zod schemas
  // 3. Authentication check
  // 4. Business logic via service layer
  // 5. Error handling with fallback
  // 6. Structured response
}

export async function POST(request: Request) {
  // 1. Arcjet protection check
  const decision = await aj.protect(request, { requested: 5 });
  if (decision.isDenied()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // 2. Input validation with Zod schemas
  // 3. Authentication check
  // 4. Business logic via service layer
  // 5. Error handling with fallback
  // 6. Structured response
}
```

### Service Layer Pattern

- All business logic in `src/lib/services/`
- Services must be stateless and dependency-injected
- Always implement interfaces for testability
- Include comprehensive error handling

### Error Handling Requirements

- Use typed errors with specific error codes
- Implement graceful degradation (AI → transcription-only)
- Always provide fallback mechanisms
- Include retry indicators in error responses

### Security Requirements

- **Arcjet Protection**: All API routes must use Arcjet security (see `src/lib/arcjet.ts`)
  - Use `ajPublicAPI` for public endpoints
  - Use `ajAuthAPI` for authenticated endpoints
  - Use `ajSensitive` for auth/payment operations
  - Use `ajAI` for AI/transcription endpoints
- Encrypt all audio files before storage using AES-256-GCM
- Validate all file uploads (format, size, content type)
- Use parameterized queries only (Prisma prevents SQL injection)
- Implement GDPR-compliant audit logging for all data operations
- **Arcjet Protection**: Apply to all public API endpoints
  - Shield protection for common attacks
  - Bot detection with search engine allowlist
  - Rate limiting with token bucket algorithm
  - Hosting IP and spoofed bot detection

## Performance Standards

### API Response Times

- P95 must be <500ms for all endpoints
- Database queries must use proper indexing
- Full-text search via PostgreSQL GIN indexes only
- CDN cache hit rate target: 99%

### Cost Optimization Rules

- Cache AI responses for similar content using Redis
- Monitor costs with alerts at $0.35/user threshold
- Implement usage caps per user tier
- Use intelligent model selection based on content complexity

## Development Commands

### Required Tools

- Package manager: `pnpm` (not npm or yarn)
- Database: Prisma CLI for all DB operations
- Testing: Vitest for unit tests, Artillery.js for performance

### Common Commands

```bash
pnpm run dev          # Development server
pnpm run build        # Production build
pnpm run test         # Run test suite
pnpm run lint         # ESLint check
pnpm run type-check   # TypeScript validation

npx prisma generate   # Generate Prisma client
npx prisma db push    # Push schema changes
npx prisma migrate dev # Create migration
```

## Code Quality Standards

### TypeScript Requirements

- Strict mode enabled in tsconfig.json
- No `any` types allowed
- All functions must have return type annotations
- Use proper type imports: `import type { ... }`

### Testing Requirements

- Unit tests for all service layer components
- Integration tests for audio processing pipeline
- Performance tests with Artillery.js
- Security tests for encryption and GDPR compliance

### File Organization

- Use absolute imports with `@/` path alias
- Components in `src/components/` with PascalCase naming
- Services in `src/lib/services/` with camelCase naming
- Types in `src/types/` with PascalCase interfaces
