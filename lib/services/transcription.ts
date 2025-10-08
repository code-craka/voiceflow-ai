/**
 * Transcription Service with Fallback
 * Orchestrates transcription with automatic fallback from Deepgram to AssemblyAI
 * Implements retry mechanisms with exponential backoff
 */

import { deepgramService } from "./deepgram";
import { assemblyAIService } from "./assemblyai";
import type {
  TranscriptionOptions,
  TranscriptionResult,
  TranscriptionChunk,
  TranscriptionError,
  TranscriptionProvider,
} from "@/types/transcription";

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export class TranscriptionService {
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Transcribe audio with automatic fallback
   * Primary: Deepgram Nova-2
   * Fallback: AssemblyAI
   * 
   * Requirements: 2.1, 2.2, 2.4
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    let lastError: TranscriptionError | null = null;

    // Try Deepgram first (primary provider)
    try {
      console.log("Attempting transcription with Deepgram...");
      const result = await this.transcribeWithRetry(
        () => deepgramService.transcribeAudio(audioBuffer, options),
        "deepgram"
      );
      console.log("Deepgram transcription successful");
      return result;
    } catch (error) {
      console.error("Deepgram transcription failed:", error);
      lastError = this.normalizeError(error, "deepgram");
      
      // Only fallback if error is retryable
      if (!lastError.retryable) {
        throw lastError;
      }
    }

    // Fallback to AssemblyAI
    try {
      console.log("Falling back to AssemblyAI...");
      const result = await this.transcribeWithRetry(
        () => assemblyAIService.transcribeAudio(audioBuffer, options),
        "assemblyai"
      );
      console.log("AssemblyAI transcription successful (fallback)");
      return result;
    } catch (error) {
      console.error("AssemblyAI transcription failed:", error);
      const assemblyError = this.normalizeError(error, "assemblyai");
      
      // Throw combined error indicating both providers failed
      throw this.createCombinedError(lastError, assemblyError);
    }
  }

  /**
   * Stream transcription with real-time results
   * Only supports Deepgram (primary provider)
   * 
   * Requirements: 2.3
   */
  async *streamTranscription(
    audioStream: ReadableStream<Uint8Array>,
    options: TranscriptionOptions = {}
  ): AsyncGenerator<TranscriptionChunk> {
    try {
      console.log("Starting streaming transcription with Deepgram...");
      yield* deepgramService.streamTranscription(audioStream, options);
    } catch (error) {
      console.error("Streaming transcription failed:", error);
      throw this.normalizeError(error, "deepgram");
    }
  }

  /**
   * Transcribe with retry logic and exponential backoff
   */
  private async transcribeWithRetry(
    transcribeFn: () => Promise<TranscriptionResult>,
    provider: TranscriptionProvider
  ): Promise<TranscriptionResult> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(
            `Retry attempt ${attempt}/${this.retryConfig.maxRetries} for ${provider} after ${delay}ms`
          );
          await this.sleep(delay);
          
          // Exponential backoff
          delay = Math.min(
            delay * this.retryConfig.backoffMultiplier,
            this.retryConfig.maxDelayMs
          );
        }

        return await transcribeFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is retryable
        const transcriptionError = this.normalizeError(error, provider);
        if (!transcriptionError.retryable) {
          throw transcriptionError;
        }

        // If this was the last attempt, throw the error
        if (attempt === this.retryConfig.maxRetries) {
          throw transcriptionError;
        }
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError || new Error("Transcription failed after all retries");
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Normalize error to TranscriptionError format
   */
  private normalizeError(
    error: unknown,
    provider: TranscriptionProvider
  ): TranscriptionError {
    if (this.isTranscriptionError(error)) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    
    return {
      code: "UNKNOWN_ERROR",
      message,
      provider,
      retryable: true,
      originalError: error,
    };
  }

  /**
   * Create combined error when both providers fail
   */
  private createCombinedError(
    deepgramError: TranscriptionError | null,
    assemblyError: TranscriptionError
  ): TranscriptionError {
    const message = deepgramError
      ? `Both transcription providers failed. Deepgram: ${deepgramError.message}. AssemblyAI: ${assemblyError.message}`
      : `Transcription failed: ${assemblyError.message}`;

    return {
      code: "ALL_PROVIDERS_FAILED",
      message,
      provider: "assemblyai",
      retryable: false,
      originalError: {
        deepgram: deepgramError,
        assemblyai: assemblyError,
      },
    };
  }

  /**
   * Type guard for TranscriptionError
   */
  private isTranscriptionError(error: unknown): error is TranscriptionError {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "provider" in error &&
      "retryable" in error
    );
  }

  /**
   * Check health of transcription services
   */
  async healthCheck(): Promise<{
    deepgram: boolean;
    assemblyai: boolean;
    overall: boolean;
  }> {
    const [deepgramHealthy, assemblyaiHealthy] = await Promise.all([
      deepgramService.healthCheck().catch(() => false),
      assemblyAIService.healthCheck().catch(() => false),
    ]);

    return {
      deepgram: deepgramHealthy,
      assemblyai: assemblyaiHealthy,
      overall: deepgramHealthy || assemblyaiHealthy, // At least one must be healthy
    };
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
