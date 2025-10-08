# VoiceFlow AI Setup Guide

This guide will help you set up the VoiceFlow AI development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 22.15.0+**: [Download](https://nodejs.org/)
- **pnpm 10.17.1+**: Install with `npm install -g pnpm`
- **PostgreSQL**: [Download](https://www.postgresql.org/download/) or use a cloud provider
- **Redis**: [Download](https://redis.io/download) or use a cloud provider

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd voiceflow-ai
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

#### Database Configuration

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/voiceflow_ai?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/voiceflow_ai?schema=public"
```

**Note**: For local PostgreSQL, create the database first:
```bash
createdb voiceflow_ai
```

#### AI Service API Keys

1. **Deepgram** (Primary Transcription)
   - Sign up at [https://deepgram.com](https://deepgram.com)
   - Get API key from dashboard
   - Add to `.env.local`: `DEEPGRAM_API_KEY="your_key_here"`

2. **AssemblyAI** (Fallback Transcription)
   - Sign up at [https://www.assemblyai.com](https://www.assemblyai.com)
   - Get API key from dashboard
   - Add to `.env.local`: `ASSEMBLYAI_API_KEY="your_key_here"`

3. **OpenAI** (AI Content Processing)
   - Sign up at [https://platform.openai.com](https://platform.openai.com)
   - Get API key from dashboard
   - Add to `.env.local`: `OPENAI_API_KEY="your_key_here"`

4. **Arcjet** (Security Protection)
   - Sign up at [https://arcjet.com](https://arcjet.com)
   - Create a new site and get API key
   - Add to `.env.local`: `ARCJET_KEY="your_key_here"`
   - Provides bot detection, rate limiting, and shield protection

#### Storage Configuration (Appwrite Cloud)

VoiceFlow AI uses Appwrite Cloud Storage for encrypted audio file storage.

1. **Sign up at Appwrite Cloud**:
   - Visit [https://cloud.appwrite.io](https://cloud.appwrite.io)
   - Create a new project

2. **Get your project credentials**:
   - Project ID: Found in project settings
   - API Endpoint: `https://fra.cloud.appwrite.io/v1` (Frankfurt region)
   - API Key: Create a new API key with Storage permissions

3. **Create a storage bucket**:
   - Navigate to Storage in your Appwrite console
   - Create a new bucket named "voiceflow-ai"
   - Configure permissions for authenticated users
   - Note the Bucket ID

4. **Add to `.env.local`**:
```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your_project_id_here"
APPWRITE_API_KEY="your_api_key_here"
```

**Storage Features**:
- Maximum file size: 100MB
- Supported formats: WebM, Opus, OGG, WAV, MP3, MPEG
- Chunked uploads for large files (5MB chunks)
- Automatic encryption at rest
- CDN-backed delivery for fast access

#### Arcjet Security (Required)

VoiceFlow AI uses Arcjet for API security, bot protection, and rate limiting.

1. Sign up at [https://app.arcjet.com](https://app.arcjet.com)
2. Create a new site/project
3. Copy your API key
4. Add to `.env.local`: `ARCJET_KEY="your_arcjet_key_here"`

See `.kiro/steering/security.md` for detailed Arcjet configuration and usage patterns.

#### Better Auth Configuration (Required)

VoiceFlow AI uses Better Auth for secure authentication with email/password support.

Generate secure random keys:

```bash
# Generate 32-character encryption key
openssl rand -base64 32

# Generate Better Auth secret
openssl rand -base64 32
```

Add to `.env.local`:
```bash
# Encryption for audio files
ENCRYPTION_KEY="your_32_char_key_here"

# Better Auth configuration
BETTER_AUTH_SECRET="your_better_auth_secret_here"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
```

**Important Notes**:
- `BETTER_AUTH_SECRET`: Must be at least 32 characters. Used for session encryption and CSRF protection.
- `BETTER_AUTH_URL`: Server-side base URL. Use `http://localhost:3000` for development, your production domain for production.
- `NEXT_PUBLIC_BETTER_AUTH_URL`: Client-side base URL. Must match `BETTER_AUTH_URL` in most cases.

**For Production**:
```bash
BETTER_AUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_BETTER_AUTH_URL="https://yourdomain.com"
```

#### Redis Configuration

For local Redis:
```bash
REDIS_URL="redis://localhost:6379"
```

For cloud Redis (e.g., Upstash, Redis Cloud):
```bash
REDIS_URL="redis://username:password@host:port"
```

### 3. Initialize Database

The database schema includes the following models:

**Better Auth Tables**:
- **User**: User accounts with GDPR consent and encryption keys
- **Session**: Better Auth session management with token-based authentication
- **Account**: Better Auth account storage for credentials (passwords) and OAuth providers
- **Verification**: Better Auth email verification tokens

**Application Tables**:
- **Note**: Voice notes with transcription, summary, and encrypted audio
- **Folder**: Hierarchical folder structure for organization
- **Tag**: User-specific tags for categorization
- **NoteTag**: Many-to-many relationship between notes and tags
- **AuditLog**: GDPR-compliant audit trail

Generate Prisma client:
```bash
pnpm run db:generate
```

Push schema to database (for development):
```bash
pnpm run db:push
```

Or create a migration (recommended for production):
```bash
pnpm run db:migrate
```

The schema includes:
- UUID primary keys with PostgreSQL `gen_random_uuid()`
- Better Auth integration for secure authentication
- Cascade deletes for data integrity
- Performance indexes on userId, createdAt, and folderId
- GDPR compliance with audit logging
- Support for hierarchical folders and tagging

See `prisma/README.md` for detailed schema documentation.

### 4. Verify Setup

Run the verification script:
```bash
pnpm run verify-setup
```

This will check:
- Node.js version
- Required files
- Environment variables
- Prisma client generation

### 5. Start Development Server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

### Common Commands

```bash
# Development
pnpm run dev              # Start dev server
pnpm run build            # Build for production
pnpm run start            # Start production server

# Code Quality
pnpm run lint             # Run ESLint
pnpm run type-check       # TypeScript validation
pnpm run format           # Format code with Prettier
pnpm run format:check     # Check code formatting

# Testing
pnpm run test             # Run tests once
pnpm run test:watch       # Run tests in watch mode

# Database
pnpm run db:generate      # Generate Prisma client
pnpm run db:push          # Push schema changes
pnpm run db:migrate       # Create migration
pnpm run db:seed          # Seed database

# Verification
pnpm run verify-setup     # Verify environment setup
```

### Authentication Flow

VoiceFlow AI uses **Better Auth** for secure authentication:

**Registration Flow**:
1. User submits email and password via `SignUpForm` component
2. Client calls `authClient.signUp.email()` from Better Auth client
3. Better Auth creates user account with scrypt password hashing
4. Custom fields (encryption key, GDPR consent) are added to user record
5. Session is created with HTTP-only cookie
6. User is redirected to dashboard

**Login Flow**:
1. User submits credentials via `SignInForm` component
2. Client calls `authClient.signIn.email()` from Better Auth client
3. Better Auth verifies password and creates session
4. Session token stored in HTTP-only cookie (prevents XSS)
5. User is redirected to dashboard

**Session Management**:
- Sessions expire after 7 days
- Automatic session refresh every 24 hours
- HTTP-only cookies prevent XSS attacks
- Built-in CSRF protection
- Server-side session verification with `auth.api.getSession()`

**Protected Routes**:
```typescript
// API routes verify session before processing
const session = await auth.api.getSession({ headers: request.headers });
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

For detailed authentication patterns, see [Better Auth Guidelines](.kiro/steering/better-auth.md).

### Project Structure

**Important**: This project does NOT use a `src/` directory. All code is in root-level folders. The TypeScript path alias `@/` maps to the project root.

```
voiceflow-ai/
├── app/                        # Next.js 15 App Router
│   ├── api/                    # API routes
│   │   └── auth/               # Better Auth endpoints
│   ├── dashboard/              # Dashboard pages
│   └── auth/                   # Auth pages (signin, signup)
├── components/                 # React components
│   ├── ui/                     # Reusable UI components
│   ├── audio/                  # Audio recording components
│   ├── auth/                   # Auth UI components (SignInForm, SignUpForm)
│   ├── notes/                  # Notes management
│   └── layout/                 # Layout components
├── lib/                        # Utilities and services
│   ├── auth.ts                 # Better Auth server instance
│   ├── auth-client.ts          # Better Auth client instance
│   ├── services/               # Business logic
│   ├── db/                     # Database utilities
│   ├── validation/             # Input validation
│   └── config/                 # Configuration
├── types/                      # TypeScript definitions
├── hooks/                      # Custom React hooks
├── prisma/                     # Database schema
├── tests/                      # Test files
├── scripts/                    # Utility scripts
│   └── migrate-existing-users.ts  # User migration script
└── docs/                       # Documentation
```

### Import Examples

```typescript
// Use @/ for absolute imports from project root
import { AudioService } from "@/lib/services/audio";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/auth";
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   psql -U postgres -c "SELECT version();"
   ```

2. Check your `DATABASE_URL` format:
   ```
   postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
   ```

3. Ensure the database exists:
   ```bash
   createdb voiceflow_ai
   ```

### Prisma Client Issues

If Prisma client is not found:

```bash
pnpm run db:generate
```

### TypeScript Errors

If you see TypeScript errors:

```bash
pnpm run type-check
```

### Environment Variable Issues

If environment variables are not loading:

1. Ensure `.env.local` exists in the root directory
2. Restart the development server
3. Run verification: `pnpm run verify-setup`

## Migration Notes for Existing Installations

If you're upgrading from a previous version with custom JWT authentication:

### 1. Update Environment Variables

**Remove old variables**:
- `JWT_SECRET` (replaced by `BETTER_AUTH_SECRET`)
- `NEXTAUTH_SECRET` (replaced by `BETTER_AUTH_SECRET`)
- `NEXTAUTH_URL` (replaced by `BETTER_AUTH_URL`)

**Add new variables**:
```bash
BETTER_AUTH_SECRET="generate_with_openssl_rand_base64_32"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
```

### 2. Run Database Migration

The Better Auth migration adds new tables (Session, Account, Verification) while preserving existing user data:

```bash
# Generate Prisma client with new schema
pnpm run db:generate

# Run migration to add Better Auth tables
pnpm run db:migrate
```

### 3. Migrate Existing Users (Optional)

If you have existing users with password hashes, they will need to log in again. Better Auth will automatically re-hash their passwords using scrypt on first login.

Alternatively, run the migration script to preserve sessions:

```bash
npx tsx scripts/migrate-existing-users.ts
```

This script:
- Creates Better Auth Account records for existing users
- Preserves user data (email, encryption keys, GDPR consent)
- Maintains all relationships (notes, folders, tags)

### 4. Update Client Code

If you have custom authentication code:

**Old pattern (JWT)**:
```typescript
// Don't use this anymore
const token = localStorage.getItem('token');
```

**New pattern (Better Auth)**:
```typescript
import { authClient } from '@/lib/auth-client';

// Use Better Auth hooks
const { data: session } = authClient.useSession();
```

### 5. Verify Migration

After migration, verify:

1. **Authentication works**: Try signing up and logging in
2. **Sessions persist**: Refresh the page and verify you stay logged in
3. **Protected routes work**: Access authenticated pages
4. **Existing data intact**: Check that notes, folders, and tags are preserved

Run the verification script:
```bash
pnpm run verify-setup
```

### 6. Clean Up

After successful migration, you can remove old authentication code:

- Old JWT utility files (if any custom implementations exist)
- Old authentication middleware
- Unused dependencies (jsonwebtoken, bcryptjs)

### Migration Support

For detailed migration information, see:
- [Better Auth Migration Spec](.kiro/specs/better-auth-migration/design.md)
- [Better Auth Patterns](.kiro/steering/better-auth.md)
- [Authentication Documentation](docs/AUTHENTICATION.md)

## Next Steps

After setup is complete:

1. Review the [Requirements Document](.kiro/specs/voiceflow-ai/requirements.md)
2. Review the [Design Document](.kiro/specs/voiceflow-ai/design.md)
3. Check the [Implementation Tasks](.kiro/specs/voiceflow-ai/tasks.md)
4. Start implementing features by opening `tasks.md` and clicking "Start task"

## Additional Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Deepgram API Docs](https://developers.deepgram.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the project documentation in `docs/`
3. Check the `.kiro/steering/` guidelines for technical standards
