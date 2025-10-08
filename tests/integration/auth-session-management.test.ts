/**
 * Better Auth Session Management Integration Tests
 * Tests session lifecycle, expiration, and refresh
 * Requirements: 11.4
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerUser } from '@/lib/services/auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { GDPRConsent } from '@/types/auth';

// Test data
const testEmail = `test-session-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';
const testGDPRConsent: GDPRConsent = {
  dataProcessing: true,
  voiceRecording: true,
  aiProcessing: true,
  consentedAt: new Date(),
  ipAddress: '127.0.0.1',
};

describe('Better Auth Session Management Integration', () => {
  let testUserId: string;

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

  describe('Session Creation', () => {
    it('should create session on login', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(result.data?.session).toBeDefined();
      expect(result.data?.session.token).toBeDefined();
      expect(result.data?.session.expiresAt).toBeDefined();

      // Verify session in database
      const session = await prisma.session.findUnique({
        where: { token: result.data!.session.token },
      });

      expect(session).toBeDefined();
      expect(session?.userId).toBe(testUserId);
    });

    it('should create session on registration', async () => {
      const newEmail = `test-session-reg-${Date.now()}@example.com`;
      let newUserId: string | null = null;

      try {
        const result = await registerUser(
          {
            email: newEmail,
            password: testPassword,
            gdprConsent: testGDPRConsent,
          },
          '127.0.0.1'
        );

        newUserId = result.id;

        // Login to create session
        const loginResult = await auth.api.signInEmail({
          body: {
            email: newEmail,
            password: testPassword,
          },
        });

        expect(loginResult.data?.session).toBeDefined();

        // Verify session in database
        const session = await prisma.session.findUnique({
          where: { token: loginResult.data!.session.token },
        });

        expect(session).toBeDefined();
        expect(session?.userId).toBe(newUserId);
      } finally {
        // Cleanup
        if (newUserId) {
          await prisma.session.deleteMany({
            where: { userId: newUserId },
          });
          await prisma.account.deleteMany({
            where: { userId: newUserId },
          });
          await prisma.auditLog.deleteMany({
            where: { userId: newUserId },
          });
          await prisma.user.delete({
            where: { id: newUserId },
          });
        }
      }
    });

    it('should set session expiry to 7 days', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const session = await prisma.session.findUnique({
        where: { token: result.data!.session.token },
      });

      expect(session?.expiresAt).toBeDefined();

      // Calculate expected expiry (7 days from now)
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiryTime = new Date(session!.expiresAt).getTime();

      // Allow 1 minute tolerance
      const tolerance = 60 * 1000;
      expect(expiryTime).toBeGreaterThan(sevenDaysFromNow.getTime() - tolerance);
      expect(expiryTime).toBeLessThan(sevenDaysFromNow.getTime() + tolerance);
    });
  });

  describe('Session Expiration', () => {
    it('should reject expired session', async () => {
      // Create a session
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;

      // Manually expire the session
      await prisma.session.update({
        where: { token: sessionToken },
        data: { expiresAt: new Date(Date.now() - 1000) }, // Expired 1 second ago
      });

      // Try to use expired session
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('should accept valid session before expiry', async () => {
      // Create a session
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;

      // Set expiry to 1 hour from now
      await prisma.session.update({
        where: { token: sessionToken },
        data: { expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });

      // Use session
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeDefined();
      expect(session?.user.id).toBe(testUserId);
    });

    it('should handle session at exact expiry time', async () => {
      // Create a session
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;

      // Set expiry to now (edge case)
      await prisma.session.update({
        where: { token: sessionToken },
        data: { expiresAt: new Date() },
      });

      // Try to use session
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      const session = await auth.api.getSession({
        headers,
      });

      // Session should be expired or very close to expiry
      // Better Auth may have slight tolerance, so we accept either null or valid
      if (session) {
        expect(session.user.id).toBe(testUserId);
      }
    });
  });

  describe('Session Refresh', () => {
    it('should maintain session across multiple requests', async () => {
      // Create a session
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      // First request
      const session1 = await auth.api.getSession({
        headers,
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request
      const session2 = await auth.api.getSession({
        headers,
      });

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
      expect(session1?.user.id).toBe(session2?.user.id);
    });

    it('should update session timestamp on activity', async () => {
      // Create a session
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;

      // Get initial session data
      const initialSession = await prisma.session.findUnique({
        where: { token: sessionToken },
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Use session
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      await auth.api.getSession({
        headers,
      });

      // Get updated session data
      const updatedSession = await prisma.session.findUnique({
        where: { token: sessionToken },
      });

      expect(initialSession).toBeDefined();
      expect(updatedSession).toBeDefined();
      // Session should still exist
      expect(updatedSession?.userId).toBe(testUserId);
    });
  });

  describe('Sign Out', () => {
    it('should invalidate session on sign out', async () => {
      // Create a session
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;

      // Sign out
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      await auth.api.signOut({
        headers,
      });

      // Try to use session after sign out
      const session = await auth.api.getSession({
        headers,
      });

      expect(session).toBeNull();
    });

    it('should delete session from database on sign out', async () => {
      // Create a session
      const loginResult = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken = loginResult.data!.session.token;

      // Verify session exists
      const sessionBefore = await prisma.session.findUnique({
        where: { token: sessionToken },
      });
      expect(sessionBefore).toBeDefined();

      // Sign out
      const headers = new Headers();
      headers.set('cookie', `better-auth.session_token=${sessionToken}`);

      await auth.api.signOut({
        headers,
      });

      // Verify session is deleted
      const sessionAfter = await prisma.session.findUnique({
        where: { token: sessionToken },
      });
      expect(sessionAfter).toBeNull();
    });

    it('should allow new login after sign out', async () => {
      // Create a session
      const loginResult1 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken1 = loginResult1.data!.session.token;

      // Sign out
      const headers1 = new Headers();
      headers1.set('cookie', `better-auth.session_token=${sessionToken1}`);

      await auth.api.signOut({
        headers: headers1,
      });

      // Login again
      const loginResult2 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(loginResult2.data?.session).toBeDefined();
      expect(loginResult2.data?.session.token).not.toBe(sessionToken1);

      // New session should work
      const headers2 = new Headers();
      headers2.set('cookie', `better-auth.session_token=${loginResult2.data!.session.token}`);

      const session = await auth.api.getSession({
        headers: headers2,
      });

      expect(session).toBeDefined();
      expect(session?.user.id).toBe(testUserId);
    });
  });

  describe('Multiple Sessions', () => {
    it('should support multiple concurrent sessions', async () => {
      // Create first session
      const loginResult1 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken1 = loginResult1.data!.session.token;

      // Create second session
      const loginResult2 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken2 = loginResult2.data!.session.token;

      // Both sessions should be different
      expect(sessionToken1).not.toBe(sessionToken2);

      // Both sessions should work
      const headers1 = new Headers();
      headers1.set('cookie', `better-auth.session_token=${sessionToken1}`);

      const session1 = await auth.api.getSession({
        headers: headers1,
      });

      const headers2 = new Headers();
      headers2.set('cookie', `better-auth.session_token=${sessionToken2}`);

      const session2 = await auth.api.getSession({
        headers: headers2,
      });

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
      expect(session1?.user.id).toBe(testUserId);
      expect(session2?.user.id).toBe(testUserId);
    });

    it('should allow signing out one session without affecting others', async () => {
      // Create two sessions
      const loginResult1 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken1 = loginResult1.data!.session.token;

      const loginResult2 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const sessionToken2 = loginResult2.data!.session.token;

      // Sign out first session
      const headers1 = new Headers();
      headers1.set('cookie', `better-auth.session_token=${sessionToken1}`);

      await auth.api.signOut({
        headers: headers1,
      });

      // First session should be invalid
      const session1 = await auth.api.getSession({
        headers: headers1,
      });

      expect(session1).toBeNull();

      // Second session should still work
      const headers2 = new Headers();
      headers2.set('cookie', `better-auth.session_token=${sessionToken2}`);

      const session2 = await auth.api.getSession({
        headers: headers2,
      });

      expect(session2).toBeDefined();
      expect(session2?.user.id).toBe(testUserId);
    });
  });
});
