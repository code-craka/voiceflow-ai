# VoiceFlow AI - Technology Stack

## Programming Languages & Versions
- **TypeScript**: Primary language with strict type checking
- **JavaScript**: Node.js runtime environment
- **SQL**: PostgreSQL database queries and migrations
- **CSS**: Tailwind CSS utility classes and custom styles

## Core Framework & Runtime
- **Next.js 15**: React framework with App Router architecture
- **React 19**: UI library with latest features and optimizations
- **Node.js**: >=22.15.0 (specified in package.json engines)
- **pnpm**: >=10.17.1 package manager for efficient dependency management

## Database & ORM
- **PostgreSQL**: Primary database with advanced features
- **Prisma ORM**: Type-safe database access and migrations
- **Redis**: Caching layer for performance optimization
- **Database Features**:
  - UUID primary keys with `gen_random_uuid()`
  - Full-text search capabilities
  - Cascade deletes and referential integrity
  - Performance indexes on frequently queried fields

## AI & Transcription Services
- **Deepgram Nova-2**: Primary speech-to-text service (90%+ accuracy)
- **AssemblyAI**: Fallback transcription service for reliability
- **OpenAI GPT-4o**: AI content processing, summaries, and action items
- **Integration Pattern**: Primary/fallback architecture for high availability

## Security & Authentication
- **Arcjet**: Bot detection, rate limiting, and attack prevention
  - Token bucket rate limiting (5 tokens/10s, capacity: 10)
  - Shield protection against SQL injection and attacks
  - Hosting IP detection and spoofed bot verification
- **AES-256-GCM**: End-to-end encryption for sensitive data
- **bcryptjs**: Password hashing and authentication
- **jsonwebtoken**: JWT token management and validation
- **Better Auth**: Modern authentication library

## Storage & Infrastructure
- **S3-Compatible Storage**: Encrypted object storage for audio files
- **Vercel Edge Functions**: Global performance optimization
- **AWS SDK**: Cloud storage integration
- **Redis**: Distributed caching and session storage

## Development Tools & Build System
- **Package Manager**: pnpm with workspace configuration
- **Build Tool**: Next.js built-in build system
- **TypeScript Compiler**: Strict mode with comprehensive type checking
- **Bundler**: Next.js webpack-based bundling with optimizations

## Testing Framework
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **Jest DOM**: DOM testing utilities and matchers
- **jsdom**: Browser environment simulation for testing

## Code Quality & Formatting
- **ESLint**: Code linting with Next.js and TypeScript rules
- **Prettier**: Code formatting with Tailwind CSS plugin
- **TypeScript**: Strict type checking and IntelliSense
- **Configuration**:
  - `.eslintrc.json`: ESLint rules and parser configuration
  - `.prettierrc`: Prettier formatting rules
  - `tsconfig.json`: TypeScript compiler options

## Styling & UI
- **Tailwind CSS 4.1.7**: Utility-first CSS framework
- **PostCSS**: CSS processing and optimization
- **Autoprefixer**: Automatic vendor prefixing
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variants
- **Tailwind Merge**: Utility class merging and deduplication

## Development Commands
```bash
# Development
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run start        # Start production server

# Code Quality
pnpm run lint         # Run ESLint
pnpm run type-check   # TypeScript validation
pnpm run format       # Format code with Prettier
pnpm run format:check # Check code formatting

# Testing
pnpm run test         # Run tests
pnpm run test:watch   # Run tests in watch mode

# Database
pnpm run db:generate  # Generate Prisma client
pnpm run db:push      # Push schema changes
pnpm run db:migrate   # Create migration
pnpm run db:seed      # Seed database with test data

# Utilities
pnpm run verify-setup # Verify environment setup
```

## Environment Configuration
- **Environment Files**: `.env`, `.env.local`, `.env.example`
- **Required Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `ARCJET_KEY`: Security API key
  - `DEEPGRAM_API_KEY`: Primary transcription service
  - `ASSEMBLYAI_API_KEY`: Fallback transcription service
  - `OPENAI_API_KEY`: AI content processing
  - `ENCRYPTION_KEY`: 32-character encryption key
  - `REDIS_URL`: Cache connection string
  - `S3_*`: Storage configuration variables

## Performance Targets
- **Time to First Byte**: <200ms
- **API Response Times**: P95 <500ms
- **Transcription Speed**: 5-10x real-time processing
- **Search Response**: <100ms
- **CDN Cache Hit Rate**: 99%

## Deployment & Infrastructure
- **Platform**: Vercel with Edge Functions
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for session and data caching
- **Storage**: S3-compatible encrypted object storage
- **CDN**: Vercel Edge Network for global distribution
- **Monitoring**: Built-in performance monitoring and error tracking