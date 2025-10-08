import { z } from "zod";

export const searchNotesSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z
    .object({
      folderId: z.string().uuid().optional(),
      tagIds: z.array(z.string().uuid()).optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
