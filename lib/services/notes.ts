import { prisma } from "@/lib/db";
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NoteMetadata,
} from "@/types/notes";
import { createAuditLog } from "./audit";

export class NotesService {
  /**
   * Create a new note
   */
  async createNote(
    userId: string,
    input: CreateNoteInput,
    ipAddress?: string
  ): Promise<Note> {
    // Validate folder ownership if provided
    if (input.folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: input.folderId,
          userId,
        },
      });

      if (!folder) {
        throw new Error("Folder not found or access denied");
      }
    }

    // Create note with metadata
    const note = await prisma.note.create({
      data: {
        userId,
        title: input.title,
        folderId: input.folderId,
        audioUrl: input.audioUrl,
        encryptedAudioKey: input.encryptedAudioKey,
        duration: input.duration,
        metadata: input.metadata || {
          processingStatus: "pending",
        },
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

    // Create audit log
    await createAuditLog({
      userId,
      action: "NOTE_CREATED",
      resourceType: "note",
      resourceId: note.id,
      details: {
        title: note.title,
        folderId: note.folderId,
      },
      ipAddress,
    });

    return this.mapNoteToType(note);
  }

  /**
   * Get a note by ID
   */
  async getNoteById(noteId: string, userId: string): Promise<Note | null> {
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
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

    if (!note) {
      return null;
    }

    return this.mapNoteToType(note);
  }

  /**
   * Get all notes for a user with optional filtering
   */
  async getNotes(
    userId: string,
    options?: {
      folderId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notes: Note[]; total: number }> {
    const where = {
      userId,
      ...(options?.folderId && { folderId: options.folderId }),
    };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        include: {
          folder: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: options?.limit,
        skip: options?.offset,
      }),
      prisma.note.count({ where }),
    ]);

    return {
      notes: notes.map((note) => this.mapNoteToType(note)),
      total,
    };
  }

  /**
   * Update a note
   */
  async updateNote(
    noteId: string,
    userId: string,
    input: UpdateNoteInput,
    ipAddress?: string
  ): Promise<Note> {
    // Verify note ownership
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!existingNote) {
      throw new Error("Note not found or access denied");
    }

    // Validate folder ownership if provided
    if (input.folderId !== undefined && input.folderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: input.folderId,
          userId,
        },
      });

      if (!folder) {
        throw new Error("Folder not found or access denied");
      }
    }

    // Merge metadata if provided
    let metadata = existingNote.metadata as NoteMetadata | null;
    if (input.metadata) {
      metadata = {
        ...(metadata || {}),
        ...input.metadata,
      } as NoteMetadata;
    }

    // Update note
    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.folderId !== undefined && { folderId: input.folderId }),
        ...(input.transcription !== undefined && {
          transcription: input.transcription,
        }),
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(metadata && { metadata }),
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

    // Create audit log
    await createAuditLog({
      userId,
      action: "NOTE_UPDATED",
      resourceType: "note",
      resourceId: note.id,
      details: {
        changes: input,
      },
      ipAddress,
    });

    return this.mapNoteToType(note);
  }

  /**
   * Delete a note
   */
  async deleteNote(
    noteId: string,
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    // Verify note ownership
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      throw new Error("Note not found or access denied");
    }

    // Delete note (cascade will handle note_tags)
    await prisma.note.delete({
      where: { id: noteId },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "NOTE_DELETED",
      resourceType: "note",
      resourceId: noteId,
      details: {
        title: note.title,
      },
      ipAddress,
    });
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

export const notesService = new NotesService();
