/**
 * AI Service Health Check API
 * Check availability and performance of AI services
 */

import { NextRequest, NextResponse } from "next/server";
import { aj, handleArcjetDecision } from "@/lib/arcjet";
import { checkAIServiceHealth } from "@/lib/services/ai";
import { getCacheStats } from "@/lib/services/cache";

export async function GET(request: NextRequest) {
  try {
    // Basic Arcjet protection for health checks
    const decision = await aj.protect(request);
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // Check AI service health
    const aiHealth = await checkAIServiceHealth();

    // Get cache statistics
    const cacheStats = await getCacheStats();

    return NextResponse.json(
      {
        data: {
          ai: {
            available: aiHealth.available,
            model: aiHealth.model,
            latency: aiHealth.latency,
            error: aiHealth.error,
          },
          cache: {
            enabled: true,
            keys: cacheStats.keys,
            memory: cacheStats.memory,
            hitRate:
              cacheStats.hits + cacheStats.misses > 0
                ? (
                    (cacheStats.hits /
                      (cacheStats.hits + cacheStats.misses)) *
                    100
                  ).toFixed(2) + "%"
                : "0%",
          },
          status: aiHealth.available ? "healthy" : "degraded",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check error:", error);

    return NextResponse.json(
      {
        data: {
          ai: { available: false, error: "Health check failed" },
          cache: { enabled: false },
          status: "unhealthy",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
