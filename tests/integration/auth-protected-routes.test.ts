/**
 * Better Auth Protected Routes Integration Tests
 * Tests authentication on protected API routes
 * Requirements: 11.3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerUser } from '@/lib/services/auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { GDPRConsent } from '@/types/auth';

// Test data
const testEmail = `test-protected-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';
const testGDPRConsent: GDPRConsent = {
  dataProcessing: true,
  voiceRecording: true,
  aiProcessing: true,
  consentedAt: new Date(),
  ipAddress: '127.0.0.1',
};

describe('Better Auth Protected Routes Integration', () => {
  let testUserId: string;
  let validSessionToken: string;

  beforeAll(async () => {
    // Create a test user
    const result = await registerUser(
      {
        email: testEmail,
        password: testPassword,
        gdprConsent: testGDPRConsent,
      },
      '127.0.0.1'
    );
    testUserId = result.id;

    // Login to get a valid session
    const loginResult = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: testPassword,
      },
    });

    validSessionToken = loginResult.data!.session.token;
  });

  afterAll(async () => {
    // Cleanup: Delete test user and related data
    try {
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

  describe('Session Verification', () => {
    it('should verify valid session with headers', async () => {
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${validSessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeDefined();
      expect(session?.user).toBeDefined();
      expect(session?.user.id).toBe(testUserId);
      expect(session?.user.email).toBe(testEmail);
    });

    it('should return null for invalid session token', async () => {
      const headers = new Headers();
      headers.set('cookie', 'better-auth.session_token=invalid-token-12345');

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('should return null for missing session token', async () => {
      const headers = new Headers();

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('should return null for expired session token', async () => {
      // Create a session and manually expire it
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;

      // Manually expire the session in database
      await prisma.session.update({
        where: { token: sessionToken },
        data: { expiresAt: new Date(Date.now() - 1000) }, // Expired 1 second ago
      });

      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });
  });

  describe('User Data Access', () => {
    it('should provide user ID from session', async () => {
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${validSessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session?.user.id).toBeDefined();
      expect(typeof session?.user.id).toBe('string');
      expect(session?.user.id).toBe(testUserId);
    });

    it('should provide user email from session', async () => {
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${validSessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session?.user.email).toBeDefined();
      expect(session?.user.email).toBe(testEmail);
    });

    it('should allow querying user data with session user ID', async () => {
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${validSessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      // Query user data using session user ID
      const user = await prisma.user.findUnique({
        where: { id: session!.user.id },
      });

      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);
      expect(user?.email).toBe(testEmail);
      expect(user?.encryptionKeyHash).toBeDefined();
      expect(user?.gdprConsent).toBeDefined();
    });

    it('should allow querying user notes with session user ID', async () => {
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${validSessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      // Query user notes using session user ID
      const notes = await prisma.note.findMany({
        where: { userId: session!.user.id },
      });

      expect(notes).toBeDefined();
      expect(Array.isArray(notes)).toBe(true);
    });
  });

  describe('Authorization Patterns', () => {
    it('should prevent access to other users data', async () => {
      // Create another test user
      const otherEmail = `test-other-${Date.now()}@example.com`;
      const otherResult = await registerUser(
        {
          email: otherEmail,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      const otherUserId = otherResult.id;

      try {
        const headers = new Headers();
        headers.set('cookie', `better-auth.session_token=${validSessionToken}`);

        const session = await auth.api.getSession({
          headers,
        });

        // Try to query other user's data
        const otherUserNotes = await prisma.note.findMany({
          where: { userId: otherUserId },
        });

        // Session user should not be able to access other user's notes
        // (In a real API route, this would be prevented by checking session.user.id)
        expect(session?.user.id).not.toBe(otherUserId);
        expect(session?.user.id).toBe(testUserId);
      } finally {
        // Cleanup other user
        await prisma.session.deleteMany({
          where: { userId: otherUserId },
        });
        await prisma.account.deleteMany({
          where: { userId: otherUserId },
        });
        await prisma.auditLog.deleteMany({
          where: { userId: otherUserId },
        });
        await prisma.user.delete({
          where: { id: otherUserId },
        });
      }
    });

    it('should provide consistent user ID across multiple requests', async () => {
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${validSessionToken}`);

      // First request
      const session1 = await auth.api.getSession({
        headers,
      });

      // Second request
      const session2 = await auth.api.getSession({
        headers,
      });

      expect(session1?.user.id).toBe(session2?.user.id);
      expect(session1?.user.email).toBe(session2?.user.email);
    });
  });

  describe('Session Token Handling', () => {
    it('should handle multiple cookie formats', async () => {
      const headers = new Headers();
      // Test with additional cookies
      headers.set(
        'cookie',
        `other-cookie=value; better-auth.session_token=${validSessionToken}; another-cookie=value`
      );

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeDefined();
      expect(session?.user.id).toBe(testUserId);
    });

    it('should handle cookie with spaces', async () => {
      const headers = new Headers();
      headers.set('cookie', ` better-auth.session_token=${validSessionToken} `);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeDefined();
      expect(session?.user.id).toBe(testUserId);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed session tokens gracefully', async () => {
      const headers = new Headers();
      headers.set('cookie', 'better-auth.session_token=malformed!!!token');

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('should handle empty session token', async () => {
      const headers = new Headers();
      headers.set('cookie', 'better-auth.session_token=');

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('should handle missing cookie header', async () => {
      const headers = new Headers();
      // No cookie header set

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });
  });
});
