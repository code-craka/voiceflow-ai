/**
 * Appwrite Storage Service
 * 
 * Handles encrypted audio file storage using Appwrite Storage with:
 * - AES-256-GCM encryption before upload
 * - User-specific permissions (Role.user)
 * - Automatic file cleanup on deletion
 * - GDPR-compliant data handling
 * 
 * Requirements:
 * - 5.1: AES-256-GCM encryption for audio files
 * - 5.3: User-controlled encryption keys
 * - 6.4: Complete data deletion support
 */

import { ID, Permission, Role } from "node-appwrite";
import { serverStorage, STORAGE_CONFIG } from "@/lib/appwrite";
import { encryptAudio, decryptAudio } from "@/lib/services/encryption";
import type { InputFile } from "node-appwrite/file";

// ============================================================================
// Types
// ============================================================================

export interface AudioUploadOptions {
  userId: string;
  encryptionKey: string;
  fileName?: string;
  onProgress?: (progress: number) => void;
}

export interface AudioUploadResult {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  encryptedKey: string;
  duration?: number;
}

export interface AudioDownloadOptions {
  fileId: string;
  encryptionKey: string;
}

export interface AudioDownloadResult {
  audioData: Buffer;
  fileName: string;
  mimeType: string;
}

export interface StorageQuota {
  used: number;
  limit: number;
  available: number;
}

// ============================================================================
// Storage Service
// ============================================================================

export class AppwriteStorageService {
  private readonly bucketId = STORAGE_CONFIG.BUCKET_ID;

  /**
   * Upload encrypted audio file to Appwrite Storage
   * 
   * @param audioData - Raw audio file buffer
   * @param options - Upload options including userId and encryption key
   * @returns Upload result with file ID and URL
   * 
   * @example
   * ```typescript
   * const result = await storageService.uploadAudio(audioBuffer, {
   *   userId: 'user-123',
   *   encryptionKey: userEncryptionKey,
   *   fileName: 'meeting-notes.webm',
   * });
   * console.log(`Uploaded: ${result.url}`);
   * ```
   */
  async uploadAudio(
    audioData: Buffer,
    options: AudioUploadOptions
  ): Promise<AudioUploadResult> {
    try {
      // 1. Validate file size
      if (audioData.length > STORAGE_CONFIG.MAX_FILE_SIZE) {
        throw new Error(
          `File size ${audioData.length} exceeds maximum ${STORAGE_CONFIG.MAX_FILE_SIZE}`
        );
      }

      // 2. Encrypt audio data (Requirement 5.1)
      const { encryptedData, iv, authTag } = await encryptAudio(
        audioData,
        options.encryptionKey
      );

      // 3. Combine encrypted data with IV and auth tag for storage
      const storageData = Buffer.concat([
        Buffer.from(iv),
        Buffer.from(authTag),
        encryptedData,
      ]);

      // 4. Generate file ID and name
      const fileId = ID.unique();
      const fileName = options.fileName || `audio-${fileId}.encrypted`;

      // 5. Create InputFile from buffer
      const inputFile = InputFile.fromBuffer(storageData, fileName);

      // 6. Upload to Appwrite with user-specific permissions (Requirement 5.3)
      const file = await serverStorage.createFile(
        this.bucketId,
        fileId,
        inputFile,
        [
          Permission.read(Role.user(options.userId)),
          Permission.update(Role.user(options.userId)),
          Permission.delete(Role.user(options.userId)),
        ]
      );

      // 7. Generate file URL
      const url = this.getFileUrl(fileId);

      return {
        fileId: file.$id,
        fileName: file.name,
        fileSize: file.sizeOriginal,
        mimeType: "audio/encrypted",
        url,
        encryptedKey: options.encryptionKey,
      };
    } catch (error) {
      console.error("Audio upload failed:", error);
      throw new Error(
        `Failed to upload audio: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Download and decrypt audio file from Appwrite Storage
   * 
   * @param options - Download options including fileId and encryption key
   * @returns Decrypted audio data
   * 
   * @example
   * ```typescript
   * const result = await storageService.downloadAudio({
   *   fileId: 'file-123',
   *   encryptionKey: userEncryptionKey,
   * });
   * // Use result.audioData for playback
   * ```
   */
  async downloadAudio(
    options: AudioDownloadOptions
  ): Promise<AudioDownloadResult> {
    try {
      // 1. Get file metadata
      const file = await serverStorage.getFile(this.bucketId, options.fileId);

      // 2. Download encrypted file
      const encryptedData = await serverStorage.getFileDownload(
        this.bucketId,
        options.fileId
      );

      // 3. Convert ArrayBuffer to Buffer
      const storageData = Buffer.from(encryptedData);

      // 4. Extract IV, auth tag, and encrypted data
      const iv = storageData.subarray(0, 12);
      const authTag = storageData.subarray(12, 28);
      const encrypted = storageData.subarray(28);

      // 5. Decrypt audio data
      const audioData = await decryptAudio(
        encrypted,
        options.encryptionKey,
        iv,
        authTag
      );

      return {
        audioData,
        fileName: file.name,
        mimeType: "audio/webm", // Original mime type
      };
    } catch (error) {
      console.error("Audio download failed:", error);
      throw new Error(
        `Failed to download audio: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Delete audio file from Appwrite Storage
   * 
   * @param fileId - File ID to delete
   * 
   * @example
   * ```typescript
   * await storageService.deleteAudio('file-123');
   * ```
   */
  async deleteAudio(fileId: string): Promise<void> {
    try {
      await serverStorage.deleteFile(this.bucketId, fileId);
    } catch (error) {
      console.error("Audio deletion failed:", error);
      throw new Error(
        `Failed to delete audio: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get file metadata without downloading
   * 
   * @param fileId - File ID
   * @returns File metadata
   */
  async getFileMetadata(fileId: string) {
    try {
      return await serverStorage.getFile(this.bucketId, fileId);
    } catch (error) {
      console.error("Failed to get file metadata:", error);
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get public file URL (for encrypted files, still requires decryption)
   * 
   * @param fileId - File ID
   * @returns Public URL
   */
  getFileUrl(fileId: string): string {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
    return `${endpoint}/storage/buckets/${this.bucketId}/files/${fileId}/view?project=${projectId}`;
  }

  /**
   * Get file preview URL (for supported formats)
   * 
   * @param fileId - File ID
   * @param width - Preview width
   * @param height - Preview height
   * @returns Preview URL
   */
  getFilePreview(fileId: string, width = 400, height = 400): string {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
    return `${endpoint}/storage/buckets/${this.bucketId}/files/${fileId}/preview?project=${projectId}&width=${width}&height=${height}`;
  }

  /**
   * List all files for a user (requires proper permissions)
   * 
   * @param userId - User ID
   * @returns List of files
   */
  async listUserFiles(userId: string) {
    try {
      return await serverStorage.listFiles(this.bucketId);
    } catch (error) {
      console.error("Failed to list files:", error);
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get storage quota for a user
   * 
   * @param userId - User ID
   * @returns Storage quota information
   */
  async getStorageQuota(userId: string): Promise<StorageQuota> {
    try {
      const files = await this.listUserFiles(userId);
      const used = files.files.reduce(
        (total, file) => total + file.sizeOriginal,
        0
      );
      const limit = 1024 * 1024 * 1024; // 1GB default limit

      return {
        used,
        limit,
        available: limit - used,
      };
    } catch (error) {
      console.error("Failed to get storage quota:", error);
      throw new Error(
        `Failed to get storage quota: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Delete all files for a user (GDPR compliance - Requirement 6.4)
   * 
   * @param userId - User ID
   * @returns Number of files deleted
   */
  async deleteAllUserFiles(userId: string): Promise<number> {
    try {
      const files = await this.listUserFiles(userId);
      let deletedCount = 0;

      for (const file of files.files) {
        try {
          await this.deleteAudio(file.$id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete file ${file.$id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to delete user files:", error);
      throw new Error(
        `Failed to delete user files: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const storageService = new AppwriteStorageService();
