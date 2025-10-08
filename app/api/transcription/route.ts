/**
 * Transcription API Endpoint
 * Handles audio transcription requests with automatic fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAI, handleArcjetDecision } from "@/lib/arcjet";
import { transcriptionPipeline } from "@/lib/services/transcriptionPipeline";
import { z } from "zod";

// Validation schema
const transcriptionRequestSchema = z.object({
  noteId: z.string().uuid(),
  audioData: z.string(), // Base64 encoded audio
  options: z
    .object({
      language: z.string().optional(),
      enableSpeakerDiarization: z.boolean().optional(),
      enablePunctuation: z.boolean().optional(),
    })
    .optional(),
});

/**
 * POST /api/transcription
 * Submit audio for transcription
 */
export async function POST(request: NextRequest) {
  // 1. Arcjet protection (AI endpoint with cost of 2 tokens)
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

  // Extract userId from session
  const userId = session.user.id;

  try {
    // 3. Parse and validate request body
    const body = await request.json();
    const validatedData = transcriptionRequestSchema.parse(body);

    const { noteId, audioData, options } = validatedData;

    // 4. Decode base64 audio data
    const audioBuffer = Buffer.from(audioData, "base64");

    if (audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "Invalid audio data" },
        { status: 400 }
      );
    }

    // 5. Submit transcription job
    const jobId = await transcriptionPipeline.submitTranscription(
      noteId,
      userId,
      audioBuffer,
      options || undefined
    );

    // 6. Return job ID for status tracking
    return NextResponse.json({
      success: true,
      jobId,
      message: "Transcription job submitted successfully",
    });
  } catch (error) {
    console.error("Transcription API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to submit transcription job",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transcription?jobId=xxx
 * Get transcription job status
 */
export async function GET(request: NextRequest) {
  // 1. Arcjet protection
  const decision = await ajAI.protect(request, { requested: 1 });
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

  try {
    // 3. Get job ID from query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // 4. Get job status
    const status = transcriptionPipeline.getJobStatus(jobId);

    if (!status) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // 5. Return job status
    return NextResponse.json({
      jobId,
      status,
    });
  } catch (error) {
    console.error("Transcription status API error:", error);

    return NextResponse.json(
      {
        error: "Failed to get job status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
