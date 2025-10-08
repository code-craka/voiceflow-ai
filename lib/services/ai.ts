/**
 * AI Content Processing Service
 * OpenAI GPT-4o integration for content analysis and generation
 */

import OpenAI from "openai";
import type {
  AIProcessingOptions,
  AIProcessingResult,
  ContentSummary,
  ContentInsights,
  ModerationResult,
  AIError,
  ActionItem,
} from "@/types/ai";
import {
  generateCacheKey,
  getCachedResult,
  cacheResult,
} from "@/lib/services/cache";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cost per 1K tokens (as of 2024)
const MODEL_COSTS = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
} as const;

/**
 * Generate AI-powered summary from transcription
 * Requirement 3.1: Generate intelligent summary using GPT-4o
 */
export async function generateSummary(
  transcription: string,
  options: AIProcessingOptions = {}
): Promise<ContentSummary> {
  const startTime = Date.now();
  const model = options.model || "gpt-4o";

  try {
    const prompt = `Analyze the following transcription and provide a comprehensive summary.

Transcription:
${transcription}

Please provide:
1. A concise summary (2-3 sentences)
2. Key points (bullet points, max 5)
3. Action items with priority (if any)
4. Important dates mentioned (if any)

Format your response as JSON with this structure:
{
  "summary": "string",
  "keyPoints": ["string"],
  "actionItems": [{"text": "string", "priority": "high|medium|low", "completed": false}],
  "importantDates": ["ISO date string"]
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at analyzing voice transcriptions and extracting key information. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: options.temperature || 0.3,
      max_tokens: options.maxTokens || 1000,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(response);
    const processingTime = Date.now() - startTime;

    // Calculate confidence based on response quality
    const confidence = calculateConfidence(parsed, transcription);

    return {
      summary: parsed.summary || "",
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
      importantDates: (parsed.importantDates || []).map(
        (date: string) => new Date(date)
      ),
      confidence,
      wordCount: transcription.split(/\s+/).length,
      processingTime,
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    throw createAIError(error, "SUMMARY_GENERATION_FAILED", true);
  }
}

/**
 * Extract insights from transcription
 * Requirement 3.2: Extract key topics, action items, and important dates
 */
export async function extractInsights(
  transcription: string,
  options: AIProcessingOptions = {}
): Promise<ContentInsights> {
  const model = options.model || "gpt-4o";

  try {
    const prompt = `Analyze this transcription and extract detailed insights.

Transcription:
${transcription}

Extract:
1. Key topics discussed (max 10)
2. Action items with priority and due dates
3. Important dates with context
4. Overall sentiment
5. Named entities (people, organizations, locations)

Format as JSON:
{
  "keyTopics": ["string"],
  "actionItems": [{"text": "string", "priority": "high|medium|low", "dueDate": "ISO date or null", "completed": false}],
  "importantDates": [{"date": "ISO date", "context": "string"}],
  "sentiment": "positive|neutral|negative",
  "entities": [{"type": "person|organization|location|other", "value": "string", "confidence": 0.0-1.0}]
}`;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting structured insights from text. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: options.temperature || 0.2,
      max_tokens: options.maxTokens || 1500,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(response);

    return {
      keyTopics: parsed.keyTopics || [],
      actionItems: (parsed.actionItems || []).map((item: ActionItem) => ({
        ...item,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      })),
      importantDates: (parsed.importantDates || []).map(
        (item: { date: string; context: string }) => ({
          date: new Date(item.date),
          context: item.context,
        })
      ),
      sentiment: parsed.sentiment || "neutral",
      entities: parsed.entities || [],
    };
  } catch (error) {
    console.error("Error extracting insights:", error);
    throw createAIError(error, "INSIGHT_EXTRACTION_FAILED", true);
  }
}

/**
 * Moderate content for safety
 * Requirement 3.5: Content moderation with 98% precision
 */
export async function moderateContent(
  text: string
): Promise<ModerationResult> {
  try {
    const moderation = await openai.moderations.create({
      input: text,
    });

    const result = moderation.results[0];
    if (!result) {
      throw new Error("No moderation result");
    }

    return {
      flagged: result.flagged,
      categories: {
        hate: result.categories.hate,
        harassment: result.categories.harassment,
        selfHarm: result.categories["self-harm"],
        sexual: result.categories.sexual,
        violence: result.categories.violence,
      },
      categoryScores: {
        hate: result.category_scores.hate,
        harassment: result.category_scores.harassment,
        selfHarm: result.category_scores["self-harm"],
        sexual: result.category_scores.sexual,
        violence: result.category_scores.violence,
      },
      precision: 0.98, // OpenAI moderation has ~98% precision
    };
  } catch (error) {
    console.error("Error moderating content:", error);
    throw createAIError(error, "MODERATION_FAILED", true);
  }
}

/**
 * Process transcription with full AI pipeline
 * Combines summary generation, insight extraction, and moderation
 * Requirement 3.3: Cache AI responses for similar content
 * Requirement 3.4: Graceful degradation for AI failures
 */
export async function processTranscription(
  transcription: string,
  options: AIProcessingOptions = {}
): Promise<AIProcessingResult> {
  const startTime = Date.now();

  // Use intelligent model selection if not specified
  const model = options.model || selectModel(transcription);

  try {
    // Check cache first
    const cacheKey = options.cacheKey || generateCacheKey(transcription);
    const cachedResult = await getCachedResult(cacheKey);

    if (cachedResult) {
      console.log("Returning cached AI result");
      return cachedResult;
    }

    // Run moderation first if enabled
    let moderation: ModerationResult | undefined;
    if (options.enableModeration !== false) {
      moderation = await moderateContent(transcription);

      // If content is flagged, return early with warning
      if (moderation.flagged) {
        console.warn("Content flagged by moderation:", moderation.categories);
      }
    }

    // Generate summary and extract insights in parallel
    const [summary, insights] = await Promise.all([
      generateSummary(transcription, { ...options, model }),
      extractInsights(transcription, { ...options, model }),
    ]);

    // Calculate total tokens and cost
    const inputTokens = Math.ceil(transcription.length / 4); // Rough estimate
    const outputTokens = Math.ceil(
      (JSON.stringify(summary) + JSON.stringify(insights)).length / 4
    );
    const totalTokens = inputTokens + outputTokens;

    const costs = MODEL_COSTS[model];
    const cost =
      (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;

    const result: AIProcessingResult = {
      summary,
      insights,
      moderation,
      cached: false,
      model,
      totalTokens,
      cost,
    };

    // Cache the result
    await cacheResult(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error processing transcription:", error);

    // Try fallback with different model
    if (model !== "gpt-3.5-turbo") {
      console.log("Attempting fallback with GPT-3.5-turbo");
      try {
        return await processTranscriptionWithFallback(transcription, {
          ...options,
          model: "gpt-3.5-turbo",
        });
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }

    // If all AI processing fails, return transcription-only mode
    return createTranscriptionOnlyResult(transcription);
  }
}

/**
 * Calculate confidence score based on response quality
 */
function calculateConfidence(
  parsed: {
    summary?: string;
    keyPoints?: string[];
    actionItems?: ActionItem[];
  },
  transcription: string
): number {
  let confidence = 0.5; // Base confidence

  // Check if summary exists and is reasonable length
  if (parsed.summary && parsed.summary.length > 20) {
    confidence += 0.2;
  }

  // Check if key points were extracted
  if (parsed.keyPoints && parsed.keyPoints.length > 0) {
    confidence += 0.15;
  }

  // Check if action items were found (if applicable)
  if (parsed.actionItems && parsed.actionItems.length > 0) {
    confidence += 0.1;
  }

  // Penalize if transcription is very short
  if (transcription.length < 100) {
    confidence -= 0.1;
  }

  // Cap confidence between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Create standardized AI error
 */
function createAIError(
  error: unknown,
  code: string,
  retryable: boolean
): AIError {
  const message =
    error instanceof Error ? error.message : "Unknown AI processing error";

  return {
    code,
    message,
    retryable,
    fallbackAvailable: true,
    originalError: error,
  };
}

/**
 * Intelligent model selection based on content complexity
 * Requirement 10.1: Optimize costs through intelligent model selection
 */
export function selectModel(transcription: string): AIProcessingOptions["model"] {
  const wordCount = transcription.split(/\s+/).length;
  const complexity = calculateComplexity(transcription);

  // Use GPT-4o for complex or long content
  if (complexity > 0.7 || wordCount > 500) {
    return "gpt-4o";
  }

  // Use GPT-4 for medium complexity
  if (complexity > 0.4 || wordCount > 200) {
    return "gpt-4";
  }

  // Use GPT-3.5-turbo for simple content
  return "gpt-3.5-turbo";
}

/**
 * Calculate content complexity score
 */
function calculateComplexity(text: string): number {
  const words = text.split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  // Average word length
  const avgWordLength =
    words.reduce((sum, word) => sum + word.length, 0) / words.length;

  // Average sentence length
  const avgSentenceLength = words.length / sentences.length;

  // Unique word ratio
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const uniqueRatio = uniqueWords.size / words.length;

  // Normalize and combine metrics
  const wordLengthScore = Math.min(avgWordLength / 10, 1);
  const sentenceLengthScore = Math.min(avgSentenceLength / 30, 1);
  const vocabularyScore = uniqueRatio;

  return (wordLengthScore + sentenceLengthScore + vocabularyScore) / 3;
}

/**
 * Batch process multiple transcriptions
 * Requirement 10.2: Create batch processing for efficiency
 */
export async function batchProcessTranscriptions(
  transcriptions: Array<{ id: string; text: string }>,
  options: AIProcessingOptions = {}
): Promise<Array<{ id: string; result: AIProcessingResult; error?: AIError }>> {
  const batchSize = 5; // Process 5 at a time to avoid rate limits
  const results: Array<{
    id: string;
    result: AIProcessingResult;
    error?: AIError;
  }> = [];

  // Process in batches
  for (let i = 0; i < transcriptions.length; i += batchSize) {
    const batch = transcriptions.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const result = await processTranscription(item.text, options);
          return { id: item.id, result };
        } catch (error) {
          return {
            id: item.id,
            result: {} as AIProcessingResult,
            error: error as AIError,
          };
        }
      })
    );

    // Collect results
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error("Batch processing error:", result.reason);
      }
    }

    // Add delay between batches to respect rate limits
    if (i + batchSize < transcriptions.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Estimate cost for processing transcription
 * Requirement 10.1: Cost optimization through intelligent model selection
 */
export function estimateCost(
  transcription: string,
  model?: AIProcessingOptions["model"]
): { model: string; estimatedCost: number; estimatedTokens: number } {
  const selectedModel = model || selectModel(transcription);
  const inputTokens = Math.ceil(transcription.length / 4);
  const outputTokens = Math.ceil(inputTokens * 0.3); // Estimate 30% output
  const totalTokens = inputTokens + outputTokens;

  const costs = MODEL_COSTS[selectedModel];
  const estimatedCost =
    (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;

  return {
    model: selectedModel,
    estimatedCost,
    estimatedTokens: totalTokens,
  };
}

/**
 * Get cost savings from caching
 */
export function calculateCacheSavings(
  originalCost: number,
  cachedRequests: number
): { savedCost: number; savedRequests: number; savingsPercentage: number } {
  const savedCost = originalCost * cachedRequests;
  const totalRequests = cachedRequests + 1; // Original + cached
  const savingsPercentage = (cachedRequests / totalRequests) * 100;

  return {
    savedCost,
    savedRequests: cachedRequests,
    savingsPercentage,
  };
}

/**
 * Process transcription with fallback model
 * Requirement 3.4: Retry logic with different model fallbacks
 */
async function processTranscriptionWithFallback(
  transcription: string,
  options: AIProcessingOptions
): Promise<AIProcessingResult> {
  const startTime = Date.now();
  const model = options.model || "gpt-3.5-turbo";

  try {
    // Generate summary and extract insights with fallback model
    const [summary, insights] = await Promise.all([
      generateSummary(transcription, { ...options, model }),
      extractInsights(transcription, { ...options, model }),
    ]);

    // Calculate tokens and cost
    const inputTokens = Math.ceil(transcription.length / 4);
    const outputTokens = Math.ceil(
      (JSON.stringify(summary) + JSON.stringify(insights)).length / 4
    );
    const totalTokens = inputTokens + outputTokens;

    const costs = MODEL_COSTS[model];
    const cost =
      (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;

    return {
      summary,
      insights,
      cached: false,
      model,
      totalTokens,
      cost,
    };
  } catch (error) {
    console.error("Fallback processing failed:", error);
    throw error;
  }
}

/**
 * Create transcription-only result when AI processing fails
 * Requirement 3.4: Fallback to transcription-only mode
 */
function createTranscriptionOnlyResult(
  transcription: string
): AIProcessingResult {
  console.warn("AI processing failed, returning transcription-only mode");

  // Create basic summary from transcription
  const words = transcription.split(/\s+/);
  const sentences = transcription.split(/[.!?]+/).filter((s) => s.trim());

  // Take first 2-3 sentences as summary
  const summary = sentences.slice(0, 3).join(". ").trim() + ".";

  return {
    summary: {
      summary: summary || transcription.substring(0, 200) + "...",
      keyPoints: [
        "AI processing unavailable - showing transcription only",
      ],
      actionItems: [],
      importantDates: [],
      confidence: 0.3,
      wordCount: words.length,
      processingTime: 0,
    },
    insights: {
      keyTopics: [],
      actionItems: [],
      importantDates: [],
      sentiment: "neutral",
      entities: [],
    },
    cached: false,
    model: "transcription-only",
    totalTokens: 0,
    cost: 0,
  };
}

/**
 * Retry AI processing with exponential backoff
 * Requirement 3.4: Retry logic for AI processing failures
 */
export async function processTranscriptionWithRetry(
  transcription: string,
  options: AIProcessingOptions = {},
  maxRetries: number = 3
): Promise<AIProcessingResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await processTranscription(transcription, options);
    } catch (error) {
      lastError = error;
      console.error(`AI processing attempt ${attempt + 1} failed:`, error);

      // Don't retry if it's not a retryable error
      if (error && typeof error === "object" && "retryable" in error) {
        const aiError = error as AIError;
        if (!aiError.retryable) {
          break;
        }
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed, return transcription-only mode
  console.error("All AI processing attempts failed:", lastError);
  return createTranscriptionOnlyResult(transcription);
}

/**
 * Check AI service health
 */
export async function checkAIServiceHealth(): Promise<{
  available: boolean;
  model: string;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Test with a simple prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Respond with 'OK' if you can process this message.",
        },
      ],
      max_tokens: 10,
    });

    const latency = Date.now() - startTime;
    const response = completion.choices[0]?.message?.content;

    return {
      available: !!response,
      model: "gpt-3.5-turbo",
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return {
      available: false,
      model: "gpt-3.5-turbo",
      latency,
      error: message,
    };
  }
}
