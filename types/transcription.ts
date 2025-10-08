/**
 * Transcription Types
 * Types for audio transcription services and results
 */

export interface TranscriptionOptions {
  language?: string | undefined;
  model?: string | undefined;
  enableSpeakerDiarization?: boolean | undefined;
  enablePunctuation?: boolean | undefined;
  enableUtterances?: boolean | undefined;
}

export interface SpeakerSegment {
  speaker: number;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  speakers?: SpeakerSegment[] | undefined;
  words?: TranscriptionWord[] | undefined;
  processingTime: number;
  provider: "deepgram" | "assemblyai";
  metadata?: {
    duration?: number | undefined;
    language?: string | undefined;
    model?: string | undefined;
  } | undefined;
}

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export interface TranscriptionError {
  code: string;
  message: string;
  provider: "deepgram" | "assemblyai";
  retryable: boolean;
  originalError?: unknown;
}

export type TranscriptionProvider = "deepgram" | "assemblyai";

export interface TranscriptionServiceConfig {
  apiKey: string;
  model?: string;
  language?: string;
  timeout?: number;
}
