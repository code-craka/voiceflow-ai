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

#### Storage Configuration (S3-Compatible)

For AWS S3:
```bash
S3_BUCKET_NAME="voiceflow-ai-audio"
S3_ACCESS_KEY_ID="your_access_key"
S3_SECRET_ACCESS_KEY="your_secret_key"
S3_REGION="us-east-1"
S3_ENDPOINT="https://s3.amazonaws.com"
```

For other S3-compatible services (MinIO, DigitalOcean Spaces, etc.), adjust the endpoint accordingly.

#### Arcjet Security (Required)

VoiceFlow AI uses Arcjet for API security, bot protection, and rate limiting.

1. Sign up at [https://app.arcjet.com](https://app.arcjet.com)
2. Create a new site/project
3. Copy your API key
4. Add to `.env.local`: `ARCJET_KEY="your_arcjet_key_here"`

See `.kiro/steering/security.md` for detailed Arcjet configuration and usage patterns.

#### Security Keys

Generate secure random keys:

```bash
# Generate 32-character encryption key
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 64

# Generate NextAuth secret
openssl rand -base64 32
```

Add to `.env.local`:
```bash
ENCRYPTION_KEY="your_32_char_key_here"
JWT_SECRET="your_jwt_secret_here"
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"
ARCJET_KEY="your_arcjet_key_here"
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
- **User**: User accounts with GDPR consent and encryption keys
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

### Project Structure

**Important**: This project does NOT use a `src/` directory. All code is in root-level folders. The TypeScript path alias `@/` maps to the project root.

```
voiceflow-ai/
├── app/                        # Next.js 15 App Router
│   ├── api/                    # API routes
│   ├── dashboard/              # Dashboard pages
│   └── auth/                   # Auth pages
├── components/                 # React components
│   ├── ui/                     # Reusable UI components
│   ├── audio/                  # Audio recording components
│   ├── notes/                  # Notes management
│   └── layout/                 # Layout components
├── lib/                        # Utilities and services
│   ├── services/               # Business logic
│   ├── db/                     # Database utilities
│   ├── auth/                   # Authentication
│   ├── validation/             # Input validation
│   └── config/                 # Configuration
├── types/                      # TypeScript definitions
├── hooks/                      # Custom React hooks
├── prisma/                     # Database schema
├── tests/                      # Test files
├── scripts/                    # Utility scripts
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
