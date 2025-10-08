# Appwrite Storage Integration

## Overview

VoiceFlow AI uses **Appwrite Cloud Storage** for encrypted audio file storage. Appwrite provides a secure, scalable, and developer-friendly storage solution with built-in CDN delivery and automatic encryption at rest.

## Configuration

### Storage Details

- **Bucket Name**: voiceflow-ai
- **Bucket ID**: `68e5eb26002366989566`
- **Region**: Frankfurt (fra.cloud.appwrite.io)
- **Endpoint**: `https://fra.cloud.appwrite.io/v1`
- **Project ID**: `68e5eabf00102ec66627`

### Environment Variables

Add these to your `.env.local` file:

```bash
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="68e5eabf00102ec66627"
APPWRITE_API_KEY="your_api_key_here"
```

**Variable Descriptions**:

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`: Public API endpoint (client and server)
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: Public project identifier (client and server)
- `APPWRITE_API_KEY`: Server-side API key with Storage permissions (server only)

## Storage Configuration

### File Constraints

```typescript
export const STORAGE_CONFIG = {
  BUCKET_ID: '68e5eb26002366989566',
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_MIME_TYPES: [
    'audio/webm',
    'audio/opus',
    'audio/ogg',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
  ],
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks for large files
};
```

### Features

- **Maximum File Size**: 100MB per file
- **Supported Formats**: WebM, Opus, OGG, WAV, MP3, MPEG
- **Chunked Uploads**: Large files uploaded in 5MB chunks
- **Encryption**: Automatic encryption at rest
- **CDN Delivery**: Fast global access via Appwrite CDN
- **Access Control**: User-based permissions with Better Auth integration

## Usage Patterns

### Client-Side Upload (Browser)

Use the client-side Appwrite instance for uploads from React components:

```typescript
import { clientStorage, STORAGE_CONFIG } from '@/lib/appwrite';
import { ID } from 'appwrite';

export async function uploadAudioFile(file: File): Promise<string> {
  try {
    // Validate file
    if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
      throw new Error('File too large (max 100MB)');
    }

    if (!STORAGE_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Invalid file type');
    }

    // Upload to Appwrite
    const response = await clientStorage.createFile(
      STORAGE_CONFIG.BUCKET_ID,
      ID.unique(), // Generate unique file ID
      file
    );

    return response.$id;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

### Server-Side Operations (API Routes)

Use the server-side Appwrite instance for privileged operations:

```typescript
import { serverStorage, STORAGE_CONFIG } from '@/lib/appwrite';

export async function getAudioFile(fileId: string): Promise<Buffer> {
  try {
    const file = await serverStorage.getFileDownload(STORAGE_CONFIG.BUCKET_ID, fileId);

    return Buffer.from(file);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

export async function deleteAudioFile(fileId: string): Promise<void> {
  try {
    await serverStorage.deleteFile(STORAGE_CONFIG.BUCKET_ID, fileId);
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
}
```

### Get File URL

```typescript
import { clientStorage, STORAGE_CONFIG } from '@/lib/appwrite';

export function getAudioFileUrl(fileId: string): string {
  return clientStorage.getFileView(STORAGE_CONFIG.BUCKET_ID, fileId).href;
}
```

## Integration with Audio Service

### Audio Upload Flow

1. **Client captures audio** using Web Audio API
2. **Client uploads to Appwrite** using `clientStorage.createFile()`
3. **Server receives file ID** and stores in database
4. **Server encrypts metadata** (if needed) using encryption service
5. **Audit log created** for GDPR compliance

### Example: Complete Upload Flow

```typescript
// components/audio/AudioRecorder.tsx
import { uploadAudioFile } from '@/lib/services/audio';

async function handleRecordingComplete(audioBlob: Blob) {
  try {
    // Convert blob to file
    const file = new File([audioBlob], 'recording.webm', {
      type: 'audio/webm',
    });

    // Upload to Appwrite
    const fileId = await uploadAudioFile(file);

    // Send to API for processing
    const response = await fetch('/api/audio/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        duration: recordingDuration,
      }),
    });

    if (!response.ok) throw new Error('Upload failed');

    const { noteId } = await response.json();
    router.push(`/dashboard/notes/${noteId}`);
  } catch (error) {
    console.error('Recording upload failed:', error);
    setError('Failed to upload recording');
  }
}
```

```typescript
// app/api/audio/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAI, handleArcjetDecision } from '@/lib/arcjet';
import { serverStorage, STORAGE_CONFIG } from '@/lib/appwrite';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  // 1. Arcjet protection
  const decision = await ajAI.protect(request, { requested: 2 });
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // 2. Better Auth session verification
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fileId, duration } = await request.json();

    // 3. Verify file exists in Appwrite
    const file = await serverStorage.getFile(STORAGE_CONFIG.BUCKET_ID, fileId);

    // 4. Create note record
    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        title: `Recording ${new Date().toLocaleString()}`,
        audioUrl: fileId, // Store Appwrite file ID
        duration,
        metadata: {
          fileSize: file.sizeOriginal,
          mimeType: file.mimeType,
        },
      },
    });

    // 5. Trigger transcription (async)
    // ... transcription logic

    return NextResponse.json({ noteId: note.id });
  } catch (error) {
    console.error('Audio upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

## Security Considerations

### Access Control

Appwrite storage uses role-based permissions:

- **Authenticated Users**: Can upload files to their own storage
- **Server API Key**: Has full access for management operations
- **Public Access**: Disabled by default for privacy

### File Validation

Always validate files before upload:

```typescript
function validateAudioFile(file: File): void {
  // Check file size
  if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
    throw new Error('File exceeds 100MB limit');
  }

  // Check MIME type
  if (!STORAGE_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid audio format');
  }

  // Check file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['webm', 'opus', 'ogg', 'wav', 'mp3'];
  if (!ext || !validExtensions.includes(ext)) {
    throw new Error('Invalid file extension');
  }
}
```

### Encryption

Appwrite provides:

- **Encryption at rest**: All files automatically encrypted
- **TLS in transit**: HTTPS for all API calls
- **Secure URLs**: Time-limited signed URLs for downloads

For additional encryption, use the encryption service:

```typescript
import { encryptAudio } from '@/lib/services/encryption';

// Encrypt before upload
const encryptedBlob = await encryptAudio(audioBlob, userKey);
await uploadAudioFile(encryptedBlob);
```

## GDPR Compliance

### Data Deletion

When a user requests data deletion:

```typescript
import { serverStorage, STORAGE_CONFIG } from '@/lib/appwrite';
import { prisma } from '@/lib/db';

export async function deleteUserData(userId: string): Promise<void> {
  // 1. Get all user notes
  const notes = await prisma.note.findMany({
    where: { userId },
    select: { audioUrl: true },
  });

  // 2. Delete all audio files from Appwrite
  for (const note of notes) {
    if (note.audioUrl) {
      try {
        await serverStorage.deleteFile(STORAGE_CONFIG.BUCKET_ID, note.audioUrl);
      } catch (error) {
        console.error(`Failed to delete file ${note.audioUrl}:`, error);
      }
    }
  }

  // 3. Delete database records
  await prisma.note.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  // 4. Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'USER_DATA_DELETED',
      resourceType: 'user',
      resourceId: userId,
      details: { filesDeleted: notes.length },
    },
  });
}
```

### Data Export

Include Appwrite file URLs in data export:

```typescript
export async function exportUserData(userId: string): Promise<object> {
  const notes = await prisma.note.findMany({
    where: { userId },
    include: { tags: true },
  });

  return {
    user: await prisma.user.findUnique({ where: { id: userId } }),
    notes: notes.map((note) => ({
      ...note,
      audioDownloadUrl: note.audioUrl ? getAudioFileUrl(note.audioUrl) : null,
    })),
  };
}
```

## Performance Optimization

### Chunked Uploads

For large files, use chunked uploads:

```typescript
import { clientStorage, STORAGE_CONFIG } from '@/lib/appwrite';
import { ID } from 'appwrite';

export async function uploadLargeAudioFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const fileId = ID.unique();

  try {
    const response = await clientStorage.createFile(
      STORAGE_CONFIG.BUCKET_ID,
      fileId,
      file,
      undefined, // permissions
      (progress) => {
        const percentage = (progress.chunksUploaded / progress.chunksTotal) * 100;
        onProgress?.(percentage);
      }
    );

    return response.$id;
  } catch (error) {
    console.error('Chunked upload failed:', error);
    throw error;
  }
}
```

### CDN Caching

Appwrite automatically caches files via CDN. For frequently accessed files:

```typescript
// Get file with CDN caching
const fileUrl = clientStorage.getFileView(STORAGE_CONFIG.BUCKET_ID, fileId).href;

// URL includes CDN headers for optimal caching
```

## Monitoring and Debugging

### Check Storage Usage

```typescript
import { serverStorage, STORAGE_CONFIG } from '@/lib/appwrite';

export async function getStorageStats(): Promise<object> {
  const bucket = await serverStorage.getBucket(STORAGE_CONFIG.BUCKET_ID);

  return {
    totalFiles: bucket.total,
    maxFileSize: bucket.maximumFileSize,
    enabled: bucket.enabled,
  };
}
```

### Error Handling

Common Appwrite errors:

```typescript
try {
  await clientStorage.createFile(/* ... */);
} catch (error: any) {
  if (error.code === 401) {
    // Unauthorized - user not authenticated
    console.error('User not authenticated');
  } else if (error.code === 413) {
    // File too large
    console.error('File exceeds size limit');
  } else if (error.code === 400) {
    // Invalid file type
    console.error('Invalid file type');
  } else {
    // Other errors
    console.error('Upload failed:', error.message);
  }
}
```

## Migration from S3

If migrating from S3 to Appwrite:

1. **Update environment variables** (remove S3*\*, add APPWRITE*\*)
2. **Update import statements** (`@/lib/appwrite` instead of `aws-sdk`)
3. **Update file ID references** (Appwrite uses string IDs, not URLs)
4. **Update permissions** (Appwrite uses role-based, not IAM)
5. **Test uploads and downloads** thoroughly

## Resources

- [Appwrite Storage Documentation](https://appwrite.io/docs/products/storage)
- [Appwrite Node.js SDK](https://appwrite.io/docs/sdks#server)
- [Appwrite Client SDK](https://appwrite.io/docs/sdks#client)
- [Appwrite Cloud Console](https://cloud.appwrite.io)

## Support

For Appwrite-related issues:

1. Check the [Appwrite Documentation](https://appwrite.io/docs)
2. Visit the [Appwrite Discord](https://appwrite.io/discord)
3. Review this integration guide
4. Check environment variable configuration
