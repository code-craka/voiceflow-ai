import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ajAuthAPI, handleArcjetDecision } from "@/lib/arcjet";
import { searchService } from "@/lib/services/search";
import { searchNotesSchema } from "@/lib/validation/search";
import { z } from "zod";

/**
 * POST /api/search - Search notes using full-text search
 * Target: <100ms response time (Requirement 4.2)
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
    const validatedInput = searchNotesSchema.parse(body);

    // 4. Convert date strings to Date objects if provided
    const filters = validatedInput.filters
      ? {
          ...validatedInput.filters,
          dateFrom: validatedInput.filters.dateFrom
            ? new Date(validatedInput.filters.dateFrom)
            : undefined,
          dateTo: validatedInput.filters.dateTo
            ? new Date(validatedInput.filters.dateTo)
            : undefined,
        }
      : undefined;

    // 5. Execute search
    const searchResult = await searchService.searchNotes(session.user.id, {
      query: validatedInput.query,
      filters,
      limit: validatedInput.limit,
      offset: validatedInput.offset,
    });

    return NextResponse.json({
      data: searchResult.results,
      pagination: {
        limit: validatedInput.limit || 50,
        offset: validatedInput.offset || 0,
        total: searchResult.total,
      },
      meta: {
        responseTime: searchResult.responseTime,
      },
    });
  } catch (error) {
    console.error("Error searching notes:", error);

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
          code: "SEARCH_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to search notes",
          retryable: true,
          fallbackAvailable: false,
        },
      },
      { status: 500 }
    );
  }
}
