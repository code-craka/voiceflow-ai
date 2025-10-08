"use client";

import { useState } from "react";
import { AudioRecorder } from "./AudioRecorder";
import { uploadWithRetry } from "@/lib/services/audioClient";
import type { AudioError } from "@/types/audio";

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
}: AudioRecorderWithUploadProps): JSX.Element {
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
        ...(folderId && { folderId }),
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
        <div className="p-4 bg-primary/10 border border-primary rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Uploading audio...
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(uploadProgress)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && !isUploading && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-destructive">Upload Failed</h4>
              <p className="mt-1 text-sm text-muted-foreground">{uploadError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
