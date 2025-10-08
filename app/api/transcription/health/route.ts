/**
 * Transcription Health Check Endpoint
 * Check availability of transcription services
 */

import { NextResponse } from "next/server";
import { transcriptionService } from "@/lib/services/transcription";
import { transcriptionPipeline } from "@/lib/services/transcriptionPipeline";

/**
 * GET /api/transcription/health
 * Check health of transcription services
 */
export async function GET() {
  try {
    // Check service health
    const health = await transcriptionService.healthCheck();

    // Get pipeline stats
    const stats = transcriptionPipeline.getStats();

    return NextResponse.json({
      status: health.overall ? "healthy" : "degraded",
      services: {
        deepgram: health.deepgram ? "available" : "unavailable",
        assemblyai: health.assemblyai ? "available" : "unavailable",
      },
      pipeline: {
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed,
        averageProcessingTime: Math.round(stats.averageProcessingTime),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
