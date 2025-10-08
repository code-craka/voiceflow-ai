import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(255),
  folderId: z.string().uuid().optional(),
  audioUrl: z.string().url().max(500).optional(),
  encryptedAudioKey: z.string().max(255).optional(),
  duration: z.number().int().positive().optional(),
  metadata: z
    .object({
      processingStatus: z.enum([
        "pending",
        "transcribing",
        "processing_ai",
        "completed",
        "failed",
      ]),
      transcriptionProvider: z.enum(["deepgram", "assemblyai"]).optional(),
      transcriptionConfidence: z.number().min(0).max(1).optional(),
      aiProcessingStatus: z
        .enum(["pending", "completed", "failed"])
        .optional(),
      errorMessage: z.string().optional(),
    })
    .optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
  transcription: z.string().optional(),
  summary: z.string().optional(),
  metadata: z
    .object({
      processingStatus: z.enum([
        "pending",
        "transcribing",
        "processing_ai",
        "completed",
        "failed",
      ]),
      transcriptionProvider: z.enum(["deepgram", "assemblyai"]).optional(),
      transcriptionConfidence: z.number().min(0).max(1).optional(),
      aiProcessingStatus: z
        .enum(["pending", "completed", "failed"])
        .optional(),
      errorMessage: z.string().optional(),
    })
    .partial()
    .optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const assignTagsSchema = z.object({
  noteId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()),
});
