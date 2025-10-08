import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { foldersService } from "@/lib/services/folders";
import { createFolderSchema } from "@/lib/validation/notes";
import { z } from "zod";

/**
 * GET /api/folders - Get all folders for the authenticated user
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const rootOnly = searchParams.get("rootOnly") === "true";

    // 4. Get folders
    const folders = rootOnly
      ? await foldersService.getRootFolders(session.user.id)
      : await foldersService.getFolders(session.user.id);

    return NextResponse.json({ data: folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      {
        error: {
          code: "FOLDERS_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch folders",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/folders - Create a new folder
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
    const validatedInput = createFolderSchema.parse(body);

    // 4. Create folder
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const folder = await foldersService.createFolder(
      session.user.id,
      validatedInput,
      ipAddress
    );

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);

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
            code: "PARENT_FOLDER_NOT_FOUND",
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
          code: "FOLDER_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create folder",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
