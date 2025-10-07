# Project Structure & Organization

## Directory Structure

```
voiceflow-ai/
├── app/                       # Next.js 15 App Router
│   ├── api/                   # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── audio/             # Audio upload/processing
│   │   ├── transcription/     # Transcription services
│   │   ├── ai/                # AI content processing
│   │   ├── notes/             # Notes CRUD operations
│   │   └── gdpr/              # GDPR compliance endpoints
│   ├── dashboard/             # Main app pages
│   ├── auth/                  # Authentication pages
│   └── globals.css            # Global styles
├── components/                # React components
│   ├── ui/                    # Reusable UI components
│   ├── audio/                 # Audio recording components
│   ├── notes/                 # Notes management components
│   └── layout/                # Layout components
├── lib/                       # Utility libraries
│   ├── services/              # Business logic services
│   │   ├── audio.ts           # Audio processing service
│   │   ├── transcription.ts   # Transcription service
│   │   ├── ai.ts              # AI content service
│   │   ├── encryption.ts      # Encryption service
│   │   └── search.ts          # Search service
│   ├── db/                    # Database utilities
│   ├── auth/                  # Authentication utilities
│   ├── validation/            # Input validation schemas
│   ├── arcjet.ts              # Arcjet security configurations
│   └── utils.ts               # General utilities
├── types/                     # TypeScript type definitions
│   ├── api.ts                 # API response types
│   ├── audio.ts               # Audio-related types
│   ├── notes.ts               # Notes and content types
│   └── user.ts                # User and auth types
├── hooks/                     # Custom React hooks
├── prisma/                    # Database schema and migrations
│   ├── schema.prisma          # Prisma schema definition
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seeding
├── public/                    # Static assets
├── tests/                     # Test files
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── performance/           # Performance tests
├── docs/                      # Documentation
└── .kiro/                     # Kiro configuration
    ├── specs/                 # Project specifications
    └── steering/              # AI assistant guidelines
```

## File Naming Conventions

### Components

- Use PascalCase for component files: `AudioRecorder.tsx`
- Use kebab-case for component directories: `audio-recorder/`
- Include component type in name: `AudioRecorderButton.tsx`

### Services

- Use camelCase for service files: `transcriptionService.ts`
- Group related services in directories: `services/audio/`
- Include service suffix: `audioProcessingService.ts`

### API Routes

- Use kebab-case for route directories: `api/voice-notes/`
- Use HTTP method prefixes for clarity: `route.ts` (Next.js 15 convention)
- Group by feature: `api/transcription/[id]/route.ts`

### Types

- Use PascalCase for type names: `AudioRecordingResult`
- Use camelCase for interface properties: `audioUrl`, `processingTime`
- Suffix interfaces with appropriate type: `AudioService`, `TranscriptionResult`

## Code Organization Patterns

### Service Layer Pattern

- All business logic in `lib/services/`
- Services are stateless and dependency-injected
- Each service handles one domain (audio, transcription, AI, etc.)
- Services implement interfaces for testability

### API Route Structure

```typescript
// app/api/audio/upload/route.ts
import { ajAI, handleArcjetDecision } from "@/lib/arcjet";

export async function POST(request: Request) {
  // 1. Arcjet security protection
  const decision = await ajAI.protect(request, { requested: 2 });
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;
  
  // 2. Input validation
  // 3. Authentication check
  // 4. Business logic (via service)
  // 5. Error handling
  // 6. Response formatting
}
```

### Component Structure

```typescript
// components/audio/AudioRecorder.tsx
interface AudioRecorderProps {
  // Props interface
}

export function AudioRecorder({}: AudioRecorderProps) {
  // 1. State management
  // 2. Effect hooks
  // 3. Event handlers
  // 4. Render logic
}
```

### Database Access Pattern

- All database operations through Prisma ORM
- Use repository pattern for complex queries
- Implement proper error handling and transactions
- Include audit logging for GDPR compliance

## Import Organization

### Import Order

1. React and Next.js imports
2. Third-party library imports
3. Internal service imports
4. Component imports
5. Type imports
6. Relative imports

### Path Aliases

```typescript
// Use absolute imports with path aliases
import { AudioService } from "@/lib/services/audio";
import { Button } from "@/components/ui/button";
import { AudioRecordingResult } from "@/types/audio";
```

## Environment Configuration

### Environment Files

- `.env.local` - Local development secrets
- `.env.example` - Template with all required variables
- `.env.production` - Production environment variables

### Required Environment Variables

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# AI Services
DEEPGRAM_API_KEY=
ASSEMBLYAI_API_KEY=
OPENAI_API_KEY=

# Storage
S3_BUCKET_NAME=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# Security
ENCRYPTION_KEY=
JWT_SECRET=
```

## Testing Organization

### Test File Naming

- Unit tests: `audioService.test.ts`
- Integration tests: `audioProcessing.integration.test.ts`
- Component tests: `AudioRecorder.test.tsx`

### Test Structure

```typescript
describe("AudioService", () => {
  describe("uploadAudio", () => {
    it("should encrypt and store audio file", async () => {
      // Arrange, Act, Assert pattern
    });
  });
});
```

## Documentation Standards

### Code Comments

- Use JSDoc for public APIs and complex functions
- Include performance considerations for critical paths
- Document security implications for sensitive operations
- Explain business logic and GDPR compliance requirements

### README Structure

- Quick start guide with common commands
- Environment setup instructions
- API documentation links
- Deployment procedures
