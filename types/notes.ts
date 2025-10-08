/**
 * Supported transcription service providers
 * Primary: Deepgram Nova-2 (90%+ accuracy target)
 * Fallback: AssemblyAI (automatic failover)
 * Requirement 2.1-2.5: Transcription with fallback
 */
export type TranscriptionProvider = "deepgram" | "assemblyai";

/**
 * AI content processing status
 * Requirement 3.1-3.5: AI-powered content processing
 */
export type AIProcessingStatus = "pending" | "completed" | "failed";

/**
 * Note processing pipeline stages
 * Tracks progress through transcription and AI processing
 */
export type ProcessingStatus =
  | "pending"
  | "transcribing"
  | "processing_ai"
  | "completed"
  | "failed";

/**
 * Note validation constraints
 * Aligned with Prisma schema and performance requirements
 */
export const NOTE_CONSTRAINTS = {
  TITLE_MAX_LENGTH: 255,
  AUDIO_URL_MAX_LENGTH: 500,
  ENCRYPTION_KEY_MAX_LENGTH: 255,
  MIN_TRANSCRIPTION_CONFIDENCE: 0.90, // Requirement 2.2
  MIN_CONTENT_MODERATION_CONFIDENCE: 0.98, // Requirement 3.5
  MAX_HALLUCINATION_RATE: 0.02, // Requirement 3.3: <2% hallucination
} as const;

/**
 * Processing time targets
 * Requirements 2.1, 7.2, 7.3
 */
export const PROCESSING_TARGETS = {
  TRANSCRIPTION_SPEED_MULTIPLIER: 5, // 5-10x real-time
  MAX_TRANSCRIPTION_TIME_PER_MINUTE: 10, // seconds
  API_P95_RESPONSE_TIME: 500, // ms
  SEARCH_RESPONSE_TIME: 100, // ms
} as const;

/**
 * Represents a voice note with transcription and AI-generated content
 * 
 * @property id - Unique note identifier (UUID)
 * @property userId - Owner of the note
 * @property folderId - Optional folder for organization
 * @property title - Note title (max 255 characters)
 * @property transcription - Full text transcription from audio
 * @property transcriptionSegments - Speaker diarization segments (Requirement 2.5)
 * @property summary - AI-generated summary via GPT-4o (deprecated: use aiInsights)
 * @property aiInsights - Structured AI-generated insights (summaries, action items, dates)
 * @property audioUrl - S3 URL to encrypted audio file
 * @property encryptedAudioKey - AES-256-GCM encryption key for audio
 * @property duration - Audio duration in seconds
 * @property metadata - Processing status and provider information
 * @property tags - Optional tags for categorization (loaded on demand)
 * @property folder - Optional folder relation (loaded on demand)
 */
export interface Note {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  transcription: string | null;
  transcriptionSegments: SpeakerSegment[] | null;
  summary: string | null; // Deprecated: use aiInsights.summary
  aiInsights: AIInsights | null;
  audioUrl: string | null;
  encryptedAudioKey: string | null;
  duration: number | null;
  metadata: NoteMetadata | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: Tag[];
  folder?: Folder | null;
}

/**
 * Speaker segment from diarization
 * Requirement 2.5: Speaker diarization support
 */
export interface SpeakerSegment {
  speaker: string; // "Speaker 1", "Speaker 2", etc.
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence: number; // 0-1
}

/**
 * AI-extracted action item from note content
 * Requirement 3.2: Extract action items from content
 */
export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date;
  priority?: "low" | "medium" | "high";
}

/**
 * Important date extracted from note content
 * Requirement 3.2: Extract important dates
 */
export interface ImportantDate {
  date: Date;
  context: string;
  type?: "deadline" | "meeting" | "reminder" | "event";
}

/**
 * AI-generated content insights
 * Requirement 3.1-3.2: Summaries, key points, action items, dates
 */
export interface AIInsights {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  importantDates: ImportantDate[];
  topics: string[];
  confidence: number; // 0-1, hallucination prevention metric
}

/**
 * Content moderation result from AI safety filters
 * Requirement 3.5: 98% precision content moderation
 */
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

/**
 * Note processing error codes
 */
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

/**
 * Structured error information for note processing
 * Improves error handling and debugging
 */
export interface NoteProcessingError {
  code: NoteErrorCode;
  message: string;
  provider?: TranscriptionProvider;
  retryable: boolean;
  fallbackAvailable: boolean;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * Metadata tracking note processing pipeline status
 * 
 * @property processingStatus - Current stage in transcription/AI pipeline
 * @property transcriptionProvider - Which service was used (Deepgram primary, AssemblyAI fallback)
 * @property transcriptionConfidence - Accuracy score (0-1), target ≥0.90
 * @property aiProcessingStatus - GPT-4o processing state
 * @property contentModeration - Content safety check results
 * @property error - Structured error information if processing failed
 */
export interface NoteMetadata {
  processingStatus: ProcessingStatus;
  transcriptionProvider?: TranscriptionProvider;
  transcriptionConfidence?: number;
  aiProcessingStatus?: AIProcessingStatus;
  contentModeration?: ContentModeration;
  error?: NoteProcessingError;
}

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  /** Note title (max 255 characters) */
  title: string;
  /** Optional folder ID (must be owned by user) */
  folderId?: string;
  /** S3 URL to encrypted audio file */
  audioUrl?: string;
  /** AES-256-GCM encryption key */
  encryptedAudioKey?: string;
  /** Audio duration in seconds (must be positive) */
  duration?: number;
  /** Optional processing metadata */
  metadata?: Partial<NoteMetadata>;
}

/**
 * Input for updating an existing note
 */
export interface UpdateNoteInput {
  /** Updated title (max 255 characters) */
  title?: string;
  /** Move to folder or remove from folder (null) */
  folderId?: string | null;
  /** Updated transcription text */
  transcription?: string;
  /** Updated AI-generated summary */
  summary?: string;
  /** Updated processing metadata */
  metadata?: Partial<NoteMetadata>;
}

/**
 * Hierarchical folder for organizing notes
 * 
 * @property parentId - Parent folder for nested structure (null for root)
 * @property parent - Optional parent folder relation (loaded on demand)
 * @property children - Optional child folders (loaded on demand)
 */
export interface Folder {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
  parent?: Folder | null;
  children?: Folder[];
}

/**
 * Tag for categorizing notes
 * 
 * @property name - Tag name (max 100 characters, unique per user, case-insensitive)
 */
export interface Tag {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
}

/**
 * Input for creating a new folder
 */
export interface CreateFolderInput {
  /** Folder name (max 255 characters, must be unique per user) */
  name: string;
  /** Optional parent folder for hierarchical structure */
  parentId?: string;
}

/**
 * Input for updating an existing folder
 */
export interface UpdateFolderInput {
  /** Updated folder name (max 255 characters) */
  name?: string;
  /** Move to parent folder or make root (null) */
  parentId?: string | null;
}

/**
 * Input for creating a new tag
 */
export interface CreateTagInput {
  /** Tag name (max 100 characters, unique per user, case-insensitive) */
  name: string;
}

/**
 * Input for assigning tags to a note
 */
export interface AssignTagsInput {
  /** Note to tag */
  noteId: string;
  /** Array of tag IDs to assign */
  tagIds: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Note without relations (for database queries)
 */
export type NoteWithoutRelations = Omit<Note, "tags" | "folder">;

/**
 * Note creation data (excludes auto-generated fields)
 */
export type NoteCreateData = Omit<Note, "id" | "createdAt" | "updatedAt" | "tags" | "folder">;

/**
 * Folder with full hierarchy
 */
export type FolderWithHierarchy = Folder & {
  parent: Folder | null;
  children: Folder[];
};

// ============================================================================
// Search and Filter Types
// ============================================================================

/**
 * Search filters for notes
 * Requirement 4.2: Full-text search with <100ms response time
 */
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

/**
 * Search result with relevance scoring
 */
export interface NoteSearchResult {
  note: Note;
  relevanceScore: number;
  matchedFields: string[];
  highlights: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Paginated search response
 * Requirement 4.2: <100ms response time
 */
export interface NoteSearchResponse {
  results: NoteSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  responseTime: number; // ms, target <100ms
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * API response wrapper for note operations
 */
export interface NoteResponse {
  note: Note;
  message?: string;
}

/**
 * API response for listing notes
 */
export interface NotesListResponse {
  notes: Note[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * API response for folder with contents
 */
export interface FolderWithNotesResponse {
  folder: Folder;
  notes: Note[];
  subfolders: Folder[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if metadata indicates processing completion
 */
export function isNoteProcessed(note: Note): boolean {
  return note.metadata?.processingStatus === "completed";
}

/**
 * Type guard to check if note has transcription
 */
export function hasTranscription(note: Note): note is Note & { transcription: string } {
  return note.transcription !== null && note.transcription.length > 0;
}

/**
 * Type guard to check if note has AI summary
 */
export function hasSummary(note: Note): note is Note & { summary: string } {
  return note.summary !== null && note.summary.length > 0;
}

/**
 * Type guard to check if note has audio
 */
export function hasAudio(note: Note): note is Note & { audioUrl: string; encryptedAudioKey: string } {
  return note.audioUrl !== null && note.encryptedAudioKey !== null;
}
