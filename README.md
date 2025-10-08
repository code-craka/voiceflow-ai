# VoiceFlow AI

VoiceFlow AI is a production-ready voice note-taking application that combines real-time audio recording, AI-powered transcription, and intelligent content processing.

## Features

- **Voice Recording**: Browser-based audio capture with real-time feedback
- **AI Transcription**: Automatic speech-to-text with 90%+ accuracy using Deepgram Nova-2
- **Smart Processing**: AI-powered summaries, key points, and action item extraction using GPT-4o
- **Organization**: Hierarchical folders, tagging, and full-text search
- **Security**: End-to-end encryption with AES-256-GCM and GDPR compliance
- **Performance**: Sub-500ms API responses with 5-10x real-time transcription speed
- **Monitoring**: Structured logging, performance metrics, and automatic alerting

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth with email/password and session management
- **AI Services**: Deepgram Nova-2, AssemblyAI (fallback), OpenAI GPT-4o
- **Storage**: Appwrite Cloud Storage (Frankfurt region) with encrypted object storage
- **Security**: Arcjet (bot detection, rate limiting, shield protection)
- **Infrastructure**: Vercel Edge Functions, Redis caching

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- PostgreSQL database
- Redis instance

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd voiceflow-ai
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

4. Generate Prisma client:
```bash
pnpm run db:generate
```

5. Run database migrations:
```bash
pnpm run db:migrate
```

6. Start the development server:
```bash
pnpm run dev
```

### Environment Variables

Required environment variables (see `.env.example` for full list):

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: Secret key for Better Auth (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL`: Base URL for Better Auth (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_BETTER_AUTH_URL`: Public URL for Better Auth client
- `ARCJET_KEY`: Arcjet security API key (get from https://app.arcjet.com)
- `DEEPGRAM_API_KEY`: Primary transcription service
- `ASSEMBLYAI_API_KEY`: Fallback transcription service
- `OPENAI_API_KEY`: AI content processing
- `NEXT_PUBLIC_APPWRITE_*`: Appwrite storage configuration
- `APPWRITE_API_KEY`: Server-side Appwrite API key
- `ENCRYPTION_KEY`: 32-character encryption key
- `REDIS_URL`: Redis cache connection

## Development Commands

```bash
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run start        # Start production server
pnpm run lint         # Run ESLint
pnpm run type-check   # TypeScript validation
pnpm run test         # Run tests
pnpm run db:generate  # Generate Prisma client
pnpm run db:push      # Push schema changes
pnpm run db:migrate   # Create migration
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Complete setup instructions
- [Configuration Reference](docs/CONFIGURATION.md) - Environment and config details
- [Authentication & GDPR](docs/AUTHENTICATION.md) - Authentication system and GDPR compliance
- [Testing Guide](tests/TESTING_GUIDE.md) - Comprehensive testing documentation
- [Auth Unit Tests](docs/AUTH_UNIT_TESTS_SUMMARY.md) - Authentication service test coverage
- [Monitoring & Alerting](docs/MONITORING_ALERTING.md) - Logging and performance monitoring
- [Appwrite Storage](docs/APPWRITE_STORAGE.md) - Cloud storage integration guide
- [Arcjet Security](docs/ARCJET_SECURITY.md) - API security integration guide
- [Database Schema](prisma/README.md) - Database documentation
- [Security Guidelines](.kiro/steering/security.md) - Security best practices

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models:

- **User**: User accounts with GDPR consent and encryption key management
- **Session**: Better Auth session management with token-based authentication
- **Account**: Better Auth account storage for credentials and OAuth providers
- **Verification**: Better Auth email verification tokens
- **Note**: Voice notes with transcription, AI summaries, and encrypted audio
- **Folder**: Hierarchical folder structure for organization
- **Tag**: User-specific tags for categorization
- **AuditLog**: GDPR-compliant audit trail for all operations

Features:
- UUID primary keys with PostgreSQL `gen_random_uuid()`
- Better Auth integration for secure authentication and session management
- Cascade deletes for referential integrity
- Performance indexes on frequently queried fields
- Full support for hierarchical folders and many-to-many tagging
- Encrypted audio storage with user-controlled keys

See `prisma/README.md` for detailed schema documentation.

## Project Structure

**Note**: This project does NOT use a `src/` directory. All application code is in root-level folders. The TypeScript path alias `@/` maps to the project root.

```
voiceflow-ai/
├── app/                     # Next.js App Router pages
│   └── api/                 # API routes
│       ├── auth/            # Better Auth endpoints
│       └── gdpr/            # GDPR compliance endpoints
├── components/              # React components
│   └── auth/                # Authentication UI components
├── lib/                     # Utilities and services
│   ├── auth.ts              # Better Auth server instance
│   ├── auth-client.ts       # Better Auth client instance
│   └── services/            # Business logic services
│       ├── auth.ts          # Authentication service
│       ├── audit.ts         # Audit logging service
│       ├── monitoring.ts    # Monitoring and logging service
│       ├── encryption.ts    # Encryption utilities
│       └── gdpr.ts          # GDPR compliance service
├── types/                   # TypeScript definitions
│   ├── auth.ts              # Authentication types
│   ├── audio.ts             # Audio recording and processing types
│   └── api.ts               # API response types
├── hooks/                   # Custom React hooks
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma        # Prisma schema definition
│   ├── migrations/          # Database migrations
│   ├── seed.ts              # Database seeding script
│   └── README.md            # Schema documentation
├── tests/                   # Test files
├── docs/                    # Documentation
│   ├── SETUP.md             # Setup guide
│   ├── CONFIGURATION.md     # Configuration reference
│   └── AUTHENTICATION.md    # Authentication & GDPR guide
└── .kiro/                   # Kiro AI assistant configuration
    └── steering/            # AI assistant guidelines
        └── better-auth.md   # Better Auth patterns and best practices
```

### Import Examples

```typescript
// Use @/ for absolute imports from project root
import { AudioService } from "@/lib/services/audio";
import { Button } from "@/components/ui/button";
import type { AudioRecordingResult } from "@/types/audio";
```

## Performance Targets

- Time to First Byte: <200ms
- API Response Times: P95 <500ms
- Transcription Speed: 5-10x real-time
- Search Response: <100ms
- CDN Cache Hit Rate: 99%

## Security & Compliance

- **Better Auth**: Secure authentication with scrypt password hashing, HTTP-only cookies, and CSRF protection
- **Arcjet Security**: Bot protection, rate limiting, and attack prevention on all API routes
- End-to-end encryption with AES-256-GCM
- GDPR-compliant data handling
- User-controlled encryption keys
- Comprehensive audit logging
- TLS 1.3 for all communications
- **Session Management**: 7-day session expiry with automatic refresh
- **Arcjet Protection**:
  - Bot detection and blocking (allows search engines)
  - Token bucket rate limiting (5 tokens/10s, capacity: 10)
  - Shield protection against SQL injection and common attacks
  - Hosting IP detection for bot prevention
  - Spoofed bot verification

## License

[License information]