---
inclusion: always
---
---
inclusion: always
---

# Security Requirements

## Mandatory Arcjet Protection

ALL API routes MUST include Arcjet protection as the first operation. Import from `@/lib/arcjet`.

### Arcjet Configuration Selection

Choose based on endpoint type:

- `aj` - Basic shield only (health checks, static content)
- `ajPublicAPI` - Public endpoints (20 req/min, allows search bots)
- `ajAuthAPI` - Authenticated endpoints (100 req/min)
- `ajSensitive` - Auth/payment operations (5 req/min, blocks all bots)
- `ajAI` - AI/transcription endpoints (10 req/min)

### Required Pattern for All API Routes

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(request: NextRequest) {
  // 1. REQUIRED: Arcjet protection FIRST
  const decision = await ajAuthAPI.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // 2. Better Auth session verification
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // 3. Then: validation, business logic (use session.user.id)
}
```

**Note**: For authentication patterns, see `better-auth.md` steering documentation.

### Token Costs for Heavy Operations

```typescript
// Default: 1 token
await ajAI.protect(req);

// Heavy operation: 2-5 tokens
await ajAI.protect(req, { requested: 2 });
```

### Rate Limit Reference

| Config | Capacity | Refill | Use Case |
|--------|----------|--------|----------|
| `ajPublicAPI` | 20 | 10/min | Public endpoints |
| `ajAuthAPI` | 100 | 50/min | Authenticated |
| `ajSensitive` | 5 | 3/min | Auth/payments |
| `ajAI` | 10 | 5/min | AI processing |

## Data Protection

### Encryption Requirements

- Audio files: AES-256-GCM encryption before storage
- Implementation: `lib/services/encryption.ts`
- Keys: User-controlled, stored as hashes

### Authentication

- **Better Auth** for authentication and session management
- Password hashing with `scrypt` (OWASP recommended)
- HTTP-only cookies for session tokens (prevents XSS)
- 7-day session expiry with automatic refresh
- Built-in CSRF protection
- Audit logging for GDPR compliance

See `better-auth.md` for detailed authentication patterns.

## Input Validation

- Zod schemas for ALL API inputs
- File upload validation: format, size, content type
- XSS prevention: sanitize user inputs

## Database Security

- Prisma ORM only (no raw SQL)
- Parameterized queries prevent SQL injection
- Connection pooling enabled

## GDPR Compliance

When handling user data:
- Audit log all data operations
- Support data export (JSON format)
- Support complete data deletion
- Store consent preferences
- Implement data retention policies