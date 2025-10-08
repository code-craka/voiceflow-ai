---
inclusion: always
---

# Better Auth Migration Guidelines

## Overview

VoiceFlow AI uses **Better Auth** for authentication, replacing the previous custom JWT implementation. Better Auth is a comprehensive, framework-agnostic authentication library with built-in security, session management, and extensibility.

## Core Architecture

### Better Auth Server Instance

Location: `lib/auth.ts`

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});
```

### Better Auth Client Instance

Location: `lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

## Critical Patterns

### API Route Protection (REQUIRED)

All protected API routes MUST follow this exact pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(request: NextRequest) {
  // 1. Arcjet protection FIRST (see security.md)
  const decision = await ajAuthAPI.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // 2. Better Auth session verification
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // 3. Check authentication
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // 4. Business logic with session.user.id
  const userId = session.user.id;
  
  // 5. Your business logic here
}
```

**NEVER skip Arcjet protection or session verification!**

### User Registration Pattern

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateEncryptionKey, hashEncryptionKey } from "@/lib/services/encryption";
import { createAuditLog } from "@/lib/services/audit";

export async function registerUser(
  email: string,
  password: string,
  gdprConsent: GDPRConsent,
  ipAddress?: string
) {
  // 1. Generate encryption key for user
  const encryptionKey = generateEncryptionKey();
  const encryptionKeyHash = hashEncryptionKey(encryptionKey);

  // 2. Create user with Better Auth
  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: email.split("@")[0],
    },
  });

  if (!result.data?.user) {
    throw new Error("Failed to create user");
  }

  // 3. Update user with custom fields
  await prisma.user.update({
    where: { id: result.data.user.id },
    data: {
      encryptionKeyHash,
      gdprConsent: {
        ...gdprConsent,
        consentedAt: new Date(),
        ipAddress,
      },
    },
  });

  // 4. Create audit log
  await createAuditLog({
    userId: result.data.user.id,
    action: "USER_REGISTERED",
    resourceType: "user",
    resourceId: result.data.user.id,
    details: { email, gdprConsent },
    ipAddress,
  });

  return {
    user: result.data.user,
    session: result.data.session,
    encryptionKey,
  };
}
```

### Client-Side Authentication

#### Sign Up Component

```typescript
"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0],
      callbackURL: "/dashboard",
    }, {
      onSuccess: () => {
        router.push("/dashboard");
      },
      onError: (ctx) => {
        setError(ctx.error.message);
      },
    });
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}
```

#### Sign In Component

```typescript
"use client";

import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    }, {
      onSuccess: () => {
        router.push("/dashboard");
      },
      onError: (ctx) => {
        setError(ctx.error.message);
      },
    });
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}
```

#### Session Hook Usage

```typescript
"use client";

import { authClient } from "@/lib/auth-client";

export function UserProfile() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session?.user) return <div>Not authenticated</div>;

  return (
    <div>
      <p>Email: {session.user.email}</p>
      <button onClick={() => authClient.signOut()}>Sign Out</button>
    </div>
  );
}
```

## Database Schema

### Better Auth Tables

```prisma
model User {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name              String    @db.VarChar(255)
  email             String    @unique @db.VarChar(255)
  emailVerified     Boolean   @default(false) @map("email_verified")
  image             String?   @db.Text
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  // Custom fields (VoiceFlow AI specific)
  encryptionKeyHash String    @map("encryption_key_hash") @db.VarChar(255)
  gdprConsent       Json      @map("gdpr_consent")

  // Relations
  sessions          Session[]
  accounts          Account[]
  notes             Note[]
  folders           Folder[]
  tags              Tag[]
  auditLogs         AuditLog[]

  @@map("user")
}

model Session {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  expiresAt DateTime @map("expires_at") @db.Timestamptz(6)
  token     String   @unique @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  ipAddress String?  @map("ip_address") @db.VarChar(45)
  userAgent String?  @map("user_agent") @db.Text
  userId    String   @map("user_id") @db.Uuid

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("session")
}

model Account {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  accountId         String   @map("account_id") @db.VarChar(255)
  providerId        String   @map("provider_id") @db.VarChar(255)
  userId            String   @map("user_id") @db.Uuid
  accessToken       String?  @map("access_token") @db.Text
  refreshToken      String?  @map("refresh_token") @db.Text
  idToken           String?  @map("id_token") @db.Text
  accessTokenExpiresAt DateTime? @map("access_token_expires_at") @db.Timestamptz(6)
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at") @db.Timestamptz(6)
  scope             String?  @db.Text
  password          String?  @db.Text
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  identifier String   @db.VarChar(255)
  value      String   @db.Text
  expiresAt  DateTime @map("expires_at") @db.Timestamptz(6)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@unique([identifier, value])
  @@map("verification")
}
```

## Environment Variables

### Required Variables

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"    # Production: https://yourdomain.com

# Client-side (public)
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
```

### Migration from Old System

**REMOVE these old variables:**
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

**ADD these new variables:**
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BETTER_AUTH_URL`

## Security Features

### Built-in Security

- **Password Hashing**: Uses `scrypt` (OWASP recommended)
- **Session Management**: HTTP-only cookies prevent XSS
- **CSRF Protection**: Built-in CSRF token validation
- **Session Expiry**: 7-day expiry with automatic refresh
- **Secure Cookies**: Enabled in production automatically

### Integration with Arcjet

Better Auth works seamlessly with Arcjet security:

```typescript
// Arcjet protects the auth endpoints
export async function POST(request: NextRequest) {
  // Arcjet rate limiting and bot protection
  const decision = await ajSensitive.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // Better Auth handles authentication
  const session = await auth.api.getSession({ headers: request.headers });
  
  // Your business logic
}
```

## Error Handling

### Common Error Codes

```typescript
const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_EXISTS: "User already exists",
  WEAK_PASSWORD: "Password must be at least 8 characters",
  SESSION_EXPIRED: "Session has expired, please log in again",
  UNAUTHORIZED: "You must be logged in to access this resource",
};
```

### Client-Side Error Handling

```typescript
const { data, error } = await authClient.signIn.email({
  email,
  password,
}, {
  onError: (ctx) => {
    if (ctx.error.status === 401) {
      setError("Invalid credentials");
    } else if (ctx.error.status === 429) {
      setError("Too many attempts, please try again later");
    } else {
      setError(ctx.error.message);
    }
  },
});
```

### Server-Side Error Handling

```typescript
try {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Business logic
} catch (error) {
  console.error("Session error:", error);
  return NextResponse.json(
    { error: "Authentication failed" },
    { status: 500 }
  );
}
```

## TypeScript Types

### Session Type

```typescript
import type { Session } from "@/lib/auth";

// Session structure
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    userId: string;
  };
}
```

### Custom Types

```typescript
// Preserve custom types for VoiceFlow AI
interface GDPRConsent {
  dataProcessing: boolean;
  marketing: boolean;
  analytics: boolean;
  consentedAt?: Date;
  ipAddress?: string;
}

interface UserWithCustomFields {
  id: string;
  email: string;
  name: string;
  encryptionKeyHash: string;
  gdprConsent: GDPRConsent;
}
```

## Migration Checklist

When implementing Better Auth features:

- [ ] Use `auth.api.getSession()` for server-side session verification
- [ ] Use `authClient.useSession()` for client-side reactive session state
- [ ] Always include Arcjet protection before session checks
- [ ] Preserve custom fields (encryptionKeyHash, gdprConsent)
- [ ] Maintain audit logging for authentication events
- [ ] Use proper error handling with user-friendly messages
- [ ] Test session expiry and refresh behavior
- [ ] Verify GDPR compliance is maintained

## Common Mistakes to Avoid

1. **DON'T** use custom JWT verification - use Better Auth sessions
2. **DON'T** skip Arcjet protection on auth endpoints
3. **DON'T** forget to check `session?.user` before accessing user data
4. **DON'T** use bcrypt directly - Better Auth handles password hashing
5. **DON'T** create custom session management - use Better Auth's built-in system
6. **DON'T** forget to preserve custom fields when creating users
7. **DON'T** skip audit logging for authentication events

## Testing Patterns

### Unit Test Example

```typescript
describe("Better Auth Integration", () => {
  it("should register a new user", async () => {
    const result = await registerUser(
      "test@example.com",
      "password123",
      mockGDPRConsent,
      "127.0.0.1"
    );
    
    expect(result.user).toBeDefined();
    expect(result.session).toBeDefined();
    expect(result.encryptionKey).toBeDefined();
  });

  it("should verify session on protected routes", async () => {
    const headers = new Headers();
    headers.set("cookie", `better-auth.session_token=${sessionToken}`);
    
    const session = await auth.api.getSession({ headers });
    expect(session?.user).toBeDefined();
  });
});
```

## Future Enhancements

Better Auth's plugin system enables easy addition of:

- **Two-Factor Authentication**: Add 2FA plugin
- **OAuth Providers**: Google, GitHub, Apple sign-in
- **Magic Links**: Passwordless authentication
- **Passkeys**: WebAuthn support
- **Multi-Session**: Multiple device sessions

## Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
- [Prisma Adapter Docs](https://www.better-auth.com/docs/adapters/prisma)
- [Next.js Integration](https://www.better-auth.com/docs/integrations/next-js)
