# Arcjet Security Integration Guide

VoiceFlow AI uses [Arcjet](https://arcjet.com) for comprehensive API security, including bot protection, rate limiting, and attack prevention.

## Quick Start

### 1. Get Your API Key

1. Sign up at [https://app.arcjet.com](https://app.arcjet.com)
2. Create a new site/project
3. Copy your API key

### 2. Configure Environment

Add to `.env.local`:
```bash
ARCJET_KEY="your_arcjet_key_here"
```

### 3. Use in API Routes

```typescript
import { ajPublicAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajPublicAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Your logic here
}
```

## Available Configurations

We provide 5 pre-configured Arcjet instances in `src/lib/arcjet.ts`:

### 1. `aj` - Base Protection
**Use for:** Health checks, static content, non-sensitive endpoints

**Features:**
- Shield protection only
- No rate limiting
- No bot detection

```typescript
import { aj } from "@/lib/arcjet";

export async function GET(req: Request) {
  const decision = await aj.protect(req);
  // Handle decision...
}
```

### 2. `ajPublicAPI` - Public Endpoints
**Use for:** Public-facing APIs, unauthenticated routes

**Features:**
- Shield protection
- Bot detection (allows search engines)
- 20 requests per minute

```typescript
import { ajPublicAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajPublicAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Your logic
}
```

### 3. `ajAuthAPI` - Authenticated Endpoints
**Use for:** User-specific endpoints, dashboard APIs

**Features:**
- Shield protection
- 100 requests per minute
- No bot detection (users are authenticated)

```typescript
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajAuthAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Verify authentication
  // Process request
}
```

### 4. `ajSensitive` - Sensitive Operations
**Use for:** Authentication, password reset, payments, account deletion

**Features:**
- Shield protection
- Strict bot detection (blocks all bots)
- 5 requests per minute

```typescript
import { ajSensitive, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajSensitive.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Sensitive operation
}
```

### 5. `ajAI` - AI/Transcription Endpoints
**Use for:** Audio upload, transcription, AI processing

**Features:**
- Shield protection
- Bot detection (allows search engines)
- 10 requests per minute

```typescript
import { ajAI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajAI.protect(req, { requested: 2 }); // Cost 2 tokens
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // AI processing
}
```

## Rate Limit Summary

| Configuration | Capacity | Refill Rate | Requests/Min | Use Case |
|--------------|----------|-------------|--------------|----------|
| `aj` | N/A | N/A | Unlimited | Basic protection |
| `ajPublicAPI` | 20 | 10/min | ~20 | Public APIs |
| `ajAuthAPI` | 100 | 50/min | ~100 | Authenticated users |
| `ajSensitive` | 5 | 3/min | ~5 | Auth, payments |
| `ajAI` | 10 | 5/min | ~10 | AI processing |

## Token Costs

Different operations can cost different amounts of tokens:

```typescript
// Light operation (1 token - default)
const decision = await ajPublicAPI.protect(req);

// Medium operation (2 tokens)
const decision = await ajAI.protect(req, { requested: 2 });

// Heavy operation (5 tokens)
const decision = await ajAI.protect(req, { requested: 5 });
```

## Helper Function

The `handleArcjetDecision()` helper automatically handles common denial scenarios:

```typescript
import { ajPublicAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(req: Request) {
  const decision = await ajPublicAPI.protect(req);
  
  // Automatically handles:
  // - Rate limit exceeded (429)
  // - Bot detected (403)
  // - Shield violation (403)
  // - Hosting IP detected (403)
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Continue with your logic
}
```

## Real-World Examples

### Example 1: Audio Upload Endpoint

```typescript
// src/app/api/audio/upload/route.ts
import { ajAI, handleArcjetDecision } from "@/lib/arcjet";
import { z } from "zod";

const uploadSchema = z.object({
  audio: z.instanceof(File),
  title: z.string().min(1).max(255),
});

export async function POST(req: Request) {
  // Protect with AI configuration (costs 2 tokens due to heavy processing)
  const decision = await ajAI.protect(req, { requested: 2 });
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Validate input
  const formData = await req.formData();
  const result = uploadSchema.safeParse({
    audio: formData.get("audio"),
    title: formData.get("title"),
  });
  
  if (!result.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }
  
  // Process audio upload
  // ...
}
```

### Example 2: Login Endpoint

```typescript
// src/app/api/auth/login/route.ts
import { ajSensitive, handleArcjetDecision } from "@/lib/arcjet";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  // Protect with sensitive configuration (strict rate limiting)
  const decision = await ajSensitive.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Validate input
  const body = await req.json();
  const result = loginSchema.safeParse(body);
  
  if (!result.success) {
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 400,
    });
  }
  
  // Authenticate user
  // ...
}
```

### Example 3: Notes List Endpoint

```typescript
// src/app/api/notes/route.ts
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function GET(req: Request) {
  // Protect with authenticated configuration
  const decision = await ajAuthAPI.protect(req);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // Verify JWT token
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  
  // Fetch user's notes
  // ...
}
```

## Testing

### Test the Demo Endpoint

```bash
# Single request
curl http://localhost:3000/api/arcjet

# Test rate limiting (make 25 requests)
for i in {1..25}; do 
  curl http://localhost:3000/api/arcjet
  echo ""
done
```

### DRY_RUN Mode

For testing without blocking requests:

```typescript
import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/next";

const ajTest = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "DRY_RUN" }), // Logs only, doesn't block
    detectBot({ mode: "DRY_RUN" }),
    tokenBucket({ mode: "DRY_RUN", refillRate: 5, interval: 60, capacity: 10 }),
  ],
});
```

## Monitoring

Log Arcjet decisions for monitoring:

```typescript
const decision = await ajPublicAPI.protect(req);

console.log("Arcjet decision:", {
  allowed: !decision.isDenied(),
  reason: decision.reason,
  ip: decision.ip,
  ruleResults: decision.results,
});
```

## Best Practices

1. **Always use Arcjet protection** on all API routes
2. **Choose the right configuration** based on endpoint sensitivity
3. **Use token costs** to differentiate between light and heavy operations
4. **Log decisions** for monitoring and debugging
5. **Handle errors gracefully** with user-friendly messages
6. **Monitor rate limit hits** to adjust limits if needed
7. **Use DRY_RUN mode** when testing new configurations
8. **Test rate limits** before deploying to production

## Troubleshooting

### Rate Limit Too Strict

If users are hitting rate limits too often:

1. Increase capacity or refill rate in `src/lib/arcjet.ts`
2. Adjust token costs for specific operations
3. Consider using different configurations for different user tiers

### Bot Detection Issues

If legitimate users are being blocked:

1. Check if they're using VPNs or hosting IPs
2. Consider allowing more bot categories
3. Use `ajAuthAPI` for authenticated users (no bot detection)

### Shield False Positives

If legitimate requests are being blocked by shield:

1. Review the request patterns in Arcjet dashboard
2. Consider using DRY_RUN mode temporarily
3. Contact Arcjet support for assistance

## Additional Resources

- [Arcjet Documentation](https://docs.arcjet.com)
- [Bot List](https://arcjet.com/bot-list)
- [Rate Limiting Guide](https://docs.arcjet.com/rate-limiting)
- [Shield Protection](https://docs.arcjet.com/shield)
- [VoiceFlow AI Security Guidelines](.kiro/steering/security.md)

## Support

For issues or questions:
1. Check the [Arcjet Documentation](https://docs.arcjet.com)
2. Review `.kiro/steering/security.md` for project-specific guidelines
3. Contact Arcjet support at [https://arcjet.com/support](https://arcjet.com/support)
