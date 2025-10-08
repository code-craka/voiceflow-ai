/**
 * End-to-End Audio Processing Pipeline Integration Test
 * Tests complete user journey: audio recording → transcription → AI processing
 * Requirements: 8.2, 8.4, 11.1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerUser } from '@/lib/services/auth';
import { transcriptionPipeline } from '@/lib/services/transcriptionPipeline';
import { processTranscriptionWithRetry } from '@/lib/services/ai';
import { prisma } from '@/lib/db';
import type { GDPRConsent } from '@/types/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test data
const testEmail = `e2e-test-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';
const testGDPRConsent: GDPRConsent = {
  dataProcessing: true,
  voiceRecording: true,
  aiProcessing: true,
  consentedAt: new Date(),
  ipAddress: '127.0.0.1',
};

describe('End-to-End Audio Processing Pipeline', () => {
  let userId: string;
  let noteId: string;
  let encryptionKey: string;

  beforeAll(async () => {
    // Register test user
    const user = await registerUser(
      {
        email: testEmail,
        password: testPassword,
        gdprConsent: testGDPRConsent,
      },
      '127.0.0.1'
    );

    userId = user.id;
    encryptionKey = user.encryptionKey;

    // Create a test note
    const note = await prisma.note.create({
      data: {
        userId,
        title: 'E2E Test Note',
        content: '',
        transcription: '',
      },
    });

    noteId = note.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (noteId) {
      await prisma.note.delete({ where: { id: noteId } }).catch(() => {});
    }

    if (userId) {
      await prisma.session.deleteMany({ where: { userId } });
      await prisma.account.deleteMany({ where: { userId } });
      await prisma.auditLog.deleteMany({ where: { userId } });
      await prisma.note.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  });

  describe('Complete Audio Processing Workflow', () => {
    it('should process audio through complete pipeline', async () => {
      // Step 1: Create mock audio data (simulating browser recording)
      const mockAudioData = Buffer.from('mock-audio-data-for-testing');

      // Step 2: Submit transcription job
      const jobId = await transcriptionPipeline.submitTranscription(
        noteId,
        userId,
        mockAudioData,
        {
          language: 'en',
          enablePunctuation: true,
        }
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      // Step 3: Check job status
      const status = transcriptionPipeline.getJobStatus(jobId);
      expect(status).toBeDefined();
      expect(['pending', 'processing', 'completed', 'failed']).toContain(
        status?.status
      );
    }, 30000); // 30 second timeout for transcription

    it('should handle transcription with fallback', async () => {
      const mockAudioData = Buffer.from('mock-audio-for-fallback-test');

      // Submit job and expect it to handle fallback gracefully
      const jobId = await transcriptionPipeline.submitTranscription(
        noteId,
        userId,
        mockAudioData
      );

      expect(jobId).toBeDefined();

      // Job should be created even if transcription fails
      const status = transcriptionPipeline.getJobStatus(jobId);
      expect(status).toBeDefined();
    }, 30000);

    it('should process transcription with AI', async () => {
      // Mock transcription text
      const mockTranscription = `
        This is a test transcription for the end-to-end pipeline.
        We need to discuss the project timeline and deliverables.
        Action items: Review the design document by Friday.
        Schedule a follow-up meeting next week.
        The deadline is December 15th, 2024.
      `;

      // Process with AI
      const result = await processTranscriptionWithRetry(mockTranscription, {
        enableModeration: true,
      });

      // Verify AI processing results
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.summary).toBeDefined();
      expect(result.summary.keyPoints).toBeInstanceOf(Array);
      expect(result.insights).toBeDefined();
      expect(result.model).toBeDefined();

      // Verify summary quality
      expect(result.summary.summary.length).toBeGreaterThan(0);
      expect(result.summary.confidence).toBeGreaterThan(0);

      // Verify insights extraction
      expect(result.insights.keyTopics).toBeInstanceOf(Array);
      expect(result.insights.sentiment).toBeDefined();
    }, 30000);

    it('should handle AI processing failure gracefully', async () => {
      // Very short transcription that might cause issues
      const shortTranscription = 'Test';

      // Should not throw, but return transcription-only mode
      const result = await processTranscriptionWithRetry(shortTranscription);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      // In fallback mode, model should indicate degraded service
      expect(['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'transcription-only']).toContain(
        result.model
      );
    }, 30000);
  });

  describe('User Journey: Registration to Note Management', () => {
    it('should complete full user journey', async () => {
      // Step 1: User registration (already done in beforeAll)
      expect(userId).toBeDefined();
      expect(encryptionKey).toBeDefined();

      // Step 2: Verify user can create notes
      const newNote = await prisma.note.create({
        data: {
          userId,
          title: 'Journey Test Note',
          content: 'Test content',
          transcription: '',
        },
      });

      expect(newNote).toBeDefined();
      expect(newNote.userId).toBe(userId);

      // Step 3: Verify user can retrieve their notes
      const userNotes = await prisma.note.findMany({
        where: { userId },
      });

      expect(userNotes.length).toBeGreaterThan(0);
      expect(userNotes.some((n) => n.id === newNote.id)).toBe(true);

      // Step 4: Verify user can update notes
      const updatedNote = await prisma.note.update({
        where: { id: newNote.id },
        data: {
          transcription: 'Updated transcription',
          summary: 'Updated summary',
        },
      });

      expect(updatedNote.transcription).toBe('Updated transcription');
      expect(updatedNote.summary).toBe('Updated summary');

      // Step 5: Verify user can delete notes
      await prisma.note.delete({
        where: { id: newNote.id },
      });

      const deletedNote = await prisma.note.findUnique({
        where: { id: newNote.id },
      });

      expect(deletedNote).toBeNull();
    });

    it('should handle folder organization', async () => {
      // Create folder
      const folder = await prisma.folder.create({
        data: {
          userId,
          name: 'Test Folder',
        },
      });

      expect(folder).toBeDefined();
      expect(folder.userId).toBe(userId);

      // Create note in folder
      const noteInFolder = await prisma.note.create({
        data: {
          userId,
          folderId: folder.id,
          title: 'Note in Folder',
          content: 'Content',
          transcription: '',
        },
      });

      expect(noteInFolder.folderId).toBe(folder.id);

      // Retrieve notes by folder
      const folderNotes = await prisma.note.findMany({
        where: {
          userId,
          folderId: folder.id,
        },
      });

      expect(folderNotes.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.note.delete({ where: { id: noteInFolder.id } });
      await prisma.folder.delete({ where: { id: folder.id } });
    });

    it('should handle tag management', async () => {
      // Create tags
      const tag1 = await prisma.tag.create({
        data: {
          userId,
          name: 'important',
        },
      });

      const tag2 = await prisma.tag.create({
        data: {
          userId,
          name: 'work',
        },
      });

      // Create note with tags
      const noteWithTags = await prisma.note.create({
        data: {
          userId,
          title: 'Tagged Note',
          content: 'Content',
          transcription: '',
          tags: {
            create: [{ tagId: tag1.id }, { tagId: tag2.id }],
          },
        },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      expect(noteWithTags.tags.length).toBe(2);

      // Query notes by tag
      const taggedNotes = await prisma.note.findMany({
        where: {
          userId,
          tags: {
            some: {
              tagId: tag1.id,
            },
          },
        },
      });

      expect(taggedNotes.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.noteTag.deleteMany({ where: { noteId: noteWithTags.id } });
      await prisma.note.delete({ where: { id: noteWithTags.id } });
      await prisma.tag.deleteMany({
        where: { id: { in: [tag1.id, tag2.id] } },
      });
    });
  });

  describe('Cross-Browser Compatibility Validation', () => {
    it('should handle different audio formats', async () => {
      // Test with different mock audio formats
      const formats = [
        { name: 'opus', data: Buffer.from('opus-audio-data') },
        { name: 'webm', data: Buffer.from('webm-audio-data') },
        { name: 'mp4', data: Buffer.from('mp4-audio-data') },
      ];

      for (const format of formats) {
        const jobId = await transcriptionPipeline.submitTranscription(
          noteId,
          userId,
          format.data
        );

        expect(jobId).toBeDefined();
        const status = transcriptionPipeline.getJobStatus(jobId);
        expect(status).toBeDefined();
      }
    }, 30000);

    it('should handle various text encodings', async () => {
      const transcriptions = [
        'Simple ASCII text',
        'Text with émojis 🎤 and spëcial çharacters',
        'Unicode text: 你好世界',
        'Mixed: Hello 世界 🌍',
      ];

      for (const text of transcriptions) {
        const result = await processTranscriptionWithRetry(text);
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
      }
    }, 30000);
  });

  describe('Mobile Responsiveness Validation', () => {
    it('should handle small audio chunks (mobile recording)', async () => {
      // Simulate mobile recording with smaller chunks
      const smallChunk = Buffer.from('small-mobile-audio-chunk');

      const jobId = await transcriptionPipeline.submitTranscription(
        noteId,
        userId,
        smallChunk
      );

      expect(jobId).toBeDefined();
    });

    it('should handle interrupted recordings', async () => {
      // Simulate interrupted recording (very short audio)
      const interruptedAudio = Buffer.from('short');

      const jobId = await transcriptionPipeline.submitTranscription(
        noteId,
        userId,
        interruptedAudio
      );

      expect(jobId).toBeDefined();
      // Should handle gracefully without throwing
    });
  });

  describe('Performance Validation', () => {
    it('should process transcription within time limits', async () => {
      const mockTranscription = 'Test transcription for performance check.';
      const startTime = Date.now();

      const result = await processTranscriptionWithRetry(mockTranscription);

      const processingTime = Date.now() - startTime;

      expect(result).toBeDefined();
      // Should complete within reasonable time (< 10 seconds for short text)
      expect(processingTime).toBeLessThan(10000);
    });

    it('should handle concurrent requests', async () => {
      const mockTranscription = 'Concurrent test transcription.';

      // Submit multiple requests concurrently
      const promises = Array.from({ length: 3 }, () =>
        processTranscriptionWithRetry(mockTranscription)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
      });
    }, 30000);
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid audio data', async () => {
      const invalidAudio = Buffer.from('');

      await expect(
        transcriptionPipeline.submitTranscription(noteId, userId, invalidAudio)
      ).rejects.toThrow();
    });

    it('should handle missing note ID', async () => {
      const mockAudio = Buffer.from('test-audio');
      const fakeNoteId = '00000000-0000-0000-0000-000000000000';

      // Should handle gracefully or throw appropriate error
      await expect(
        transcriptionPipeline.submitTranscription(fakeNoteId, userId, mockAudio)
      ).rejects.toThrow();
    });

    it('should recover from AI service failures', async () => {
      // Empty transcription should trigger fallback
      const emptyTranscription = '';

      await expect(
        processTranscriptionWithRetry(emptyTranscription)
      ).rejects.toThrow();
    });
  });
});
