'use client';

import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import type { AudioError } from '@/types/audio';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onError?: (error: AudioError) => void;
  maxDuration?: number;
}

export function AudioRecorder({
  onRecordingComplete,
  onError,
  maxDuration = 3600,
}: AudioRecorderProps) {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording } =
    useAudioRecorder({
      onRecordingComplete,
      onError,
      maxDuration,
    });

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-md">
      {/* Audio Level Visualization */}
      <div className="w-full h-16 bg-gray-100 rounded-lg overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-100"
          style={{ width: `${state.audioLevel * 100}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {state.isRecording ? 'Recording...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Duration Display */}
      <div className="text-3xl font-mono font-bold text-gray-800">
        {formatDuration(state.duration)}
      </div>

      {/* Recording Controls */}
      <div className="flex gap-3">
        {!state.isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors flex items-center gap-2"
            aria-label="Start recording"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <circle cx="10" cy="10" r="8" />
            </svg>
            Start Recording
          </button>
        ) : (
          <>
            {!state.isPaused ? (
              <button
                onClick={pauseRecording}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-medium transition-colors"
                aria-label="Pause recording"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={resumeRecording}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-medium transition-colors"
                aria-label="Resume recording"
              >
                Resume
              </button>
            )}
            <button
              onClick={stopRecording}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-full font-medium transition-colors flex items-center gap-2"
              aria-label="Stop recording"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <rect x="6" y="6" width="8" height="8" />
              </svg>
              Stop
            </button>
          </>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
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
              <h4 className="text-sm font-medium text-red-800">
                {state.error.message}
              </h4>
              {state.error.details && (
                <p className="mt-1 text-sm text-red-700">{state.error.details}</p>
              )}
              {state.error.retryable && (
                <button
                  onClick={startRecording}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Browser Compatibility Warning */}
      {typeof window !== 'undefined' &&
        (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && (
          <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">
                  Browser Not Supported
                </h4>
                <p className="mt-1 text-sm text-yellow-700">
                  Please use Chrome, Firefox, Safari, or Edge for audio recording.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Recording Status Indicator */}
      {state.isRecording && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span>{state.isPaused ? 'Paused' : 'Recording in progress'}</span>
        </div>
      )}
    </div>
  );
}
