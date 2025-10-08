import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioRecorderState, AudioError, AudioErrorCode } from '@/types/audio';

interface UseAudioRecorderOptions {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  onError?: (error: AudioError) => void;
  maxDuration?: number; // in seconds
}

export function useAudioRecorder({
  onRecordingComplete,
  onError,
  maxDuration = 3600, // 1 hour default
}: UseAudioRecorderOptions = {}) {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check browser compatibility
  const checkBrowserSupport = useCallback((): AudioError | null => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        code: 'BROWSER_INCOMPATIBLE' as AudioErrorCode,
        message: 'Your browser does not support audio recording',
        details: 'Please use Chrome, Firefox, Safari, or Edge',
        retryable: false,
      };
    }

    // Check for Opus codec support
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/webm',
    ];

    const supportedType = mimeTypes.find((type) =>
      MediaRecorder.isTypeSupported(type)
    );

    if (!supportedType) {
      return {
        code: 'NOT_SUPPORTED' as AudioErrorCode,
        message: 'Required audio codec not supported',
        details: 'Opus codec is required for recording',
        retryable: false,
      };
    }

    return null;
  }, []);

  // Update audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);

    setState((prev) => ({ ...prev, audioLevel: normalizedLevel }));

    if (state.isRecording && !state.isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [state.isRecording, state.isPaused]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Check browser support
      const supportError = checkBrowserSupport();
      if (supportError) {
        setState((prev) => ({ ...prev, error: supportError }));
        onError?.(supportError);
        return;
      }

      // Request microphone access with echo cancellation and noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });

      streamRef.current = stream;

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Determine best supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/webm',
      ];
      const mimeType = mimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      ) || 'audio/webm';

      // Create MediaRecorder with Opus codec at 64 kbps
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        onRecordingComplete?.(audioBlob, duration);
        cleanup();
      };

      mediaRecorder.onerror = (event) => {
        const error: AudioError = {
          code: 'RECORDING_FAILED' as AudioErrorCode,
          message: 'Recording failed',
          details: event.toString(),
          retryable: true,
        };
        setState((prev) => ({ ...prev, error, isRecording: false }));
        onError?.(error);
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
        error: null,
      });

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState((prev) => ({ ...prev, duration: elapsed }));

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

      // Start audio level visualization
      updateAudioLevel();
    } catch (error) {
      const audioError: AudioError = {
        code: (error as Error).name === 'NotAllowedError' 
          ? ('PERMISSION_DENIED' as AudioErrorCode)
          : ('DEVICE_NOT_FOUND' as AudioErrorCode),
        message: (error as Error).name === 'NotAllowedError'
          ? 'Microphone access denied'
          : 'Microphone not found',
        details: (error as Error).message,
        retryable: true,
      };
      setState((prev) => ({ ...prev, error: audioError }));
      onError?.(audioError);
    }
  }, [checkBrowserSupport, maxDuration, onError, onRecordingComplete, updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isRecording: false, isPaused: false }));
    }
  }, [state.isRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [state.isRecording, state.isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
      updateAudioLevel();
    }
  }, [state.isRecording, state.isPaused, updateAudioLevel]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
