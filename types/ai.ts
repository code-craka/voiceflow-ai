/**
 * AI Content Processing Types
 * Types for AI-powered content analysis and generation
 * 
 * Usage:
 *   import type { ContentSummary, AIProcessingResult } from '@/types/ai';
 */

export interface ActionItem {
  text: string;
  priority?: "high" | "medium" | "low";
  dueDate?: Date;
  completed: boolean;
}

export interface ImportantDate {
  date: Date;
  context: string;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
}

export interface ContentInsights {
  keyTopics: string[];
  actionItems: ActionItem[];
  importantDates: ImportantDate[];
  sentiment?: "positive" | "neutral" | "negative";
  entities?: Entity[];
}

export interface ContentSummary {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  importantDates: ImportantDate[];
  /** Confidence score. Range: 0.0 to 1.0 */
  confidence: number;
  wordCount: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

export interface ModerationResult {
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
  precision: number;
}

export interface AIProcessingOptions {
  model?: "gpt-4o" | "gpt-4" | "gpt-3.5-turbo";
  /** Temperature for response randomness. Range: 0.0 to 2.0. Default: 0.7 */
  temperature?: number;
  /** Maximum tokens in response. Range: 1 to 4096. Default: 1000 */
  maxTokens?: number;
  enableModeration?: boolean;
  /** Cache key for Redis. If provided, response will be cached. */
  cacheKey?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIProcessingResult {
  summary: ContentSummary;
  insights: ContentInsights;
  moderation?: ModerationResult;
  cached: boolean;
  model: string;
  /** True if fallback model was used due to primary model failure */
  usedFallback: boolean;
  /** Original model that was attempted before fallback */
  requestedModel?: string;
  tokenUsage: TokenUsage;
  /** Cost in USD */
  cost: number;
}

export interface AIError {
  code: string;
  message: string;
  retryable: boolean;
  fallbackAvailable: boolean;
  originalError?: unknown;
}

export interface AIServiceConfig {
  apiKey: string;
  model: "gpt-4o" | "gpt-4" | "gpt-3.5-turbo";
  temperature: number;
  maxTokens: number;
  timeout: number;
}
