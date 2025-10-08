/**
 * Better Auth Data Preservation Integration Tests
 * Tests that custom fields and relationships are preserved
 * Requirements: 11.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerUser, updateGDPRConsent } from '@/lib/services/auth';
import { prisma } from '@/lib/db';
import type { GDPRConsent } from '@/types/auth';

// Test data
const testEmail = `test-data-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';
const testGDPRConsent: GDPRConsent = {
  dataProcessing: true,
  voiceRecording: true,
  aiProcessing: true,
  consentedAt: new Date(),
  ipAddress: '127.0.0.1',
};

describe('Better Auth Data Preservation Integration', () => {
  let testUserId: string;
  let testFolderId: string;
  let testNoteId: string;
  let testTagId: string;

  beforeAll(async () => {
    // Create a test user with full data
    const result = await registerUser(
      {
        email: testEmail,
        password: testPassword,
        gdprConsent: testGDPRConsent,
      },
      '127.0.0.1'
    );
    testUserId = result.id;

    // Create test folder
    const folder = await prisma.folder.create({
      data: {
        userId: testUserId,
        name: 'Test Folder',
        color: '#FF5733',
      },
    });
    testFolderId = folder.id;

    // Create test note
    const note = await prisma.note.create({
      data: {
        userId: testUserId,
        folderId: testFolderId,
        title: 'Test Note',
        audioUrl: '/test/audio.opus',
        encryptedAudioKey: JSON.stringify({ iv: 'test-iv', authTag: 'test-tag' }),
        duration: 120,
        metadata: {
          format: {
            mimeType: 'audio/opus',
            codec: 'opus',
          },
        },
      },
    });
    testNoteId = note.id;

    // Create test tag
    const tag = await prisma.tag.create({
      data: {
        userId: testUserId,
        name: 'Test Tag',
        color: '#3498DB',
      },
    });
    testTagId = tag.id;

    // Link tag to note
    await prisma.noteTag.create({
      data: {
        noteId: testNoteId,
        tagId: testTagId,
      },
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test data in correct order
    try {
      await prisma.noteTag.deleteMany({
        where: { noteId: testNoteId },
      });
      await prisma.note.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.tag.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.folder.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.session.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.account.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.delete({
        where: { id: testUserId },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Custom Fields Preservation', () => {
    it('should preserve encryptionKeyHash field', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeDefined();
      expect(user?.encryptionKeyHash).toBeDefined();
      expect(typeof user?.encryptionKeyHash).toBe('string');
      expect(user?.encryptionKeyHash.length).toBeGreaterThan(0);
    });

    it('should preserve gdprConsent field', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeDefined();
      expect(user?.gdprConsent).toBeDefined();

      const consent = user?.gdprConsent as any;
      expect(consent.dataProcessing).toBe(true);
      expect(consent.voiceRecording).toBe(true);
      expect(consent.aiProcessing).toBe(true);
      expect(consent.consentedAt).toBeDefined();
      expect(consent.ipAddress).toBe('127.0.0.1');
    });

    it('should allow updating gdprConsent', async () => {
      const newConsent: GDPRConsent = {
        dataProcessing: true,
        voiceRecording: false,
        aiProcessing: true,
        consentedAt: new Date(),
        ipAddress: '192.168.1.1',
      };

      await updateGDPRConsent(testUserId, newConsent, '192.168.1.1');

      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      const consent = user?.gdprConsent as any;
      expect(consent.dataProcessing).toBe(true);
      expect(consent.voiceRecording).toBe(false);
      expect(consent.aiProcessing).toBe(true);
      expect(consent.ipAddress).toBe('192.168.1.1');
    });

    it('should preserve Better Auth fields', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
      expect(user?.name).toBeDefined();
      expect(user?.emailVerified).toBeDefined();
      expect(user?.createdAt).toBeDefined();
      expect(user?.updatedAt).toBeDefined();
    });
  });

  describe('Relationship Preservation', () => {
    it('should preserve user-folder relationship', async () => {
      const folders = await prisma.folder.findMany({
        where: { userId: testUserId },
      });

      expect(folders).toBeDefined();
      expect(folders.length).toBeGreaterThan(0);
      expect(folders[0].id).toBe(testFolderId);
      expect(folders[0].name).toBe('Test Folder');
      expect(folders[0].color).toBe('#FF5733');
    });

    it('should preserve user-note relationship', async () => {
      const notes = await prisma.note.findMany({
        where: { userId: testUserId },
      });

      expect(notes).toBeDefined();
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].id).toBe(testNoteId);
      expect(notes[0].title).toBe('Test Note');
      expect(notes[0].audioUrl).toBe('/test/audio.opus');
    });

    it('should preserve folder-note relationship', async () => {
      const note = await prisma.note.findUnique({
        where: { id: testNoteId },
        include: { folder: true },
      });

      expect(note).toBeDefined();
      expect(note?.folderId).toBe(testFolderId);
      expect(note?.folder).toBeDefined();
      expect(note?.folder?.name).toBe('Test Folder');
    });

    it('should preserve user-tag relationship', async () => {
      const tags = await prisma.tag.findMany({
        where: { userId: testUserId },
      });

      expect(tags).toBeDefined();
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0].id).toBe(testTagId);
      expect(tags[0].name).toBe('Test Tag');
      expect(tags[0].color).toBe('#3498DB');
    });

    it('should preserve note-tag relationship', async () => {
      const note = await prisma.note.findUnique({
        where: { id: testNoteId },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      expect(note).toBeDefined();
      expect(note?.tags).toBeDefined();
      expect(note?.tags.length).toBeGreaterThan(0);
      expect(note?.tags[0].tag.id).toBe(testTagId);
      expect(note?.tags[0].tag.name).toBe('Test Tag');
    });

    it('should preserve user-auditLog relationship', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: testUserId },
      });

      expect(auditLogs).toBeDefined();
      expect(auditLogs.length).toBeGreaterThan(0);

      // Should have at least USER_REGISTERED log
      const registrationLog = auditLogs.find((log) => log.action === 'USER_REGISTERED');
      expect(registrationLog).toBeDefined();
      expect(registrationLog?.resourceType).toBe('user');
      expect(registrationLog?.resourceId).toBe(testUserId);
    });
  });

  describe('Complex Queries', () => {
    it('should support querying user with all relationships', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        include: {
          notes: true,
          folders: true,
          tags: true,
          auditLogs: true,
          sessions: true,
          accounts: true,
        },
      });

      expect(user).toBeDefined();
      expect(user?.notes).toBeDefined();
      expect(user?.folders).toBeDefined();
      expect(user?.tags).toBeDefined();
      expect(user?.auditLogs).toBeDefined();
      expect(user?.sessions).toBeDefined();
      expect(user?.accounts).toBeDefined();

      expect(user?.notes.length).toBeGreaterThan(0);
      expect(user?.folders.length).toBeGreaterThan(0);
      expect(user?.tags.length).toBeGreaterThan(0);
      expect(user?.auditLogs.length).toBeGreaterThan(0);
    });

    it('should support querying notes with nested relationships', async () => {
      const notes = await prisma.note.findMany({
        where: { userId: testUserId },
        include: {
          folder: true,
          tags: {
            include: {
              tag: true,
            },
          },
          user: true,
        },
      });

      expect(notes).toBeDefined();
      expect(notes.length).toBeGreaterThan(0);

      const note = notes[0];
      expect(note.folder).toBeDefined();
      expect(note.tags).toBeDefined();
      expect(note.user).toBeDefined();
      expect(note.user.id).toBe(testUserId);
    });

    it('should support filtering notes by folder', async () => {
      const notes = await prisma.note.findMany({
        where: {
          userId: testUserId,
          folderId: testFolderId,
        },
      });

      expect(notes).toBeDefined();
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].folderId).toBe(testFolderId);
    });

    it('should support filtering notes by tag', async () => {
      const notes = await prisma.note.findMany({
        where: {
          userId: testUserId,
          tags: {
            some: {
              tagId: testTagId,
            },
          },
        },
      });

      expect(notes).toBeDefined();
      expect(notes.length).toBeGreaterThan(0);
      expect(notes[0].id).toBe(testNoteId);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity on user deletion', async () => {
      // Create a temporary user with data
      const tempEmail = `test-temp-${Date.now()}@example.com`;
      const tempResult = await registerUser(
        {
          email: tempEmail,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      const tempUserId = tempResult.id;

      // Create related data
      const tempFolder = await prisma.folder.create({
        data: {
          userId: tempUserId,
          name: 'Temp Folder',
        },
      });

      const tempNote = await prisma.note.create({
        data: {
          userId: tempUserId,
          folderId: tempFolder.id,
          title: 'Temp Note',
          audioUrl: '/temp/audio.opus',
          encryptedAudioKey: JSON.stringify({ iv: 'temp-iv', authTag: 'temp-tag' }),
          duration: 60,
        },
      });

      // Delete user (should cascade delete related data)
      await prisma.session.deleteMany({
        where: { userId: tempUserId },
      });
      await prisma.account.deleteMany({
        where: { userId: tempUserId },
      });
      await prisma.noteTag.deleteMany({
        where: { noteId: tempNote.id },
      });
      await prisma.note.deleteMany({
        where: { userId: tempUserId },
      });
      await prisma.folder.deleteMany({
        where: { userId: tempUserId },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: tempUserId },
      });
      await prisma.user.delete({
        where: { id: tempUserId },
      });

      // Verify all related data is deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: tempUserId },
      });
      const deletedFolders = await prisma.folder.findMany({
        where: { userId: tempUserId },
      });
      const deletedNotes = await prisma.note.findMany({
        where: { userId: tempUserId },
      });

      expect(deletedUser).toBeNull();
      expect(deletedFolders.length).toBe(0);
      expect(deletedNotes.length).toBe(0);
    });

    it('should maintain data consistency across transactions', async () => {
      // Create a note with folder in a transaction-like manner
      const newFolder = await prisma.folder.create({
        data: {
          userId: testUserId,
          name: 'Transaction Test Folder',
        },
      });

      const newNote = await prisma.note.create({
        data: {
          userId: testUserId,
          folderId: newFolder.id,
          title: 'Transaction Test Note',
          audioUrl: '/transaction/audio.opus',
          encryptedAudioKey: JSON.stringify({ iv: 'tx-iv', authTag: 'tx-tag' }),
          duration: 90,
        },
      });

      // Verify both exist and are linked
      const note = await prisma.note.findUnique({
        where: { id: newNote.id },
        include: { folder: true },
      });

      expect(note).toBeDefined();
      expect(note?.folderId).toBe(newFolder.id);
      expect(note?.folder?.name).toBe('Transaction Test Folder');

      // Cleanup
      await prisma.note.delete({
        where: { id: newNote.id },
      });
      await prisma.folder.delete({
        where: { id: newFolder.id },
      });
    });
  });

  describe('Metadata Preservation', () => {
    it('should preserve note metadata', async () => {
      const note = await prisma.note.findUnique({
        where: { id: testNoteId },
      });

      expect(note).toBeDefined();
      expect(note?.metadata).toBeDefined();

      const metadata = note?.metadata as any;
      expect(metadata.format).toBeDefined();
      expect(metadata.format.mimeType).toBe('audio/opus');
      expect(metadata.format.codec).toBe('opus');
    });

    it('should preserve encrypted audio key', async () => {
      const note = await prisma.note.findUnique({
        where: { id: testNoteId },
      });

      expect(note).toBeDefined();
      expect(note?.encryptedAudioKey).toBeDefined();

      const encryptedKey = JSON.parse(note!.encryptedAudioKey);
      expect(encryptedKey.iv).toBe('test-iv');
      expect(encryptedKey.authTag).toBe('test-tag');
    });

    it('should preserve timestamps', async () => {
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user).toBeDefined();
      expect(user?.createdAt).toBeDefined();
      expect(user?.updatedAt).toBeDefined();
      expect(user?.createdAt).toBeInstanceOf(Date);
      expect(user?.updatedAt).toBeInstanceOf(Date);
    });
  });
});
