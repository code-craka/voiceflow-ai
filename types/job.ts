/**
 * Job Queue Types
 * Types for background job processing and transcription pipeline
 */

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "retrying";

export type JobType = "transcription" | "ai_processing";

export interface TranscriptionJobData {
  noteId: string;
  userId: string;
  audioUrl: string;
  audioBuffer?: Buffer | undefined;
  options?: {
    language?: string | undefined;
    enableSpeakerDiarization?: boolean | undefined;
    enablePunctuation?: boolean | undefined;
  } | undefined;
}

export interface AIProcessingJobData {
  noteId: string;
  userId: string;
  transcription: string;
}

export type JobData = TranscriptionJobData | AIProcessingJobData;

export interface Job<T extends JobData = JobData> {
  id: string;
  type: JobType;
  status: JobStatus;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  processingTime?: number;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
}
