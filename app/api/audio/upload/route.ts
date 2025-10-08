/**
 * Audio Upload API Endpoint
 * Handles secure audio file upload with encryption
 * Requirements: 1.4, 5.1, 5.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAI, handleArcjetDecision } from '@/lib/arcjet';
import { validateAudioBuffer, encryptAudio } from '@/lib/services/audio';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 1. Arcjet security protection for AI/audio endpoints
    const decision = await ajAI.protect(request, { requested: 2 });
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // 2. Better Auth session verification
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to upload audio',
            retryable: false,
          },
        },
        { status: 401 }
      );
    }

    // Extract userId from session
    const userId = session.user.id;

    // 3. Parse form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const userEncryptionKey = formData.get('encryptionKey') as string;
    const title = formData.get('title') as string | null;
    const folderId = formData.get('folderId') as string | null;
    const duration = parseInt(formData.get('duration') as string) || 0;

    // 4. Validate required fields
    if (!audioFile) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_AUDIO_FILE',
            message: 'Audio file is required',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (!userEncryptionKey) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_ENCRYPTION_KEY',
            message: 'Encryption key is required',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // 5. Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // 6. Validate audio format
    const validation = validateAudioBuffer(audioBuffer, audioFile.type);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_AUDIO_FORMAT',
            message: validation.error,
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // 7. Encrypt audio data
    let encryptedData;
    try {
      const blob = new Blob([audioBuffer], { type: audioFile.type });
      encryptedData = await encryptAudio(blob, userEncryptionKey);
    } catch (error) {
      console.error('Encryption error:', error);
      return NextResponse.json(
        {
          error: {
            code: 'ENCRYPTION_FAILED',
            message: 'Failed to encrypt audio file',
            details: (error as Error).message,
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // 8. Generate audio ID
    const audioId = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // 9. Store encrypted audio metadata in database
    // TODO: Upload encrypted data to S3-compatible storage
    // For now, we'll store metadata only
    try {
      const note = await prisma.note.create({
        data: {
          userId,
          title: title || `Voice Note ${new Date().toLocaleDateString()}`,
          audioUrl: `/api/audio/${audioId}`, // Placeholder URL
          encryptedAudioKey: JSON.stringify({
            iv: encryptedData.iv,
            authTag: encryptedData.authTag,
          }),
          duration,
          folderId: folderId || null,
          metadata: {
            format: validation.format ? {
              mimeType: validation.format.mimeType,
              codec: validation.format.codec,
              bitrate: validation.format.bitrate,
              sampleRate: validation.format.sampleRate,
            } : undefined,
            originalSize: encryptedData.originalSize,
            encryptedSize: encryptedData.encryptedSize,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // 10. Return success response
      return NextResponse.json({
        success: true,
        data: {
          audioId: note.id,
          encryptedUrl: note.audioUrl,
          duration: note.duration,
          format: validation.format,
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to store audio metadata',
            details: (dbError as Error).message,
            retryable: true,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload audio file',
          details: (error as Error).message,
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
