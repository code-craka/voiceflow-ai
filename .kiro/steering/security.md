---
inclusion: always
---

# Security Guidelines for VoiceFlow AI

## Arcjet Security Integration

VoiceFlow AI uses Arcjet for comprehensive API security, including bot protection, rate limiting, and attack prevention.

### Required Configuration

**Environment Variable:**
```bash
ARCJET_KEY=your_arcjet_key_here
```

Get your key from: https://app.arcjet.com

### Arcjet Configurations

We maintain multiple Arcjet configurations in `src/lib/arcjet.ts` for different use cases:

#### 1. Base Configuration (`aj`)
Basic shield protection without rate limiting.

**Use for:** Static content, health checks, non-sensitive endpoints

```typescript
import { aj } from "@/lib/arcjet";

export async function GET(req: Request) {
  const decision = await aj.protect(req);
  // Handle decision...
}
```

#### 2. Public API Configuration (`ajPublicAPI`)
Shield + bot detection + moderate rate limiting (20 requests/minute)

**Use for:** Public-facing API endpoints, unauthenticated routes

**Rate Limits:**
- 20 token capacity
- Refills 10 tokens per 60 seconds
- Allows search engine bots

```typescript
import { ajPublicAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajPublicAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Your logic here
}
```

#### 3. Authenticated API Configuration (`ajAuthAPI`)
Shield + permissive rate limiting for logged-in users (100 requests/minute)

**Use for:** User-specific endpoints, dashboard APIs, authenticated operations

**Rate Limits:**
- 100 token capacity
- Refills 50 tokens per 60 seconds
- No bot detection (users are authenticated)

```typescript
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajAuthAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Your authenticated logic here
}
```

#### 4. Sensitive Operations Configuration (`ajSensitive`)
Shield + strict bot detection + strict rate limiting (5 requests/minute)

**Use for:** Authentication, password reset, payment processing, account deletion

**Rate Limits:**
- 5 token capacity
- Refills 3 tokens per 60 seconds
- Blocks all bots

```typescript
import { ajSensitive, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajSensitive.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Your sensitive operation here
}
```

#### 5. AI/Transcription Configuration (`ajAI`)
Shield + bot detection + balanced rate limiting (10 requests/minute)

**Use for:** Audio upload, transcription, AI processing endpoints

**Rate Limits:**
- 10 token capacity
- Refills 5 tokens per 60 seconds
- Allows search engine bots

```typescript
import { ajAI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajAI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Your AI processing logic here
}
```

### Helper Function

Use `handleArcjetDecision()` to automatically handle common denial scenarios:

```typescript
import { ajPublicAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajPublicAPI.protect(req);
  
  // Automatically handles rate limits, bots, shield blocks, and hosting IPs
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Continue with your logic
  return new Response(JSON.stringify({ success: true }));
}
```

### API Route Security Patterns

#### Pattern 1: Public Endpoint
```typescript
// src/app/api/public/route.ts
import { ajPublicAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function GET(req: Request) {
  const decision = await ajPublicAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Public logic
}
```

#### Pattern 2: Authenticated Endpoint
```typescript
// src/app/api/notes/route.ts
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajAuthAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // 1. Verify authentication
  // 2. Process request
}
```

#### Pattern 3: AI Processing Endpoint
```typescript
// src/app/api/transcription/route.ts
import { ajAI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajAI.protect(req, { requested: 2 }); // Cost 2 tokens
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Process audio/transcription
}
```

#### Pattern 4: Sensitive Operation
```typescript
// src/app/api/auth/login/route.ts
import { ajSensitive, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajSensitive.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Authentication logic
}
```

### Token Costs

You can specify token costs for different operations:

```typescript
// Light operation (1 token - default)
const decision = await ajPublicAPI.protect(req);

// Medium operation (2 tokens)
const decision = await ajAI.protect(req, { requested: 2 });

// Heavy operation (5 tokens)
const decision = await ajAI.protect(req, { requested: 5 });
```

### Rate Limit Summary

| Configuration | Capacity | Refill Rate | Use Case |
|--------------|----------|-------------|----------|
| `aj` | N/A | N/A | Basic protection only |
| `ajPublicAPI` | 20 | 10/min | Public endpoints |
| `ajAuthAPI` | 100 | 50/min | Authenticated users |
| `ajSensitive` | 5 | 3/min | Auth, payments |
| `ajAI` | 10 | 5/min | AI processing |

### Security Best Practices

1. **Always use Arcjet protection** on all API routes
2. **Choose the right configuration** based on endpoint sensitivity
3. **Use token costs** to differentiate between light and heavy operations
4. **Log Arcjet decisions** for monitoring and debugging
5. **Handle errors gracefully** with user-friendly messages
6. **Monitor rate limit hits** to adjust limits if needed
7. **Use DRY_RUN mode** when testing new configurations

### Testing Arcjet Protection

Test the demo endpoint:
```bash
# Single request
curl http://localhost:3000/api/arcjet

# Test rate limiting (make multiple requests)
for i in {1..25}; do curl http://localhost:3000/api/arcjet; echo ""; done
```

### Monitoring

Monitor Arcjet decisions in your logs:
```typescript
const decision = await ajPublicAPI.protect(req);
console.log("Arcjet decision:", {
  allowed: !decision.isDenied(),
  reason: decision.reason,
  ip: decision.ip,
});
```

### DRY_RUN Mode

For testing, use DRY_RUN mode to log decisions without blocking:

```typescript
import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/next";

const ajTest = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "DRY_RUN" }), // Logs only, doesn't block
    detectBot({ mode: "DRY_RUN" }),
    tokenBucket({ mode: "DRY_RUN", /* ... */ }),
  ],
});
```

### Additional Resources

- Arcjet Documentation: https://docs.arcjet.com
- Bot List: https://arcjet.com/bot-list
- Rate Limiting Guide: https://docs.arcjet.com/rate-limiting
- Shield Protection: https://docs.arcjet.com/shield

## Other Security Requirements

### Encryption
- All audio files must be encrypted with AES-256-GCM before storage
- User-controlled encryption keys stored as hashes
- See `src/lib/services/encryption.ts` for implementation

### Authentication
- JWT tokens for session management
- Secure password hashing with bcrypt
- GDPR-compliant audit logging

### Input Validation
- Use Zod schemas for all API inputs
- Validate file uploads (format, size, content type)
- Sanitize user inputs to prevent XSS

### Database Security
- Use Prisma ORM (prevents SQL injection)
- Parameterized queries only
- Connection pooling for performance

### HTTPS/TLS
- TLS 1.3 required for all communications
- Secure headers configured in Next.js
- HSTS enabled in production
