# VoiceFlow AI Configuration Summary

This document provides an overview of the project configuration and setup.

## Project Configuration

### Next.js 15 with App Router

- **Framework**: Next.js 15.0.0
- **React**: Version 19.0.0
- **Router**: App Router (not Pages Router)
- **TypeScript**: Strict mode enabled

**Configuration File**: `next.config.ts`

- Server external packages configured for Prisma
- CORS headers configured for API routes
- Image domains configuration ready

### Arcjet Security Configuration

**Location**: `src/app/api/arcjet/route.ts`

Arcjet provides multi-layered security protection:

1. **Shield Protection**: Blocks common attacks (SQL injection, XSS, etc.)
2. **Bot Detection**: 
   - Blocks automated bots
   - Allows search engines (Google, Bing, etc.)
   - Detects hosting IPs and spoofed bots
3. **Rate Limiting**: Token bucket algorithm
   - Refill rate: 5 tokens per 10 seconds
   - Capacity: 10 tokens
   - Tracked by IP address

**Response Codes**:
- `429`: Rate limit exceeded
- `403`: Bot detected, hosting IP, or shield violation

**Configuration**: Set `ARCJET_KEY` in environment variables

### TypeScript Configuration

**File**: `tsconfig.json`

Strict mode settings enabled:

- `strict: true`
- `noImplicitAny: true`
- `noImplicitReturns: true`
- `noImplicitThis: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `exactOptionalPropertyTypes: true`

Path aliases configured:

- `@/*` maps to `./src/*`

### ESLint Configuration

**File**: `.eslintrc.json`

Rules enforced:

- No unused variables
- No explicit `any` types
- Explicit function return types required
- Prefer const over let
- No var declarations
- Object shorthand syntax
- Template literals preferred

### Prettier Configuration

**File**: `.prettierrc`

Code formatting standards:

- Single quotes for strings
- Semicolons required
- 2-space indentation
- 100 character line width
- Trailing commas (ES5)
- Tailwind CSS plugin for class sorting

### Vitest Configuration

**File**: `vitest.config.ts`

Test environment:

- jsdom for browser-like testing
- React plugin enabled
- Path aliases configured
- Setup file: `src/test/setup.ts`

### Prisma ORM Configuration

**File**: `prisma/schema.prisma`

Database provider: PostgreSQL with direct connection support

**Database Models:**

1. **User** (`users` table)
   - UUID primary key with `gen_random_uuid()`
   - Email (unique, indexed)
   - Encryption key hash for user-controlled encryption
   - GDPR consent stored as JSON
   - Timestamps (created_at, updated_at)
   - Relations: notes, folders, tags, auditLogs

2. **Note** (`notes` table)
   - UUID primary key
   - User reference (cascade delete)
   - Optional folder reference
   - Title, transcription, summary fields
   - Audio URL and encrypted audio key
   - Duration in seconds
   - Metadata as JSON
   - Timestamps (created_at, updated_at)
   - Indexes: userId, createdAt, folderId
   - Relations: user, folder, tags (many-to-many)

3. **Folder** (`folders` table)
   - UUID primary key
   - User reference (cascade delete)
   - Self-referential parent/child hierarchy
   - Name field
   - Created timestamp
   - Relations: user, parent, children, notes

4. **Tag** (`tags` table)
   - UUID primary key
   - User reference (cascade delete)
   - Name field (unique per user)
   - Created timestamp
   - Relations: user, notes (many-to-many)

5. **NoteTag** (`note_tags` table)
   - Composite primary key (noteId, tagId)
   - Many-to-many join table
   - Cascade deletes on both sides

6. **AuditLog** (`audit_logs` table)
   - UUID primary key
   - Optional user reference
   - Action, resource type, resource ID
   - Details as JSON
   - IP address (INET type) and user agent
   - Created timestamp
   - Indexes: userId, createdAt

**Key Features:**

- PostgreSQL-specific types (UUID, INET, Timestamptz)
- Cascade deletes for data integrity
- Hierarchical folder structure support
- Unique constraints (email, userId+tagName)
- Performance indexes on frequently queried fields
- GDPR compliance with audit logging
- Encrypted audio storage references
- Full timestamp tracking

### Tailwind CSS v4

**Configuration**: CSS-based (no config file needed)

**File**: `src/app/globals.css`

- Tailwind directives included
- CSS custom properties for theming
- Dark mode support

**PostCSS**: `postcss.config.js`

- `@tailwindcss/postcss` plugin configured

## Environment Variables

### Required Variables

#### Database

- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct PostgreSQL connection (for migrations)

#### AI Services

- `DEEPGRAM_API_KEY`: Primary transcription service
- `ASSEMBLYAI_API_KEY`: Fallback transcription service
- `OPENAI_API_KEY`: AI content processing (GPT-4o)

#### Storage (S3-Compatible)

- `S3_BUCKET_NAME`: Bucket for audio files
- `S3_ACCESS_KEY_ID`: S3 access key
- `S3_SECRET_ACCESS_KEY`: S3 secret key
- `S3_REGION`: AWS region
- `S3_ENDPOINT`: S3 endpoint URL

#### Security

- `ENCRYPTION_KEY`: 32-character key for AES-256-GCM
- `JWT_SECRET`: JWT signing secret
- `NEXTAUTH_SECRET`: NextAuth.js secret
- `NEXTAUTH_URL`: Application URL
- `ARCJET_KEY`: Arcjet API key for bot detection, rate limiting, and shield protection

#### Infrastructure

- `REDIS_URL`: Redis connection string
- `NODE_ENV`: Environment (development/production/test)
- `NEXT_PUBLIC_APP_URL`: Public application URL

### Environment Files

- `.env.example`: Template with all required variables
- `.env.local`: Local development configuration (gitignored)

## Package Scripts

### Development

- `pnpm run dev`: Start development server
- `pnpm run build`: Build for production
- `pnpm run start`: Start production server

### Code Quality

- `pnpm run lint`: Run ESLint
- `pnpm run type-check`: TypeScript validation
- `pnpm run format`: Format code with Prettier
- `pnpm run format:check`: Check code formatting

### Testing

- `pnpm run test`: Run tests once
- `pnpm run test:watch`: Run tests in watch mode

### Database

- `pnpm run db:generate`: Generate Prisma client
- `pnpm run db:push`: Push schema changes
- `pnpm run db:migrate`: Create migration
- `pnpm run db:seed`: Seed database

### Utilities

- `pnpm run verify-setup`: Verify environment setup

## Dependencies

### Core Dependencies

- `next`: ^15.0.0
- `react`: ^19.0.0
- `react-dom`: ^19.0.0
- `@prisma/client`: ^5.7.0
- `zod`: ^3.22.4 (validation)
- `@arcjet/next`: ^1.0.0-beta.13 (security protection)
- `@arcjet/inspect`: ^1.0.0-beta.13 (bot verification)

### AI & Services

- `aws-sdk`: ^2.1519.0 (S3 storage)
- `redis`: ^4.6.12 (caching)

### Security

- `bcryptjs`: ^2.4.3 (password hashing)
- `jsonwebtoken`: ^9.0.2 (JWT tokens)

### Styling

- `tailwindcss`: ^4.1.7
- `clsx`: ^2.1.1
- `tailwind-merge`: ^3.3.1

### Development Tools

- `typescript`: ^5.3.0
- `eslint`: ^8.56.0
- `prettier`: ^3.1.1
- `vitest`: ^1.1.0
- `tsx`: ^4.6.2

## Project Structure

```
voiceflow-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   ├── lib/                    # Utilities and services
│   │   ├── config/             # Configuration (env validation)
│   │   ├── services/           # Business logic services
│   │   ├── db/                 # Database utilities
│   │   └── utils.ts            # General utilities
│   ├── types/                  # TypeScript definitions
│   ├── hooks/                  # Custom React hooks
│   └── test/                   # Test setup
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seeding
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── performance/            # Performance tests
├── scripts/
│   └── verify-setup.ts         # Setup verification
├── docs/
│   ├── SETUP.md                # Setup guide
│   └── CONFIGURATION.md        # This file
└── .kiro/
    ├── specs/                  # Feature specifications
    └── steering/               # AI assistant guidelines
```

## TypeScript Type System

The project uses comprehensive TypeScript types for type safety and developer experience. All types are organized by domain in the `src/types/` directory.

### Authentication Types

The project uses strongly-typed interfaces for authentication and user management, defined in `src/types/auth.ts`:

**Core Types:**
- `User` - User account with GDPR consent and encryption key
- `GDPRConsent` - Structured consent tracking
- `UserWithEncryptionKey` - User with decrypted encryption key

**Request Types:**
- `UserRegistrationRequest` - Registration payload
- `UserLoginRequest` - Login credentials

**Session Types:**
- `AuthSession` - Active user session
- `AuthToken` - JWT token with expiry

**Usage Example:**
```typescript
import type { UserRegistrationRequest, GDPRConsent } from '@/types/auth';

const request: UserRegistrationRequest = {
  email: 'user@example.com',
  password: 'SecurePass123!',
  gdprConsent: {
    dataProcessing: true,
    voiceRecording: true,
    aiProcessing: true,
    consentedAt: new Date(),
  }
};
```

### Audio Types

Audio recording and processing types are defined in `src/types/audio.ts`:

**Component Types:**
- `AudioRecorderProps` - Props for audio recorder component
- `AudioRecorderState` - State management for recording UI
- `AudioError` - Structured error handling for audio operations
- `AudioErrorCode` - Enum of possible audio error codes

**Processing Types:**
- `AudioFormat` - Audio format specifications (codec, bitrate, sample rate)
- `AudioUploadResult` - Result of audio upload with encryption details
- `AudioValidationResult` - Audio file validation response

**Error Codes:**
- `PERMISSION_DENIED` - Microphone access denied by user
- `NOT_SUPPORTED` - Browser doesn't support required audio APIs
- `DEVICE_NOT_FOUND` - No audio input device available
- `RECORDING_FAILED` - Recording process failed
- `BROWSER_INCOMPATIBLE` - Browser lacks required features

**Usage Example:**
```typescript
import type { AudioRecorderProps, AudioError, AudioErrorCode } from '@/types/audio';

const handleRecordingComplete = (audioBlob: Blob, duration: number): void => {
  // Process recorded audio
};

const handleError = (error: AudioError): void => {
  if (error.code === AudioErrorCode.PERMISSION_DENIED) {
    // Show permission request UI
  }
};
```

### API Response Types

API response types are defined in `src/types/api.ts` for consistent error handling and response formatting.

## Verification

Run the setup verification script to ensure all configuration is correct:

```bash
pnpm run verify-setup
```

This checks:

- Node.js version (22.15.0+)
- pnpm version (10.17.1+)
- Required configuration files
- Environment variables
- Prisma client generation

## Next Steps

1. Configure environment variables in `.env.local`
2. Set up PostgreSQL database
3. Set up Redis instance
4. Obtain API keys for AI services
5. Configure S3-compatible storage
6. Run database migrations
7. Start development server

See [SETUP.md](./SETUP.md) for detailed setup instructions.
