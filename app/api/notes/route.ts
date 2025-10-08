import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { notesService } from "@/lib/services/notes";
import { createNoteSchema } from "@/lib/validation/notes";
import { z } from "zod";

/**
 * GET /api/notes - Get all notes for the authenticated user
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
    const folderId = searchParams.get("folderId") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0;

    // 4. Get notes
    const result = await notesService.getNotes(session.user.id, {
      folderId,
      limit,
      offset,
    });

    return NextResponse.json({
      data: result.notes,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      {
        error: {
          code: "NOTES_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch notes",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes - Create a new note
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
    const validatedInput = createNoteSchema.parse(body);

    // 4. Create note
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const note = await notesService.createNote(
      session.user.id,
      validatedInput,
      ipAddress
    );

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);

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

    return NextResponse.json(
      {
        error: {
          code: "NOTE_CREATE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create note",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
