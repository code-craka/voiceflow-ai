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

### Better Auth Configuration

**Server Instance**: `lib/auth.ts`
**Client Instance**: `lib/auth-client.ts`
**API Routes**: `app/api/auth/[...all]/route.ts`

Better Auth provides comprehensive authentication:

1. **Email/Password Authentication**:
   - Password hashing with scrypt (OWASP recommended)
   - Minimum 8 characters (configurable)
   - Automatic session creation on registration

2. **Session Management**:
   - HTTP-only cookies (prevents XSS)
   - 7-day expiry with automatic refresh every 24 hours
   - Encrypted session tokens
   - Built-in CSRF protection

3. **Database Integration**:
   - Prisma adapter for PostgreSQL
   - Core tables: User, Session, Account, Verification
   - Custom fields preserved (encryptionKeyHash, gdprConsent)

**Configuration**: Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_BETTER_AUTH_URL` in environment variables

**Key Features**:
- Type-safe session and user types
- Extensible plugin system
- Framework-agnostic design
- Full TypeScript support

### Arcjet Security Configuration

**Location**: `lib/arcjet.ts`

Arcjet provides multi-layered security protection:

1. **Shield Protection**: Blocks common attacks (SQL injection, XSS, etc.)
2. **Bot Detection**: 
   - Blocks automated bots
   - Allows search engines (Google, Bing, etc.)
   - Detects hosting IPs and spoofed bots
3. **Rate Limiting**: Token bucket algorithm
   - Different configurations for different endpoint types
   - Tracked by IP address

**Arcjet Configurations**:
- `aj` - Basic shield only (health checks)
- `ajPublicAPI` - Public endpoints (20 req/min)
- `ajAuthAPI` - Authenticated endpoints (100 req/min)
- `ajSensitive` - Auth/payment operations (5 req/min)
- `ajAI` - AI/transcription endpoints (10 req/min)

**Response Codes**:
- `429`: Rate limit exceeded
- `403`: Bot detected, hosting IP, or shield violation

**Configuration**: Set `ARCJET_KEY` in environment variables

**Integration with Better Auth**: Arcjet protection is applied BEFORE Better Auth session verification in all API routes

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

- `@/*` maps to `./*` (root directory, not `src/`)

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
- Setup file: `test/setup.ts`

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

**File**: `app/globals.css`

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

#### Storage (Appwrite Cloud)

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`: Appwrite API endpoint (e.g., `https://fra.cloud.appwrite.io/v1`)
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: Appwrite project ID
- `APPWRITE_API_KEY`: Server-side API key with Storage permissions

**Storage Configuration**:
- Bucket ID: `68e5eb26002366989566` (voiceflow-ai bucket)
- Region: Frankfurt (fra.cloud.appwrite.io)
- Max file size: 100MB
- Supported formats: WebM, Opus, OGG, WAV, MP3, MPEG
- Chunk size: 5MB for large file uploads

#### Security

- `ENCRYPTION_KEY`: 32-character key for AES-256-GCM
- `BETTER_AUTH_SECRET`: Better Auth secret key (generate with: `openssl rand -base64 32`)
- `BETTER_AUTH_URL`: Application URL for Better Auth (e.g., `http://localhost:3000` or `https://yourdomain.com`)
- `NEXT_PUBLIC_BETTER_AUTH_URL`: Public application URL for Better Auth client
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

### Authentication & Security

- `better-auth`: Latest (authentication framework)
- `@arcjet/next`: ^1.0.0-beta.13 (security protection)

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
├── app/                        # Next.js App Router
├── components/                 # React components
├── lib/                        # Utilities and services
│   ├── config/                 # Configuration (env validation)
│   ├── services/               # Business logic services
│   ├── db/                     # Database utilities
│   └── utils.ts                # General utilities
├── types/                      # TypeScript definitions
├── hooks/                      # Custom React hooks
├── test/                       # Test setup
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

The project uses comprehensive TypeScript types for type safety and developer experience. All types are organized by domain in the `types/` directory.

### Authentication Types

The project uses **Better Auth** for authentication with strongly-typed interfaces defined in `types/auth.ts`:

**Better Auth Types:**
- `Session` - Better Auth session type (imported from `@/lib/auth`)
- `User` - Better Auth user with custom fields (encryptionKeyHash, gdprConsent)

**Custom Types:**
- `GDPRConsent` - Structured consent tracking
- `UserWithCustomFields` - User with VoiceFlow AI custom fields
- `UserWithEncryptionKey` - User with decrypted encryption key

**Request Types:**
- `UserRegistrationRequest` - Registration payload
- `UserLoginRequest` - Login credentials

**Usage Example:**
```typescript
import type { Session } from '@/lib/auth';
import type { UserRegistrationRequest, GDPRConsent } from '@/types/auth';

// Better Auth session
const session: Session = await auth.api.getSession({ headers });

// Registration request
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

Audio recording and processing types are defined in `types/audio.ts`:

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

### Transcription Types

Transcription service types are defined in `types/transcription.ts`:

**Configuration Types:**
- `TranscriptionOptions` - Options for transcription requests
- `TranscriptionServiceConfig` - Service configuration with API keys
- `TranscriptionProvider` - Type union for provider names ("deepgram" | "assemblyai")

**Result Types:**
- `TranscriptionResult` - Complete transcription result with metadata
- `TranscriptionChunk` - Streaming transcription chunk for real-time processing
- `SpeakerSegment` - Speaker diarization segment with timestamps
- `TranscriptionWord` - Word-level transcription with timing and confidence

**Error Types:**
- `TranscriptionError` - Structured error with provider info and retry flag

**Usage Example:**
```typescript
import type { 
  TranscriptionResult, 
  TranscriptionOptions,
  SpeakerSegment 
} from '@/types/transcription';

const options: TranscriptionOptions = {
  language: 'en',
  enableSpeakerDiarization: true,
  enablePunctuation: true,
};

const result: TranscriptionResult = await transcribe(audio, options);
console.log(`Transcribed by ${result.provider}: ${result.text}`);
console.log(`Confidence: ${result.confidence * 100}%`);

if (result.speakers) {
  result.speakers.forEach((segment: SpeakerSegment) => {
    console.log(`Speaker ${segment.speaker}: ${segment.text}`);
  });
}
```

### API Response Types

API response types are defined in `types/api.ts` for consistent error handling and response formatting.

## Monitoring and Logging

### Monitoring Service

**Location**: `lib/services/monitoring.ts`

The monitoring service provides structured logging, performance metrics tracking, and security event monitoring.

**Key Features:**
- Structured JSON logging with context
- Performance metrics (API response time, transcription speed, AI processing, database queries)
- Security event logging with severity levels
- Automatic alerting for slow requests and queries
- Metrics aggregation (P95, averages, error rates)
- Memory-managed buffers (1,000 metrics, 500 security events)

**Usage Example:**
```typescript
import { monitoringService, LogLevel, withMonitoring } from '@/lib/services/monitoring';

// Structured logging
monitoringService.log(LogLevel.INFO, 'User action completed', {
  userId: user.id,
  action: 'note_created',
});

// Error logging with stack trace
monitoringService.logError('Processing failed', error, { userId });

// Track API performance
monitoringService.trackAPIResponseTime('/api/notes', 'POST', duration, 200);

// Wrap API handler with monitoring
return withMonitoring(
  async () => {
    // Your API logic
  },
  { endpoint: '/api/notes', method: 'POST', userId }
);
```

**Metric Types:**
- `API_RESPONSE_TIME` - Target: P95 < 500ms
- `TRANSCRIPTION_TIME` - Target: 5-10x real-time
- `AI_PROCESSING_TIME` - Varies by model
- `DATABASE_QUERY_TIME` - Target: < 100ms
- `CACHE_HIT_RATE` - Target: > 90%
- `ERROR_RATE` - Target: < 1%
- `ACTIVE_USERS` - Tracking
- `COST_PER_USER` - Target: ≤ $0.31/month

**Automatic Alerts:**
- Slow API requests (> 500ms)
- Slow database queries (> 100ms)
- Slow transcription (< 5x real-time)
- Critical security events

See `docs/MONITORING_ALERTING.md` for detailed usage patterns and best practices.

## Verification

Run the setup verification script to ensure all configuration is correct:

```bash
pnpm run verify-setup
```

This checks:

- Node.js version (22.15.0+)
- pnpm version (10.17.1+)
- Required configuration files
- Environment variables (including Better Auth variables)
- Prisma client generation
- Database connection

## Migration Notes

### Better Auth Migration

VoiceFlow AI has migrated from a custom JWT-based authentication system to **Better Auth**. If you're working with an older version of the codebase:

**Removed Dependencies**:
- `jsonwebtoken` - Replaced by Better Auth's session management
- `bcryptjs` - Replaced by Better Auth's scrypt password hashing
- `@types/jsonwebtoken` and `@types/bcryptjs` - No longer needed

**Removed Environment Variables**:
- `JWT_SECRET` - Replaced by `BETTER_AUTH_SECRET`
- `NEXTAUTH_SECRET` - Replaced by `BETTER_AUTH_SECRET`
- `NEXTAUTH_URL` - Replaced by `BETTER_AUTH_URL`

**New Environment Variables**:
- `BETTER_AUTH_SECRET` - Secret key for Better Auth (generate with: `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - Application URL for Better Auth server
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Public URL for Better Auth client

**Database Changes**:
- Added Better Auth core tables: `session`, `account`, `verification`
- Updated `user` table with Better Auth required fields
- Removed `passwordHash` from `user` table (now in `account.password`)
- Preserved custom fields: `encryptionKeyHash`, `gdprConsent`

**API Changes**:
- Removed `/api/auth/register` and `/api/auth/login` endpoints
- Added catch-all route: `/api/auth/[...all]` (handles all Better Auth endpoints)
- All protected routes now use `auth.api.getSession()` instead of JWT verification

For detailed migration information, see [AUTHENTICATION.md](./AUTHENTICATION.md)

## Next Steps

1. Configure environment variables in `.env.local`
2. Set up PostgreSQL database
3. Set up Redis instance
4. Obtain API keys for AI services
5. Configure S3-compatible storage
6. Run database migrations
7. Start development server

See [SETUP.md](./SETUP.md) for detailed setup instructions.
