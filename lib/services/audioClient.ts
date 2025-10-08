/**
 * Client-side Audio Upload Service
 * Handles audio upload from browser to API
 */

import type { AudioUploadResult } from '@/types/audio';

export interface UploadAudioOptions {
  audioBlob: Blob;
  userId: string;
  encryptionKey: string;
  duration: number;
  title?: string;
  folderId?: string;
  onProgress?: (progress: number) => void;
}

export interface UploadAudioResponse {
  success: boolean;
  data?: AudioUploadResult;
  error?: {
    code: string;
    message: string;
    details?: string;
    retryable: boolean;
  };
}

/**
 * Upload audio file to the server
 */
export async function uploadAudioFile(
  options: UploadAudioOptions
): Promise<UploadAudioResponse> {
  const {
    audioBlob,
    userId,
    encryptionKey,
    duration,
    title,
    folderId,
    onProgress,
  } = options;

  try {
    // Create form data
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('userId', userId);
    formData.append('encryptionKey', encryptionKey);
    formData.append('duration', duration.toString());
    
    if (title) {
      formData.append('title', title);
    }
    
    if (folderId) {
      formData.append('folderId', folderId);
    }

    // Upload with progress tracking
    const xhr = new XMLHttpRequest();

    const uploadPromise = new Promise<UploadAudioResponse>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            resolve(errorResponse);
          } catch (error) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', '/api/audio/upload');
      xhr.send(formData);
    });

    return await uploadPromise;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to upload audio file',
        details: (error as Error).message,
        retryable: true,
      },
    };
  }
}

/**
 * Retry upload with exponential backoff
 */
export async function uploadWithRetry(
  options: UploadAudioOptions,
  maxRetries: number = 3
): Promise<UploadAudioResponse> {
  let lastError: UploadAudioResponse | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await uploadAudioFile(options);
      
      if (response.success) {
        return response;
      }
      
      // If error is not retryable, return immediately
      if (response.error && !response.error.retryable) {
        return response;
      }
      
      lastError = response;
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload audio file',
          details: (error as Error).message,
          retryable: true,
        },
      };
    }
  }
  
  return lastError || {
    success: false,
    error: {
      code: 'MAX_RETRIES_EXCEEDED',
      message: 'Maximum upload retries exceeded',
      retryable: false,
    },
  };
}
