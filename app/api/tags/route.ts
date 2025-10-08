import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { tagsService } from "@/lib/services/tags";
import { createTagSchema } from "@/lib/validation/notes";
import { z } from "zod";

/**
 * GET /api/tags - Get all tags for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Arcjet protection
    const decision = await ajAuthAPI.protect(request);
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // 2. Better Auth session verification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Get tags
    const tags = await tagsService.getTags(session.user.id);

    return NextResponse.json({ data: tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      {
        error: {
          code: "TAGS_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch tags",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags - Create a new tag
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Arcjet protection
    const decision = await ajAuthAPI.protect(request);
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // 2. Better Auth session verification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Input validation
    const body = await request.json();
    const validatedInput = createTagSchema.parse(body);

    // 4. Create tag
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const tag = await tagsService.createTag(
      session.user.id,
      validatedInput,
      ipAddress
    );

    return NextResponse.json({ data: tag }, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: error.errors,
            retryable: false,
            fallbackAvailable: false,
          },
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("already exists")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "TAG_ALREADY_EXISTS",
            message: error.message,
            retryable: false,
            fallbackAvailable: false,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "TAG_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create tag",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
