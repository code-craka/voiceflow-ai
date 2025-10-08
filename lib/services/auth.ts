/**
 * Authentication Service
 * Handles user registration with Better Auth integration
 * Requirements: 5.3, 6.1
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
    generateEncryptionKey,
    hashEncryptionKey,
} from './encryption';
import type {
    UserRegistrationRequest,
    UserWithEncryptionKey,
    GDPRConsent,
} from '@/types/auth';
import { createAuditLog } from './audit';

export class AuthenticationError extends Error {
    constructor(
        message: string,
        public code: string
    ) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

/**
 * Register a new user with encryption key generation
 * Uses Better Auth for user creation and password management
 */
export async function registerUser(
    request: UserRegistrationRequest,
    ipAddress?: string
): Promise<UserWithEncryptionKey> {
    // Generate encryption key for user
    const encryptionKey = generateEncryptionKey();
    const encryptionKeyHash = hashEncryptionKey(encryptionKey);

    // Create user with Better Auth
    const result = await auth.api.signUpEmail({
        body: {
            email: request.email,
            password: request.password,
            name: request.email.split('@')[0],
        },
    });

    if (!result.data?.user) {
        throw new AuthenticationError('Failed to create user', 'USER_CREATION_FAILED');
    }

    // Update user with custom fields
    const user = await prisma.user.update({
        where: { id: result.data.user.id },
        data: {
            encryptionKeyHash,
            gdprConsent: {
                ...request.gdprConsent,
                consentedAt: new Date(),
                ipAddress,
            },
        },
    });

    // Create audit log
    await createAuditLog({
        userId: user.id,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        resourceId: user.id,
        details: {
            email: user.email,
            gdprConsent: request.gdprConsent,
        },
        ipAddress: ipAddress || undefined,
    });

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image || undefined,
        encryptionKeyHash: user.encryptionKeyHash,
        gdprConsent: user.gdprConsent as unknown as GDPRConsent,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        encryptionKey,
    };
}

/**
 * Get session from request headers (server-side)
 * Used in API routes to verify authentication
 */
export async function getServerSession(headers: Headers) {
    const session = await auth.api.getSession({
        headers,
    });

    return session;
}

/**
 * Update user's GDPR consent
 */
export async function updateGDPRConsent(
    userId: string,
    consent: GDPRConsent,
    ipAddress?: string
): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: {
            gdprConsent: {
                ...consent,
                consentedAt: new Date(),
                ipAddress,
            },
        },
    });

    await createAuditLog({
        userId,
        action: 'GDPR_CONSENT_UPDATED',
        resourceType: 'user',
        resourceId: userId,
        details: { consent },
        ipAddress: ipAddress || undefined,
    });
}
