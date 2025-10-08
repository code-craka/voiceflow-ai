import { prisma } from "@/lib/db";
import type {
  SearchOptions,
  SearchResult,
  SearchResponse,
} from "@/types/search";
import type { Note, NoteMetadata } from "@/types/notes";

export class SearchService {
  /**
   * Search notes using PostgreSQL full-text search
   * Target: <100ms response time (Requirement 4.2)
   */
  async searchNotes(
    userId: string,
    options: SearchOptions
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    // Build the where clause
    const where: any = {
      userId,
      transcription: {
        not: null,
      },
    };

    // Apply filters
    if (options.filters?.folderId) {
      where.folderId = options.filters.folderId;
    }

    if (options.filters?.dateFrom || options.filters?.dateTo) {
      where.createdAt = {};
      if (options.filters.dateFrom) {
        where.createdAt.gte = options.filters.dateFrom;
      }
      if (options.filters.dateTo) {
        where.createdAt.lte = options.filters.dateTo;
      }
    }

    // Apply tag filter if provided
    if (options.filters?.tagIds && options.filters.tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: {
            in: options.filters.tagIds,
          },
        },
      };
    }

    // Prepare search query for PostgreSQL full-text search
    const searchQuery = this.prepareSearchQuery(options.query);

    // Execute full-text search using raw SQL for performance
    // Using to_tsvector and to_tsquery for PostgreSQL full-text search
    const results = await prisma.$queryRaw<any[]>`
      SELECT 
        n.*,
        ts_rank(to_tsvector('english', n.transcription), to_tsquery('english', ${searchQuery})) as rank,
        ts_headline('english', n.transcription, to_tsquery('english', ${searchQuery}), 
          'MaxWords=20, MinWords=10, ShortWord=3, HighlightAll=FALSE, MaxFragments=1') as snippet
      FROM notes n
      WHERE n.user_id = ${userId}::uuid
        AND n.transcription IS NOT NULL
        AND to_tsvector('english', n.transcription) @@ to_tsquery('english', ${searchQuery})
        ${options.filters?.folderId ? `AND n.folder_id = ${options.filters.folderId}::uuid` : ""}
        ${options.filters?.dateFrom ? `AND n.created_at >= ${options.filters.dateFrom}::timestamptz` : ""}
        ${options.filters?.dateTo ? `AND n.created_at <= ${options.filters.dateTo}::timestamptz` : ""}
      ORDER BY rank DESC, n.created_at DESC
      LIMIT ${options.limit || 50}
      OFFSET ${options.offset || 0}
    `;

    // Get total count for pagination
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM notes n
      WHERE n.user_id = ${userId}::uuid
        AND n.transcription IS NOT NULL
        AND to_tsvector('english', n.transcription) @@ to_tsquery('english', ${searchQuery})
        ${options.filters?.folderId ? `AND n.folder_id = ${options.filters.folderId}::uuid` : ""}
        ${options.filters?.dateFrom ? `AND n.created_at >= ${options.filters.dateFrom}::timestamptz` : ""}
        ${options.filters?.dateTo ? `AND n.created_at <= ${options.filters.dateTo}::timestamptz` : ""}
    `;

    const total = Number(countResult[0]?.count || 0);

    // Apply tag filter in application layer if needed
    let filteredResults = results;
    if (options.filters?.tagIds && options.filters.tagIds.length > 0) {
      const noteIds = results.map((r) => r.id);
      const notesWithTags = await prisma.note.findMany({
        where: {
          id: { in: noteIds },
          tags: {
            some: {
              tagId: {
                in: options.filters.tagIds,
              },
            },
          },
        },
        select: { id: true },
      });

      const validNoteIds = new Set(notesWithTags.map((n) => n.id));
      filteredResults = results.filter((r) => validNoteIds.has(r.id));
    }

    // Fetch complete note data with relations
    const noteIds = filteredResults.map((r) => r.id);
    const notes = await prisma.note.findMany({
      where: {
        id: { in: noteIds },
      },
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Map results to SearchResult format
    const searchResults: SearchResult[] = filteredResults.map((result) => {
      const note = notes.find((n) => n.id === result.id);
      if (!note) {
        throw new Error("Note not found in results");
      }

      return {
        note: this.mapNoteToType(note),
        rank: parseFloat(result.rank),
        snippet: result.snippet,
      };
    });

    const responseTime = Date.now() - startTime;

    return {
      results: searchResults,
      total,
      responseTime,
    };
  }

  /**
   * Prepare search query for PostgreSQL full-text search
   * Converts user query to tsquery format
   */
  private prepareSearchQuery(query: string): string {
    // Remove special characters and split into words
    const words = query
      .replace(/[^\w\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (words.length === 0) {
      return "";
    }

    // Join words with AND operator and add prefix matching
    return words.map((word) => `${word}:*`).join(" & ");
  }

  /**
   * Map Prisma note to Note type
   */
  private mapNoteToType(note: any): Note {
    return {
      id: note.id,
      userId: note.userId,
      folderId: note.folderId,
      title: note.title,
      transcription: note.transcription,
      summary: note.summary,
      audioUrl: note.audioUrl,
      encryptedAudioKey: note.encryptedAudioKey,
      duration: note.duration,
      metadata: note.metadata as NoteMetadata | null,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      folder: note.folder || null,
      tags: note.tags?.map((nt: any) => nt.tag) || [],
    };
  }
}

export const searchService = new SearchService();
