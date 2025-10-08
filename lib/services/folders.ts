import { prisma } from "@/lib/db";
import type {
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
} from "@/types/notes";
import { createAuditLog } from "./audit";

export class FoldersService {
  /**
   * Create a new folder
   */
  async createFolder(
    userId: string,
    input: CreateFolderInput,
    ipAddress?: string
  ): Promise<Folder> {
    // Validate parent folder ownership if provided
    if (input.parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: input.parentId,
          userId,
        },
      });

      if (!parentFolder) {
        throw new Error("Parent folder not found or access denied");
      }
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        userId,
        name: input.name,
        parentId: input.parentId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "FOLDER_CREATED",
      resourceType: "folder",
      resourceId: folder.id,
      details: {
        name: folder.name,
        parentId: folder.parentId,
      },
      ipAddress,
    });

    return this.mapFolderToType(folder);
  }

  /**
   * Get a folder by ID
   */
  async getFolderById(
    folderId: string,
    userId: string
  ): Promise<Folder | null> {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!folder) {
      return null;
    }

    return this.mapFolderToType(folder);
  }

  /**
   * Get all folders for a user (hierarchical structure)
   */
  async getFolders(userId: string): Promise<Folder[]> {
    const folders = await prisma.folder.findMany({
      where: {
        userId,
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return folders.map((folder) => this.mapFolderToType(folder));
  }

  /**
   * Get root folders (folders without parent)
   */
  async getRootFolders(userId: string): Promise<Folder[]> {
    const folders = await prisma.folder.findMany({
      where: {
        userId,
        parentId: null,
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return folders.map((folder) => this.mapFolderToType(folder));
  }

  /**
   * Get folder hierarchy (folder with all descendants)
   */
  async getFolderHierarchy(
    folderId: string,
    userId: string
  ): Promise<Folder | null> {
    const folder = await this.getFolderById(folderId, userId);
    if (!folder) {
      return null;
    }

    // Recursively load children
    if (folder.children && folder.children.length > 0) {
      const childrenWithDescendants = await Promise.all(
        folder.children.map((child) =>
          this.getFolderHierarchy(child.id, userId)
        )
      );
      folder.children = childrenWithDescendants.filter(
        (c): c is Folder => c !== null
      );
    }

    return folder;
  }

  /**
   * Update a folder
   */
  async updateFolder(
    folderId: string,
    userId: string,
    input: UpdateFolderInput,
    ipAddress?: string
  ): Promise<Folder> {
    // Verify folder ownership
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
      },
    });

    if (!existingFolder) {
      throw new Error("Folder not found or access denied");
    }

    // Validate parent folder ownership if provided
    if (input.parentId !== undefined && input.parentId !== null) {
      // Prevent circular references
      if (input.parentId === folderId) {
        throw new Error("A folder cannot be its own parent");
      }

      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: input.parentId,
          userId,
        },
      });

      if (!parentFolder) {
        throw new Error("Parent folder not found or access denied");
      }

      // Check if the new parent is a descendant of this folder
      const isDescendant = await this.isDescendant(
        folderId,
        input.parentId,
        userId
      );
      if (isDescendant) {
        throw new Error("Cannot move folder to its own descendant");
      }
    }

    // Update folder
    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
      },
      include: {
        parent: true,
        children: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "FOLDER_UPDATED",
      resourceType: "folder",
      resourceId: folder.id,
      details: {
        changes: input,
      },
      ipAddress,
    });

    return this.mapFolderToType(folder);
  }

  /**
   * Delete a folder
   */
  async deleteFolder(
    folderId: string,
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    // Verify folder ownership
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
      },
      include: {
        children: true,
        notes: true,
      },
    });

    if (!folder) {
      throw new Error("Folder not found or access denied");
    }

    // Check if folder has children
    if (folder.children.length > 0) {
      throw new Error(
        "Cannot delete folder with subfolders. Delete or move subfolders first."
      );
    }

    // Move notes to root (no folder) before deleting
    if (folder.notes.length > 0) {
      await prisma.note.updateMany({
        where: {
          folderId,
        },
        data: {
          folderId: null,
        },
      });
    }

    // Delete folder
    await prisma.folder.delete({
      where: { id: folderId },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "FOLDER_DELETED",
      resourceType: "folder",
      resourceId: folderId,
      details: {
        name: folder.name,
        notesCount: folder.notes.length,
      },
      ipAddress,
    });
  }

  /**
   * Check if targetId is a descendant of folderId
   */
  private async isDescendant(
    folderId: string,
    targetId: string,
    userId: string
  ): Promise<boolean> {
    const target = await prisma.folder.findFirst({
      where: {
        id: targetId,
        userId,
      },
    });

    if (!target || !target.parentId) {
      return false;
    }

    if (target.parentId === folderId) {
      return true;
    }

    return this.isDescendant(folderId, target.parentId, userId);
  }

  /**
   * Map Prisma folder to Folder type
   */
  private mapFolderToType(folder: any): Folder {
    return {
      id: folder.id,
      userId: folder.userId,
      parentId: folder.parentId,
      name: folder.name,
      createdAt: folder.createdAt,
      parent: folder.parent || null,
      children: folder.children || [],
    };
  }
}

export const foldersService = new FoldersService();
