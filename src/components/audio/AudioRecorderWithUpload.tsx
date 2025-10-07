'use client';

import { useState } from 'react';
import { AudioRecorder } from './AudioRecorder';
import { uploadWithRetry } from '@/lib/services/audioClient';
import type { AudioError } from '@/types/audio';

interface AudioRecorderWithUploadProps {
  userId: string;
  encryptionKey: string;
  folderId?: string;
  onUploadComplete?: (audioId: string) => void;
  onUploadError?: (error: string) => void;
}

export function AudioRecorderWithUpload({
  userId,
  encryptionKey,
  folderId,
  onUploadComplete,
  onUploadError,
}: AudioRecorderWithUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleRecordingComplete = async (audioBlob: Blob, duration: number) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const response = await uploadWithRetry({
        audioBlob,
        userId,
        encryptionKey,
        duration,
        folderId,
        title: `Voice Note ${new Date().toLocaleString()}`,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      if (response.success && response.data) {
        onUploadComplete?.(response.data.audioId);
      } else if (response.error) {
        const errorMessage = response.error.message;
        setUploadError(errorMessage);
        onUploadError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Failed to upload audio file';
      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRecordingError = (error: AudioError) => {
    console.error('Recording error:', error);
    setUploadError(error.message);
  };

  return (
    <div className="space-y-4">
      <AudioRecorder
        onRecordingComplete={handleRecordingComplete}
        onError={handleRecordingError}
        maxDuration={3600}
      />

      {/* Upload Progress */}
      {isUploading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              Uploading audio...
            </span>
            <span className="text-sm text-blue-600">
              {Math.round(uploadProgress)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && !isUploading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Upload Failed</h4>
              <p className="mt-1 text-sm text-red-700">{uploadError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
