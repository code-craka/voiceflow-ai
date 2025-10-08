import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { notesService } from "@/lib/services/notes";
import { updateNoteSchema } from "@/lib/validation/notes";
import { z } from "zod";

/**
 * GET /api/notes/[id] - Get a specific note
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

    // 3. Get note
    const note = await notesService.getNoteById(params.id, session.user.id);

    if (!note) {
      return NextResponse.json(
        {
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note not found",
            retryable: false,
            fallbackAvailable: false,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      {
        error: {
          code: "NOTE_FETCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch note",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notes/[id] - Update a note
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
    const validatedInput = updateNoteSchema.parse(body);

    // 4. Update note
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    const note = await notesService.updateNote(
      params.id,
      session.user.id,
      validatedInput,
      ipAddress
    );

    return NextResponse.json({ data: note });
  } catch (error) {
    console.error("Error updating note:", error);

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
          code: "NOTE_UPDATE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update note",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id] - Delete a note
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

    // 3. Delete note
    const ipAddress = request.headers.get("x-forwarded-for") || undefined;
    await notesService.deleteNote(params.id, session.user.id, ipAddress);

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Error deleting note:", error);

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
          code: "NOTE_DELETE_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to delete note",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
