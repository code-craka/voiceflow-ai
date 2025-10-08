"use client";

import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Button } from "@/components/ui/button";
import type { AudioError } from "@/types/audio";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onError?: (error: AudioError) => void;
  maxDuration?: number;
}

export function AudioRecorder({
  onRecordingComplete,
  onError,
  maxDuration = 3600,
}: AudioRecorderProps): JSX.Element {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording } =
    useAudioRecorder({
      onRecordingComplete,
      ...(onError && { onError }),
      maxDuration,
    });

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Audio Level Visualization */}
      <div className="w-full h-20 bg-muted rounded-lg overflow-hidden relative border">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-100"
          style={{ width: `${state.audioLevel * 100}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium">
            {state.isRecording ? "Recording..." : "Ready"}
          </span>
        </div>
      </div>

      {/* Duration Display */}
      <div className="text-4xl font-mono font-bold">
        {formatDuration(state.duration)}
      </div>

      {/* Recording Controls */}
      <div className="flex gap-3">
        {!state.isRecording ? (
          <Button
            onClick={startRecording}
            size="lg"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
            Start Recording
          </Button>
        ) : (
          <>
            {!state.isPaused ? (
              <Button
                onClick={pauseRecording}
                size="lg"
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </Button>
            ) : (
              <Button
                onClick={resumeRecording}
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Resume
              </Button>
            )}
            <Button
              onClick={stopRecording}
              size="lg"
              variant="destructive"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="w-full p-4 bg-destructive/10 border border-destructive rounded-lg">
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
              <h4 className="text-sm font-medium text-destructive">
                {state.error.message}
              </h4>
              {state.error.details && (
                <p className="mt-1 text-sm text-muted-foreground">{state.error.details}</p>
              )}
              {state.error.retryable && (
                <Button
                  onClick={startRecording}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Browser Compatibility Warning */}
      {typeof window !== "undefined" &&
        (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) && (
          <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                className="text-yellow-600 flex-shrink-0 mt-0.5"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" x2="12" y1="9" y2="13" />
                <line x1="12" x2="12.01" y1="17" y2="17" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900">
                  Browser Not Supported
                </h4>
                <p className="mt-1 text-sm text-yellow-800">
                  Please use Chrome, Firefox, Safari, or Edge for audio recording.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Recording Status Indicator */}
      {state.isRecording && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span>{state.isPaused ? "Paused" : "Recording in progress"}</span>
        </div>
      )}
    </div>
  );
}
