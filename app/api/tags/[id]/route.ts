import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { tagsService } from "@/lib/services/tags";
import { z } from "zod";

const updateTagSchema = z.object({
  name: z.string().min(1).max(100),
});

/**
 * GET /api/tags/[id] - Get a specific tag
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

    // 3. Get tag
    const tag = await tagsService.getTagById(params.id, session.user.id);

    if (!tag) {
      return NextResponse.json(
        {
          error: {
            code: "TAG_NOT_FOUND",
            message: "Tag not found",
            retryable: false,
            fallbackAvailable: false,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: tag });
  } catch (error) {
    console.error("Error fetching tag:", error);
    return NextResponse.json(
      {
        error: {
          code: "TAG_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch tag",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tags/[id] - Update a tag
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
    const { name } = updateTagSchema.parse(body);

    // 4. Update tag
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const tag = await tagsService.updateTag(
      params.id,
      session.user.id,
      name,
      ipAddress
    );

    return NextResponse.json({ data: tag });
  } catch (error) {
    console.error("Error updating tag:", error);

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

    if (error instanceof Error) {
      if (error.message.includes("not found or access denied")) {
        return NextResponse.json(
          {
            error: {
              code: "TAG_NOT_FOUND",
              message: error.message,
              retryable: false,
              fallbackAvailable: false,
            },
          },
          { status: 404 }
        );
      }

      if (error.message.includes("already exists")) {
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
    }

    return NextResponse.json(
      {
        error: {
          code: "TAG_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update tag",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tags/[id] - Delete a tag
 */
export async function DELETE(
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

    // 3. Delete tag
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    await tagsService.deleteTag(params.id, session.user.id, ipAddress);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error deleting tag:", error);

    if (
      error instanceof Error &&
      error.message.includes("not found or access denied")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "TAG_NOT_FOUND",
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
          code: "TAG_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to delete tag",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
