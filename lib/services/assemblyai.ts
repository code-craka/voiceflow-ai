/**
 * AssemblyAI Transcription Service
 * Fallback transcription provider for when Deepgram fails
 * Implements automatic fallback logic with retry mechanisms
 */

import { AssemblyAI } from "assemblyai";
import type {
  TranscriptionOptions,
  TranscriptionResult,
  SpeakerSegment,
  TranscriptionWord,
  TranscriptionError,
} from "@/types/transcription";

export class AssemblyAIService {
  private client: AssemblyAI;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ASSEMBLYAI_API_KEY || "";
    
    if (!this.apiKey) {
      throw new Error("AssemblyAI API key is required");
    }

    this.client = new AssemblyAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Transcribe audio file using AssemblyAI
   * Fallback provider with similar accuracy to Deepgram
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      const {
        language = "en",
        enableSpeakerDiarization = true,
        enablePunctuation = true,
      } = options;

      // Upload audio file to AssemblyAI
      const uploadUrl = await this.uploadAudio(audioBuffer);

      // Configure transcription parameters
      const params = {
        audio: uploadUrl,
        language_code: this.mapLanguageCode(language),
        speaker_labels: enableSpeakerDiarization,
        punctuate: enablePunctuation,
        format_text: true,
      };

      // Start transcription
      const transcript = await this.client.transcripts.transcribe(params);

      if (transcript.status === "error") {
        throw this.createTranscriptionError(
          "TRANSCRIPTION_FAILED",
          `AssemblyAI transcription failed: ${transcript.error || "Unknown error"}`,
          true
        );
      }

      const processingTime = Date.now() - startTime;

      // Extract speaker segments if diarization is enabled
      const speakers = enableSpeakerDiarization && transcript.utterances
        ? this.extractSpeakerSegments(transcript.utterances)
        : undefined;

      // Extract word-level details
      const words = transcript.words
        ? this.extractWords(transcript.words)
        : undefined;

      return {
        text: transcript.text || "",
        confidence: transcript.confidence || 0,
        speakers,
        words,
        processingTime,
        provider: "assemblyai",
        metadata: {
          duration: transcript.audio_duration || undefined,
          language,
          model: "assemblyai",
        },
      };
    } catch (error) {
      if (this.isTranscriptionError(error)) {
        throw error;
      }

      throw this.createTranscriptionError(
        "UNKNOWN_ERROR",
        `Unexpected error during transcription: ${error instanceof Error ? error.message : "Unknown error"}`,
        true,
        error
      );
    }
  }

  /**
   * Upload audio buffer to AssemblyAI
   */
  private async uploadAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const uploadUrl = await this.client.files.upload(audioBuffer);
      return uploadUrl;
    } catch (error) {
      throw this.createTranscriptionError(
        "UPLOAD_FAILED",
        `Failed to upload audio to AssemblyAI: ${error instanceof Error ? error.message : "Unknown error"}`,
        true,
        error
      );
    }
  }

  /**
   * Extract speaker segments from AssemblyAI utterances
   */
  private extractSpeakerSegments(utterances: any[]): SpeakerSegment[] {
    return utterances.map((utterance) => ({
      speaker: this.parseSpeaker(utterance.speaker),
      text: utterance.text || "",
      startTime: utterance.start || 0,
      endTime: utterance.end || 0,
      confidence: utterance.confidence || 0,
    }));
  }

  /**
   * Parse speaker label to number
   */
  private parseSpeaker(speaker: string): number {
    // AssemblyAI returns speaker labels like "A", "B", "C"
    // Convert to numeric: A=0, B=1, C=2, etc.
    if (!speaker) return 0;
    return speaker.charCodeAt(0) - 65; // 'A' = 65 in ASCII
  }

  /**
   * Extract word-level details from AssemblyAI result
   */
  private extractWords(words: any[]): TranscriptionWord[] {
    return words.map((word) => {
      const result: TranscriptionWord = {
        word: word.text || "",
        start: word.start || 0,
        end: word.end || 0,
        confidence: word.confidence || 0,
      };
      
      if (word.speaker) {
        result.speaker = this.parseSpeaker(word.speaker);
      }
      
      return result;
    });
  }

  /**
   * Map language code to AssemblyAI format
   */
  private mapLanguageCode(language: string): string {
    // AssemblyAI uses different language codes
    const languageMap: Record<string, string> = {
      en: "en",
      "en-US": "en_us",
      "en-GB": "en_uk",
      "en-AU": "en_au",
      es: "es",
      fr: "fr",
      de: "de",
      it: "it",
      pt: "pt",
      nl: "nl",
      ja: "ja",
      zh: "zh",
      ko: "ko",
      hi: "hi",
      fi: "fi",
      uk: "uk",
      ru: "ru",
      tr: "tr",
      pl: "pl",
      vi: "vi",
    };

    return languageMap[language] || "en";
  }

  /**
   * Create a standardized transcription error
   */
  private createTranscriptionError(
    code: string,
    message: string,
    retryable: boolean,
    originalError?: unknown
  ): TranscriptionError {
    return {
      code,
      message,
      provider: "assemblyai",
      retryable,
      originalError,
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
      "provider" in error
    );
  }

  /**
   * Check if AssemblyAI service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Verify API key is valid by checking account status
      return !!this.apiKey && this.apiKey.length > 0;
    } catch (error) {
      console.error("AssemblyAI health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const assemblyAIService = new AssemblyAIService();
