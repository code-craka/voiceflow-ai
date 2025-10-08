/**
 * Arcjet Security Configuration
 * 
 * Provides bot protection, rate limiting, and security shielding for API routes.
 * 
 * @see https://docs.arcjet.com
 */

import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/next";

if (!process.env.ARCJET_KEY) {
  throw new Error("ARCJET_KEY environment variable is required");
}

/**
 * Base Arcjet configuration with shield protection
 * Use this for routes that need basic security without rate limiting
 */
export const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
  ],
});

/**
 * Arcjet configuration for public API routes
 * Includes bot detection and moderate rate limiting
 */
export const ajPublicAPI = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc.
      ],
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 10, // 10 tokens per interval
      interval: 60, // Refill every 60 seconds
      capacity: 20, // Bucket capacity of 20 tokens
    }),
  ],
});

/**
 * Arcjet configuration for authenticated API routes
 * More permissive rate limiting for logged-in users
 */
export const ajAuthAPI = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 50, // 50 tokens per interval
      interval: 60, // Refill every 60 seconds
      capacity: 100, // Bucket capacity of 100 tokens
    }),
  ],
});

/**
 * Arcjet configuration for sensitive operations (auth, payments, etc.)
 * Strict rate limiting and bot detection
 */
export const ajSensitive = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [], // Block all bots
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 3, // 3 tokens per interval
      interval: 60, // Refill every 60 seconds
      capacity: 5, // Bucket capacity of 5 tokens
    }),
  ],
});

/**
 * Arcjet configuration for AI/transcription endpoints
 * Balanced rate limiting for resource-intensive operations
 */
export const ajAI = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 5, // 5 tokens per interval
      interval: 60, // Refill every 60 seconds
      capacity: 10, // Bucket capacity of 10 tokens
    }),
  ],
});

/**
 * Helper function to handle Arcjet decisions in API routes
 * 
 * @example
 * ```typescript
 * export async function POST(req: Request) {
 *   const decision = await ajPublicAPI.protect(req);
 *   const errorResponse = handleArcjetDecision(decision);
 *   if (errorResponse) return errorResponse;
 *   
 *   // Continue with your logic
 * }
 * ```
 */
export function handleArcjetDecision(decision: any) {
  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Please try again later.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (decision.reason.isBot()) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Bot access not allowed.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (decision.reason.isShield()) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Request blocked by security shield.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generic forbidden response
    return new Response(
      JSON.stringify({
        error: "Forbidden",
        message: "Request denied.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check for hosting IPs (likely bots/proxies)
  if (decision.ip?.isHosting?.()) {
    return new Response(
      JSON.stringify({
        error: "Forbidden",
        message: "Requests from hosting providers are not allowed.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null; // No error, continue processing
}
