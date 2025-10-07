/**
 * Arcjet Demo API Route
 * 
 * Demonstrates Arcjet security features including:
 * - Shield protection against common attacks
 * - Bot detection and blocking
 * - Rate limiting with token bucket algorithm
 * - Hosting IP detection
 * - Spoofed bot verification (paid feature)
 */

import { isSpoofedBot } from "@arcjet/inspect";
import { NextResponse } from "next/server";
import { ajPublicAPI, handleArcjetDecision } from "@/lib/arcjet";

export async function GET(req: Request): Promise<NextResponse> {
  // Protect the request with Arcjet
  const decision = await ajPublicAPI.protect(req, { requested: 1 });

  console.log("Arcjet decision", decision);

  // Use the helper function to handle common denial reasons
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Paid Arcjet accounts include additional verification checks using IP data.
  // Verification isn't always possible, so we recommend checking the decision
  // separately.
  // https://docs.arcjet.com/bot-protection/reference#bot-verification
  if (decision.results.some(isSpoofedBot)) {
    return NextResponse.json(
      { error: "Forbidden", message: "Spoofed bot detected" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    message: "Hello world",
    protected: true,
    ip: decision.ip,
  });
}
