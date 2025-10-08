import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { tagsService } from "@/lib/services/tags";
import { z } from "zod";

const assignTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

/**
 * GET /api/notes/[id]/tags - Get tags for a note
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 3. Get tags for note
    const tags = await tagsService.getTagsForNote(params.id, session.user.id);

    return NextResponse.json({ data: tags });
  } catch (error) {
    console.error("Error fetching note tags:", error);

    if (
      error instanceof Error &&
      error.message.includes("not found or access denied")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "NOTE_NOT_FOUND",
            message: error.message,
            retryable: false,
            fallbackAvailable: false,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "NOTE_TAGS_FETCH_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch note tags",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notes/[id]/tags - Assign tags to a note
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { tagIds } = assignTagsSchema.parse(body);

    // 4. Assign tags to note
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    await tagsService.assignTagsToNote(
      params.id,
      tagIds,
      session.user.id,
      ipAddress
    );

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error assigning tags to note:", error);

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
      error.message.includes("not found or access denied")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "RESOURCE_NOT_FOUND",
            message: error.message,
            retryable: false,
            fallbackAvailable: false,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "NOTE_TAGS_ASSIGN_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to assign tags to note",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
