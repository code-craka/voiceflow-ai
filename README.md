# VoiceFlow AI

VoiceFlow AI is a production-ready voice note-taking application that combines real-time audio recording, AI-powered transcription, and intelligent content processing.

## Features

- **Voice Recording**: Browser-based audio capture with real-time feedback
- **AI Transcription**: Automatic speech-to-text with 90%+ accuracy using Deepgram Nova-2
- **Smart Processing**: AI-powered summaries, key points, and action item extraction using GPT-4o
- **Organization**: Hierarchical folders, tagging, and full-text search
- **Security**: End-to-end encryption with AES-256-GCM and GDPR compliance
- **Performance**: Sub-500ms API responses with 5-10x real-time transcription speed

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI Services**: Deepgram Nova-2, AssemblyAI (fallback), OpenAI GPT-4o
- **Storage**: S3-compatible encrypted object storage
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
- `DEEPGRAM_API_KEY`: Primary transcription service
- `ASSEMBLYAI_API_KEY`: Fallback transcription service
- `OPENAI_API_KEY`: AI content processing
- `S3_*`: Storage configuration
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

## Project Structure

```
voiceflow-ai/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities and services
│   ├── types/               # TypeScript definitions
│   └── hooks/               # Custom React hooks
├── prisma/                  # Database schema and migrations
├── tests/                   # Test files
└── .kiro/                   # Kiro AI assistant configuration
```

## Performance Targets

- Time to First Byte: <200ms
- API Response Times: P95 <500ms
- Transcription Speed: 5-10x real-time
- Search Response: <100ms
- CDN Cache Hit Rate: 99%

## Security & Compliance

- End-to-end encryption with AES-256-GCM
- GDPR-compliant data handling
- User-controlled encryption keys
- Comprehensive audit logging
- TLS 1.3 for all communications

## License

[License information]