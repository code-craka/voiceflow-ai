# Notes Types Improvements Summary

## Overview

Enhanced `types/notes.ts` to fully support VoiceFlow AI requirements with comprehensive type definitions for transcription, AI processing, content moderation, and search functionality.

## ✅ Improvements Made

### 1. **Added Validation Constants** (RECOMMENDED)

**Why**: Ensures consistency with database constraints and requirements across the codebase.

```typescript
export const NOTE_CONSTRAINTS = {
  TITLE_MAX_LENGTH: 255,
  AUDIO_URL_MAX_LENGTH: 500,
  ENCRYPTION_KEY_MAX_LENGTH: 255,
  MIN_TRANSCRIPTION_CONFIDENCE: 0.90, // Requirement 2.2
  MIN_CONTENT_MODERATION_CONFIDENCE: 0.98, // Requirement 3.5
  MAX_HALLUCINATION_RATE: 0.02, // Requirement 3.3
} as const;

export const PROCESSING_TARGETS = {
  TRANSCRIPTION_SPEED_MULTIPLIER: 5,
  MAX_TRANSCRIPTION_TIME_PER_MINUTE: 10,
  API_P95_RESPONSE_TIME: 500,
  SEARCH_RESPONSE_TIME: 100,
} as const;
```

**Benefits**:
- Single source of truth for validation rules
- Type-safe constants with `as const`
- Easy to update and maintain
- Aligns with Prisma schema constraints

### 2. **Added Speaker Diarization Support** (RECOMMENDED)

**Why**: Requirement 2.5 mandates speaker diarization when available.

```typescript
export interface SpeakerSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

// Added to Note interface
transcriptionSegments: SpeakerSegment[] | null;
```

**Benefits**:
- Supports multi-speaker transcriptions
- Enables timeline-based playback
- Improves transcription accuracy tracking
- Aligns with Deepgram/AssemblyAI capabilities

### 3. **Added AI Insights Structure** (RECOMMENDED)

**Why**: Requirement 3.2 requires extraction of key points, action items, and important dates.

```typescript
export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  priority?: "low" | "medium" | "high";
}

export interface ImportantDate {
  date: Date;
  context: string;
  type?: "deadline" | "meeting" | "reminder" | "event";
}

export interface AIInsights {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  importantDates: ImportantDate[];
  topics: string[];
  confidence: number;
}

// Added to Note interface
aiInsights: AIInsights | null;
```

**Benefits**:
- Structured data for AI-generated content
- Enables task management features
- Supports calendar integration
- Tracks AI confidence for hallucination prevention

### 4. **Added Content Moderation Types** (RECOMMENDED)

**Why**: Requirement 3.5 mandates content safety filtering with 98% precision.

```typescript
export interface ContentModeration {
  flagged: boolean;
  categories: {
    hate: boolean;
    harassment: boolean;
    selfHarm: boolean;
    sexual: boolean;
    violence: boolean;
  };
  categoryScores: {
    hate: number;
    harassment: number;
    selfHarm: number;
    sexual: number;
    violence: number;
  };
  confidence: number; // Target: ≥0.98
}

// Added to NoteMetadata
contentModeration?: ContentModeration;
```

**Benefits**:
- Comprehensive safety filtering
- Detailed category breakdown
- Confidence tracking for accuracy
- Aligns with OpenAI moderation API

### 5. **Added Structured Error Handling** (RECOMMENDED)

**Why**: Improves debugging and enables better fallback mechanisms.

```typescript
export enum NoteErrorCode {
  TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED",
  TRANSCRIPTION_TIMEOUT = "TRANSCRIPTION_TIMEOUT",
  AI_PROCESSING_FAILED = "AI_PROCESSING_FAILED",
  AI_PROCESSING_TIMEOUT = "AI_PROCESSING_TIMEOUT",
  AUDIO_ENCRYPTION_FAILED = "AUDIO_ENCRYPTION_FAILED",
  AUDIO_UPLOAD_FAILED = "AUDIO_UPLOAD_FAILED",
  INVALID_AUDIO_FORMAT = "INVALID_AUDIO_FORMAT",
  CONTENT_MODERATION_FAILED = "CONTENT_MODERATION_FAILED",
}

export interface NoteProcessingError {
  code: NoteErrorCode;
  message: string;
  provider?: TranscriptionProvider;
  retryable: boolean;
  fallbackAvailable: boolean;
  timestamp: Date;
  details?: Record<string, unknown>;
}

// Replaced errorMessage in NoteMetadata
error?: NoteProcessingError;
```

**Benefits**:
- Type-safe error codes
- Indicates retry and fallback availability
- Tracks which provider failed
- Better error reporting and monitoring

### 6. **Added Search and Filter Types** (RECOMMENDED)

**Why**: Requirement 4.2 requires full-text search with <100ms response time.

```typescript
export interface NoteSearchFilters {
  query?: string;
  folderId?: string;
  tagIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minDuration?: number;
  maxDuration?: number;
  processingStatus?: ProcessingStatus[];
  transcriptionProvider?: TranscriptionProvider[];
  minConfidence?: number;
}

export interface NoteSearchResult {
  note: Note;
  relevanceScore: number;
  matchedFields: string[];
  highlights: {
    field: string;
    snippet: string;
  }[];
}

export interface NoteSearchResponse {
  results: NoteSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  responseTime: number; // ms, target <100ms
}
```

**Benefits**:
- Comprehensive search filtering
- Relevance scoring for better results
- Highlights for user feedback
- Performance tracking (responseTime)

## 📊 Impact Analysis

### Database Schema Changes Needed

To support these new types, the Prisma schema will need updates:

```prisma
model Note {
  // ... existing fields ...
  
  // New fields to add:
  transcriptionSegments Json?  // Store SpeakerSegment[]
  aiInsights           Json?  // Store AIInsights
  
  // metadata already supports JSON, so ContentModeration and NoteProcessingError
  // can be stored in the existing metadata field
}
```

### Service Layer Updates Required

1. **Transcription Service** (`lib/services/transcription.ts`):
   - Return `SpeakerSegment[]` when diarization is available
   - Store segments in database

2. **AI Service** (`lib/services/ai.ts`):
   - Generate structured `AIInsights` instead of just summary
   - Extract action items and dates using GPT-4o
   - Implement content moderation checks

3. **Search Service** (`lib/services/search.ts`):
   - Implement `NoteSearchFilters` support
   - Return `NoteSearchResult[]` with relevance scoring
   - Track and return response time

### API Route Updates Required

1. **GET /api/notes/search**:
   - Accept `NoteSearchFilters` query parameters
   - Return `NoteSearchResponse`

2. **POST /api/notes**:
   - Handle new `aiInsights` and `transcriptionSegments` fields

3. **GET /api/notes/[id]**:
   - Include `aiInsights` and `transcriptionSegments` in response

## 🎯 Alignment with Requirements

| Requirement | Type Support | Status |
|-------------|--------------|--------|
| 2.2: 90%+ transcription accuracy | `transcriptionConfidence` | ✅ |
| 2.5: Speaker diarization | `SpeakerSegment[]` | ✅ |
| 3.1: AI summaries | `AIInsights.summary` | ✅ |
| 3.2: Key points, action items, dates | `AIInsights` | ✅ |
| 3.3: <2% hallucination rate | `AIInsights.confidence` | ✅ |
| 3.5: Content moderation (98% precision) | `ContentModeration` | ✅ |
| 4.2: Full-text search <100ms | `NoteSearchResponse` | ✅ |
| 7.2: API P95 <500ms | `PROCESSING_TARGETS` | ✅ |

## 🔄 Migration Path

### Phase 1: Database Migration
```bash
# Add new fields to Prisma schema
npx prisma migrate dev --name add_ai_insights_and_segments
```

### Phase 2: Service Updates
1. Update transcription service to return speaker segments
2. Update AI service to generate structured insights
3. Implement content moderation checks

### Phase 3: API Updates
1. Update note creation/update endpoints
2. Implement search endpoint with filters
3. Update response types

### Phase 4: Frontend Updates
1. Display speaker segments in UI
2. Show action items and important dates
3. Implement search with filters

## 📝 Usage Examples

### Creating a Note with AI Insights

```typescript
import type { Note, AIInsights, SpeakerSegment } from "@/types/notes";

const note: Note = {
  id: "uuid",
  userId: "user-uuid",
  folderId: null,
  title: "Team Meeting Notes",
  transcription: "Full transcription text...",
  transcriptionSegments: [
    {
      speaker: "Speaker 1",
      text: "Let's discuss the project timeline",
      startTime: 0,
      endTime: 5.2,
      confidence: 0.95,
    },
    // ... more segments
  ],
  summary: "Deprecated field",
  aiInsights: {
    summary: "Team discussed project timeline and deliverables",
    keyPoints: [
      "Q2 deadline confirmed",
      "Need 2 more developers",
      "Budget approved",
    ],
    actionItems: [
      {
        id: "action-1",
        text: "Hire 2 developers by end of month",
        completed: false,
        dueDate: new Date("2025-01-31"),
        priority: "high",
      },
    ],
    importantDates: [
      {
        date: new Date("2025-06-30"),
        context: "Q2 project deadline",
        type: "deadline",
      },
    ],
    topics: ["hiring", "timeline", "budget"],
    confidence: 0.92,
  },
  audioUrl: "s3://...",
  encryptedAudioKey: "...",
  duration: 1800,
  metadata: {
    processingStatus: "completed",
    transcriptionProvider: "deepgram",
    transcriptionConfidence: 0.94,
    aiProcessingStatus: "completed",
    contentModeration: {
      flagged: false,
      categories: {
        hate: false,
        harassment: false,
        selfHarm: false,
        sexual: false,
        violence: false,
      },
      categoryScores: {
        hate: 0.001,
        harassment: 0.002,
        selfHarm: 0.000,
        sexual: 0.001,
        violence: 0.000,
      },
      confidence: 0.99,
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Searching Notes

```typescript
import type { NoteSearchFilters, NoteSearchResponse } from "@/types/notes";

const filters: NoteSearchFilters = {
  query: "project timeline",
  dateFrom: new Date("2025-01-01"),
  dateTo: new Date("2025-12-31"),
  minConfidence: 0.90,
  processingStatus: ["completed"],
};

const response: NoteSearchResponse = await searchNotes(filters);

console.log(`Found ${response.totalCount} notes in ${response.responseTime}ms`);
response.results.forEach((result) => {
  console.log(`${result.note.title} (score: ${result.relevanceScore})`);
  result.highlights.forEach((highlight) => {
    console.log(`  ${highlight.field}: ${highlight.snippet}`);
  });
});
```

### Handling Errors

```typescript
import { NoteErrorCode, type NoteProcessingError } from "@/types/notes";

const error: NoteProcessingError = {
  code: NoteErrorCode.TRANSCRIPTION_FAILED,
  message: "Deepgram API timeout",
  provider: "deepgram",
  retryable: true,
  fallbackAvailable: true,
  timestamp: new Date(),
  details: {
    statusCode: 504,
    timeout: 30000,
  },
};

if (error.fallbackAvailable) {
  // Retry with AssemblyAI
  console.log("Retrying with fallback provider...");
}
```

## 🚀 Next Steps

1. **Update Prisma Schema**: Add `transcriptionSegments` and `aiInsights` JSON fields
2. **Run Migration**: Create and apply database migration
3. **Update Services**: Implement new type structures in service layer
4. **Update API Routes**: Support new fields in request/response
5. **Update Frontend**: Display new structured data
6. **Write Tests**: Add tests for new types and functionality

## 📚 Related Documentation

- [VoiceFlow AI Requirements](.kiro/specs/voiceflow-ai/requirements.md)
- [VoiceFlow AI Design](.kiro/specs/voiceflow-ai/design.md)
- [Notes Management](./NOTES_MANAGEMENT.md)
- [AI Processing](./AI_PROCESSING.md)
- [Transcription](./TRANSCRIPTION.md)

## ✅ Checklist

- [x] Add validation constants
- [x] Add speaker diarization types
- [x] Add AI insights structure
- [x] Add content moderation types
- [x] Add structured error handling
- [x] Add search and filter types
- [ ] Update Prisma schema
- [ ] Update transcription service
- [ ] Update AI service
- [ ] Update search service
- [ ] Update API routes
- [ ] Update frontend components
- [ ] Write tests
