// Audio-related type definitions

export interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onError: (error: AudioError) => void;
  maxDuration?: number; // in seconds
}

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: AudioError | null;
}

export interface AudioError {
  code: AudioErrorCode;
  message: string;
  details?: string;
  retryable: boolean;
}

export enum AudioErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  RECORDING_FAILED = 'RECORDING_FAILED',
  BROWSER_INCOMPATIBLE = 'BROWSER_INCOMPATIBLE',
}

export interface AudioFormat {
  mimeType: string;
  codec: string;
  bitrate: number;
  sampleRate: number;
}

export interface AudioUploadResult {
  audioId: string;
  encryptedUrl: string;
  duration: number;
  format: AudioFormat;
}

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  format?: AudioFormat;
}
