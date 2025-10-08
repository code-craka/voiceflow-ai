# VoiceFlow AI - Project Structure

## Directory Organization

**Important**: This project does NOT use a `src/` directory. All application code is in root-level folders. The TypeScript path alias `@/` maps to the project root.

### Core Application Structure
```
voiceflow-ai/
├── app/                     # Next.js App Router pages and API routes
│   ├── api/                 # API endpoints
│   │   ├── arcjet/          # Arcjet security endpoints
│   │   ├── audio/           # Audio upload and processing
│   │   ├── auth/            # Authentication endpoints
│   │   ├── gdpr/            # GDPR compliance endpoints
│   │   └── transcription/   # Transcription processing
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Home page
├── components/              # React components
│   ├── audio/               # Audio recording and playback components
│   ├── layout/              # Layout components
│   ├── notes/               # Note management components
│   └── ui/                  # Reusable UI components
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities and services
│   ├── auth/                # Authentication utilities
│   ├── config/              # Configuration management
│   ├── db/                  # Database connection and utilities
│   ├── services/            # Business logic services
│   └── validation/          # Input validation schemas
├── types/                   # TypeScript type definitions
├── prisma/                  # Database schema and migrations
└── tests/                   # Test files and utilities
```

### Key Service Architecture
```
lib/services/
├── audio.ts                 # Audio processing and validation
├── audioClient.ts           # Audio client utilities
├── assemblyai.ts            # AssemblyAI transcription service
├── audit.ts                 # Audit logging service
├── auth.ts                  # Authentication service
├── deepgram.ts              # Deepgram transcription service
├── encryption.ts            # Encryption utilities
├── gdpr.ts                  # GDPR compliance service
├── jobQueue.ts              # Background job processing
├── jwt.ts                   # JWT token management
├── transcription.ts         # Transcription orchestration
└── transcriptionPipeline.ts # Transcription pipeline management
```

## Core Components & Relationships

### Audio Processing Flow
1. **AudioRecorder.tsx** → Captures browser audio with real-time feedback
2. **useAudioRecorder.ts** → Custom hook managing recording state and controls
3. **audio.ts service** → Validates, encrypts, and processes audio data
4. **upload/route.ts** → API endpoint for secure audio upload with Arcjet protection

### Transcription Pipeline
1. **transcriptionPipeline.ts** → Orchestrates the transcription workflow
2. **deepgram.ts** → Primary transcription service (Nova-2 model)
3. **assemblyai.ts** → Fallback transcription service for reliability
4. **transcription/route.ts** → API endpoint managing transcription requests

### Security & Authentication
1. **arcjet.ts** → Security middleware for bot detection and rate limiting
2. **auth.ts service** → User authentication and session management
3. **encryption.ts** → AES-256-GCM encryption for sensitive data
4. **audit.ts** → GDPR-compliant audit logging

### Database Layer
1. **schema.prisma** → Database schema with UUID keys and relationships
2. **index.ts (db)** → Prisma client configuration and connection
3. **seed.ts** → Database seeding for development and testing
4. **migrations/** → Version-controlled database schema changes

## Architectural Patterns

### API Route Structure
- **Arcjet Protection**: All API routes protected with security middleware
- **Error Handling**: Standardized error responses with retry indicators
- **Validation**: Zod schemas for input validation and type safety
- **Async Processing**: Background job queues for long-running tasks

### Component Architecture
- **Composition Pattern**: Small, focused components with clear responsibilities
- **Custom Hooks**: Business logic extracted into reusable hooks
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Error Boundaries**: Graceful error handling in UI components

### Service Layer Design
- **Single Responsibility**: Each service handles one domain area
- **Dependency Injection**: Services accept dependencies as parameters
- **Error Propagation**: Consistent error handling across service boundaries
- **Async/Await**: Modern async patterns throughout the codebase

### Database Design
- **UUID Primary Keys**: Using PostgreSQL `gen_random_uuid()` for security
- **Cascade Deletes**: Referential integrity with automatic cleanup
- **Performance Indexes**: Optimized queries on frequently accessed fields
- **Audit Trail**: Complete operation logging for GDPR compliance

## Import Path Configuration
```typescript
// Use @/ for absolute imports from project root
import { AudioService } from "@/lib/services/audio";
import { Button } from "@/components/ui/button";
import type { AudioRecordingResult } from "@/types/audio";
```

## Development Environment
- **Next.js 15**: App Router with React 19 and TypeScript
- **Prisma ORM**: Type-safe database access with PostgreSQL
- **Tailwind CSS**: Utility-first styling with custom components
- **Vitest**: Fast unit testing with React Testing Library
- **ESLint/Prettier**: Code quality and formatting standards