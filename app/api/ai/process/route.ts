/**
 * AI Content Processing API
 * Process transcriptions with AI-powered analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAI, handleArcjetDecision } from "@/lib/arcjet";
import { processTranscriptionWithRetry } from "@/lib/services/ai";
import { z } from "zod";

// Input validation schema
const ProcessRequestSchema = z.object({
  transcription: z.string().min(10, "Transcription too short"),
  noteId: z.string().uuid().optional(),
  options: z
    .object({
      model: z.enum(["gpt-4o", "gpt-4", "gpt-3.5-turbo"]).optional(),
      enableModeration: z.boolean().optional(),
      cacheKey: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Arcjet protection (AI endpoints use higher token cost)
    const decision = await ajAI.protect(request, { requested: 2 });
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // 2. Better Auth session verification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 3. Input validation
    const body = await request.json();
    const validation = ProcessRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid request data",
            details: validation.error.errors,
            retryable: false,
            fallbackAvailable: false,
          },
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { transcription, options } = validation.data;

    // 4. Process transcription with retry logic
    const result = await processTranscriptionWithRetry(
      transcription,
      options || {}
    );

    // 5. Check if we're in fallback mode and notify user
    const isFallbackMode = result.model === "transcription-only";
    const notification = isFallbackMode
      ? {
          type: "warning",
          message:
            "AI processing is temporarily unavailable. Showing transcription only.",
        }
      : undefined;

    // 6. Return result
    return NextResponse.json(
      {
        data: {
          ...result,
          notification,
        },
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("AI processing error:", error);

    return NextResponse.json(
      {
        error: {
          code: "AI_PROCESSING_FAILED",
          message:
            "Failed to process transcription. Please try again later.",
          retryable: true,
          fallbackAvailable: true,
        },
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
