import { prisma } from "@/lib/db";
import type { Tag, CreateTagInput } from "@/types/notes";
import { createAuditLog } from "./audit";

export class TagsService {
  /**
   * Create a new tag
   */
  async createTag(
    userId: string,
    input: CreateTagInput,
    ipAddress?: string
  ): Promise<Tag> {
    // Check if tag already exists for this user
    const existingTag = await prisma.tag.findUnique({
      where: {
        userId_name: {
          userId,
          name: input.name,
        },
      },
    });

    if (existingTag) {
      throw new Error("Tag with this name already exists");
    }

    // Create tag
    const tag = await prisma.tag.create({
      data: {
        userId,
        name: input.name,
      },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "TAG_CREATED",
      resourceType: "tag",
      resourceId: tag.id,
      details: {
        name: tag.name,
      },
      ipAddress,
    });

    return this.mapTagToType(tag);
  }

  /**
   * Get a tag by ID
   */
  async getTagById(tagId: string, userId: string): Promise<Tag | null> {
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
    });

    if (!tag) {
      return null;
    }

    return this.mapTagToType(tag);
  }

  /**
   * Get all tags for a user
   */
  async getTags(userId: string): Promise<Tag[]> {
    const tags = await prisma.tag.findMany({
      where: {
        userId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return tags.map((tag) => this.mapTagToType(tag));
  }

  /**
   * Update a tag
   */
  async updateTag(
    tagId: string,
    userId: string,
    name: string,
    ipAddress?: string
  ): Promise<Tag> {
    // Verify tag ownership
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
    });

    if (!existingTag) {
      throw new Error("Tag not found or access denied");
    }

    // Check if new name conflicts with existing tag
    const conflictingTag = await prisma.tag.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
    });

    if (conflictingTag && conflictingTag.id !== tagId) {
      throw new Error("Tag with this name already exists");
    }

    // Update tag
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: { name },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "TAG_UPDATED",
      resourceType: "tag",
      resourceId: tag.id,
      details: {
        oldName: existingTag.name,
        newName: name,
      },
      ipAddress,
    });

    return this.mapTagToType(tag);
  }

  /**
   * Delete a tag
   */
  async deleteTag(
    tagId: string,
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    // Verify tag ownership
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
    });

    if (!tag) {
      throw new Error("Tag not found or access denied");
    }

    // Delete tag (cascade will handle note_tags)
    await prisma.tag.delete({
      where: { id: tagId },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "TAG_DELETED",
      resourceType: "tag",
      resourceId: tagId,
      details: {
        name: tag.name,
      },
      ipAddress,
    });
  }

  /**
   * Assign tags to a note
   */
  async assignTagsToNote(
    noteId: string,
    tagIds: string[],
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

    // Verify all tags belong to the user
    const tags = await prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        userId,
      },
    });

    if (tags.length !== tagIds.length) {
      throw new Error("One or more tags not found or access denied");
    }

    // Remove existing tags
    await prisma.noteTag.deleteMany({
      where: { noteId },
    });

    // Assign new tags
    if (tagIds.length > 0) {
      await prisma.noteTag.createMany({
        data: tagIds.map((tagId) => ({
          noteId,
          tagId,
        })),
      });
    }

    // Create audit log
    await createAuditLog({
      userId,
      action: "NOTE_TAGS_UPDATED",
      resourceType: "note",
      resourceId: noteId,
      details: {
        tagIds,
        tagNames: tags.map((t) => t.name),
      },
      ipAddress,
    });
  }

  /**
   * Get tags for a note
   */
  async getTagsForNote(noteId: string, userId: string): Promise<Tag[]> {
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

    const noteTags = await prisma.noteTag.findMany({
      where: { noteId },
      include: {
        tag: true,
      },
    });

    return noteTags.map((nt) => this.mapTagToType(nt.tag));
  }

  /**
   * Map Prisma tag to Tag type
   */
  private mapTagToType(tag: any): Tag {
    return {
      id: tag.id,
      userId: tag.userId,
      name: tag.name,
      createdAt: tag.createdAt,
    };
  }
}

export const tagsService = new TagsService();
