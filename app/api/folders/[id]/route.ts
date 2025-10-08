import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { foldersService } from "@/lib/services/folders";
import { updateFolderSchema } from "@/lib/validation/notes";
import { z } from "zod";

/**
 * GET /api/folders/[id] - Get a specific folder
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeHierarchy = searchParams.get("hierarchy") === "true";

    // 4. Get folder
    const folder = includeHierarchy
      ? await foldersService.getFolderHierarchy(params.id, session.user.id)
      : await foldersService.getFolderById(params.id, session.user.id);

    if (!folder) {
      return NextResponse.json(
        {
          error: {
            code: "FOLDER_NOT_FOUND",
            message: "Folder not found",
            retryable: false,
            fallbackAvailable: false,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: folder });
  } catch (error) {
    console.error("Error fetching folder:", error);
    return NextResponse.json(
      {
        error: {
          code: "FOLDER_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch folder",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/folders/[id] - Update a folder
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
    const validatedInput = updateFolderSchema.parse(body);

    // 4. Update folder
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const folder = await foldersService.updateFolder(
      params.id,
      session.user.id,
      validatedInput,
      ipAddress
    );

    return NextResponse.json({ data: folder });
  } catch (error) {
    console.error("Error updating folder:", error);

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
              code: "FOLDER_NOT_FOUND",
              message: error.message,
              retryable: false,
              fallbackAvailable: false,
            },
          },
          { status: 404 }
        );
      }

      if (
        error.message.includes("cannot be its own parent") ||
        error.message.includes("cannot move folder to its own descendant")
      ) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_FOLDER_HIERARCHY",
              message: error.message,
              retryable: false,
              fallbackAvailable: false,
            },
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: {
          code: "FOLDER_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update folder",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/folders/[id] - Delete a folder
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

    // 3. Delete folder
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    await foldersService.deleteFolder(params.id, session.user.id, ipAddress);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error deleting folder:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found or access denied")) {
        return NextResponse.json(
          {
            error: {
              code: "FOLDER_NOT_FOUND",
              message: error.message,
              retryable: false,
              fallbackAvailable: false,
            },
          },
          { status: 404 }
        );
      }

      if (error.message.includes("Cannot delete folder with subfolders")) {
        return NextResponse.json(
          {
            error: {
              code: "FOLDER_HAS_CHILDREN",
              message: error.message,
              retryable: false,
              fallbackAvailable: false,
            },
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: {
          code: "FOLDER_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to delete folder",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
