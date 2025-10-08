# Authentication & GDPR Compliance

## Overview

This document describes the authentication and GDPR compliance implementation for VoiceFlow AI. The application uses **Better Auth**, a comprehensive authentication framework for TypeScript, providing secure email/password authentication, session management, and extensibility.

## Authentication System

### Better Auth Overview

VoiceFlow AI uses Better Auth for all authentication operations:

- **Framework**: Better Auth with Prisma adapter
- **Database**: PostgreSQL with Better Auth core tables
- **Password Hashing**: scrypt (OWASP recommended)
- **Session Storage**: HTTP-only cookies (prevents XSS attacks)
- **Session Expiry**: 7 days with automatic refresh
- **CSRF Protection**: Built-in token validation

### Authentication Flow

#### User Registration

Better Auth handles user registration through the unified auth API:

- **Endpoint**: `POST /api/auth/sign-up/email`
- **Security**: Arcjet sensitive operations protection
- **Features**:
  - Email/password authentication
  - Automatic encryption key generation per user
  - Password hashing with scrypt (OWASP recommended)
  - GDPR consent collection during registration
  - Audit logging for compliance
  - Automatic session creation on successful registration

**Registration Process**:
1. User submits email, password, and GDPR consent
2. Better Auth creates user account with hashed password
3. System generates user-specific encryption key
4. Custom fields (encryptionKeyHash, gdprConsent) are added to user record
5. Audit log entry is created
6. Session is automatically created and returned

#### User Login

- **Endpoint**: `POST /api/auth/sign-in/email`
- **Security**: Arcjet sensitive operations protection
- **Features**:
  - Email/password authentication
  - Automatic session creation (7-day expiry)
  - HTTP-only cookie for session token
  - Audit logging

**Login Process**:
1. User submits email and password
2. Better Auth verifies credentials
3. Session is created with HTTP-only cookie
4. Audit log entry is created
5. User is redirected to dashboard

#### Session Management

- **Storage**: HTTP-only cookies (secure, prevents XSS)
- **Expiry**: 7 days with automatic refresh every 24 hours
- **Verification**: Server-side session validation on every request
- **Token**: Encrypted session token in cookie
- **Logout**: Session invalidation and cookie removal

## API Endpoints

### Better Auth Endpoints

All Better Auth endpoints are handled through a catch-all route:

- **Base Path**: `/api/auth/*`
- **Handler**: `app/api/auth/[...all]/route.ts`

**Available Endpoints**:

- `POST /api/auth/sign-up/email` - Register new user
- `POST /api/auth/sign-in/email` - Login user
- `POST /api/auth/sign-out` - Logout user
- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/update-user` - Update user profile

### GDPR Compliance Endpoints

#### Consent Management
- **Endpoint**: `GET /api/gdpr/consent` - Get current consent
- **Endpoint**: `PUT /api/gdpr/consent` - Update consent
- **Authentication**: Required (Better Auth session)
- **Features**:
  - Data processing consent
  - Voice recording consent
  - AI processing consent
  - IP address tracking
  - Audit trail

#### Data Export
- **Endpoint**: `GET /api/gdpr/export`
- **Authentication**: Required (Better Auth session)
- **Format**: JSON
- **Includes**:
  - User profile data
  - All notes with transcriptions
  - Folders and tags
  - Complete audit logs
  - Export timestamp

#### Data Deletion
- **Endpoint**: `DELETE /api/gdpr/delete`
- **Authentication**: Required (Better Auth session)
- **Features**:
  - Permanent deletion of all user data
  - Cascading deletes (notes, folders, tags, sessions)
  - Audit trail before and after deletion
  - 30-day compliance window

## Security Features

### Password Security
- **Hashing Algorithm**: scrypt (OWASP recommended)
- **Strength Requirements**: Minimum 8 characters (configurable)
- **Storage**: Passwords stored in `account` table, never in plain text
- **Migration**: Existing bcrypt hashes are re-hashed on first login

### Session Security
- **Storage**: HTTP-only cookies (prevents XSS attacks)
- **Encryption**: Session tokens are encrypted
- **Expiry**: 7-day expiry with automatic refresh every 24 hours
- **CSRF Protection**: Built-in CSRF token validation
- **Secure Cookies**: Automatically enabled in production

### Encryption
- AES-256-GCM for audio files
- User-controlled encryption keys
- PBKDF2 for encryption key derivation

### API Protection
- Arcjet security on all endpoints (applied before session verification)
- Rate limiting (5 requests/minute for sensitive ops)
- Bot detection and blocking
- Shield protection against common attacks

### Audit Logging
- All authentication events (registration, login, logout)
- GDPR consent changes
- Data export requests
- Data deletion operations
- IP address and user agent tracking

## TypeScript Type Definitions

### Better Auth Types

Better Auth provides type-safe session and user types:

#### Session Type
```typescript
import type { Session } from "@/lib/auth";

// Session structure from Better Auth
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

The application extends Better Auth with custom types defined in `types/auth.ts`:

#### GDPRConsent
```typescript
interface GDPRConsent {
  dataProcessing: boolean;
  voiceRecording: boolean;
  aiProcessing: boolean;
  consentedAt: Date;
  ipAddress?: string;
}
```

#### UserWithCustomFields
```typescript
interface UserWithCustomFields {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  encryptionKeyHash: string;
  gdprConsent: GDPRConsent;
  createdAt: Date;
  updatedAt: Date;
}
```

#### UserWithEncryptionKey
```typescript
interface UserWithEncryptionKey extends UserWithCustomFields {
  encryptionKey: string; // Decrypted key for user operations
}
```

### Request Types

#### UserRegistrationRequest
```typescript
interface UserRegistrationRequest {
  email: string;
  password: string;
  gdprConsent: GDPRConsent;
}
```

#### UserLoginRequest
```typescript
interface UserLoginRequest {
  email: string;
  password: string;
  callbackURL?: string;
}
```

## Database Schema

### Better Auth Tables

#### User Model
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
```

#### Session Model
```prisma
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
```

#### Account Model
```prisma
model Account {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  accountId         String   @map("account_id") @db.VarChar(255)
  providerId        String   @map("provider_id") @db.VarChar(255)
  userId            String   @map("user_id") @db.Uuid
  password          String?  @db.Text  // Hashed password for email/password auth
  // OAuth fields (for future use)
  accessToken       String?  @map("access_token") @db.Text
  refreshToken      String?  @map("refresh_token") @db.Text
  idToken           String?  @map("id_token") @db.Text
  accessTokenExpiresAt DateTime? @map("access_token_expires_at") @db.Timestamptz(6)
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at") @db.Timestamptz(6)
  scope             String?  @db.Text
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
  @@map("account")
}
```

#### Verification Model
```prisma
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

### Audit Log Model
```prisma
model AuditLog {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String?  @map("user_id") @db.Uuid
  action       String   @db.VarChar(255)
  resourceType String   @map("resource_type") @db.VarChar(255)
  resourceId   String?  @map("resource_id") @db.Uuid
  details      Json?
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent") @db.Text
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([createdAt])
  @@map("audit_log")
}
```

## Usage Examples

### Server-Side Usage

#### Protecting API Routes

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(request: NextRequest) {
  // 1. Arcjet protection FIRST
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

  // 4. Business logic with authenticated user
  const userId = session.user.id;
  
  // Your business logic here
  return NextResponse.json({ success: true });
}
```

#### User Registration (Server-Side)

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateEncryptionKey, hashEncryptionKey } from "@/lib/services/encryption";

export async function registerUser(
  email: string,
  password: string,
  gdprConsent: GDPRConsent
) {
  // Generate encryption key
  const encryptionKey = generateEncryptionKey();
  const encryptionKeyHash = hashEncryptionKey(encryptionKey);

  // Create user with Better Auth
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

  // Update with custom fields
  await prisma.user.update({
    where: { id: result.data.user.id },
    data: {
      encryptionKeyHash,
      gdprConsent,
    },
  });

  return {
    user: result.data.user,
    session: result.data.session,
    encryptionKey,
  };
}
```

### Client-Side Usage

#### Sign Up Component

```typescript
"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await authClient.signUp.email({
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

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

#### Sign In Component

```typescript
"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();

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

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
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
      <button onClick={() => authClient.signOut()}>
        Sign Out
      </button>
    </div>
  );
}
```

### API Examples

#### Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "user"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

#### Get Session
```bash
curl -X GET http://localhost:3000/api/auth/get-session \
  -b cookies.txt
```

#### Export User Data
```bash
curl -X GET http://localhost:3000/api/gdpr/export \
  -b cookies.txt
```

#### Delete User Data
```bash
curl -X DELETE http://localhost:3000/api/gdpr/delete \
  -b cookies.txt
```

## Setup Instructions

### 1. Install Better Auth

```bash
pnpm add better-auth
```

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"    # Production: https://yourdomain.com

# Client-side (public)
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
```

### 3. Run Database Migrations

```bash
pnpm db:migrate dev --name add_better_auth_tables
```

### 4. Generate Prisma Client

```bash
pnpm db:generate
```

### 5. Verify Setup

The Better Auth server instance is configured in `lib/auth.ts` and the client instance in `lib/auth-client.ts`. All authentication endpoints are handled through `/api/auth/[...all]/route.ts`.

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

## Migration from Old System

If migrating from a previous JWT-based system:

1. **Remove old dependencies**: `jsonwebtoken`, `bcryptjs`
2. **Update environment variables**: Replace `JWT_SECRET` with `BETTER_AUTH_SECRET`
3. **Update API routes**: Replace JWT verification with Better Auth session checks
4. **Update client code**: Replace custom auth logic with Better Auth client
5. **Run migrations**: Add Better Auth tables to database
6. **Test thoroughly**: Verify registration, login, and session management

## Requirements Satisfied

- ✅ Requirement 1.1: Better Auth installation and configuration
- ✅ Requirement 2.1: Better Auth core tables in database
- ✅ Requirement 3.1: Better Auth server instance configured
- ✅ Requirement 4.1: Better Auth API routes set up
- ✅ Requirement 5.1: Better Auth client instance created
- ✅ Requirement 6.1: Registration logic using Better Auth
- ✅ Requirement 7.1: Protected routes using Better Auth sessions
- ✅ Requirement 8.1: Frontend components using Better Auth client
- ✅ User-controlled encryption keys
- ✅ GDPR consent collection
- ✅ Data export in JSON format
- ✅ Data deletion with audit trail
- ✅ Security event logging
- ✅ Compliance reporting
- ✅ Detailed audit logs

## Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth GitHub](https://github.com/better-auth/better-auth)
- [Prisma Adapter Docs](https://www.better-auth.com/docs/adapters/prisma)
- [Next.js Integration](https://www.better-auth.com/docs/integrations/next-js)
