# Audio Recording Components

This directory contains components for browser-based audio recording with encryption and upload capabilities.

## Components

### AudioRecorder

A standalone audio recording component with real-time visualization and controls.

**Features:**
- MediaRecorder API with Opus codec at 64 kbps
- Real-time audio level visualization
- Recording duration display
- Pause/resume functionality
- Browser compatibility checks
- Microphone permission handling
- Error handling with user-friendly messages

**Usage:**
```tsx
import { AudioRecorder } from '@/components/audio/AudioRecorder';

function MyComponent() {
  const handleComplete = (audioBlob: Blob, duration: number) => {
    console.log('Recording complete:', { duration, size: audioBlob.size });
  };

  const handleError = (error: AudioError) => {
    console.error('Recording error:', error);
  };

  return (
    <AudioRecorder
      onRecordingComplete={handleComplete}
      onError={handleError}
      maxDuration={3600} // 1 hour
    />
  );
}
```

### AudioRecorderWithUpload

An integrated component that combines recording with automatic upload and encryption.

**Features:**
- All AudioRecorder features
- Automatic upload after recording
- Progress tracking
- Retry logic with exponential backoff
- AES-256-GCM encryption
- Error handling

**Usage:**
```tsx
import { AudioRecorderWithUpload } from '@/components/audio/AudioRecorderWithUpload';

function MyComponent() {
  const handleUploadComplete = (audioId: string) => {
    console.log('Upload complete:', audioId);
    // Navigate to note or show success message
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  return (
    <AudioRecorderWithUpload
      userId="user-123"
      encryptionKey="base64-encoded-key"
      folderId="folder-456" // optional
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
    />
  );
}
```

## Hooks

### useAudioRecorder

A custom hook that provides audio recording functionality.

**Usage:**
```tsx
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

function MyComponent() {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording } =
    useAudioRecorder({
      onRecordingComplete: (blob, duration) => {
        console.log('Recording complete');
      },
      onError: (error) => {
        console.error('Error:', error);
      },
      maxDuration: 3600,
    });

  return (
    <div>
      <p>Duration: {state.duration}s</p>
      <p>Audio Level: {state.audioLevel}</p>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
    </div>
  );
}
```

## Services

### Audio Service (Server-side)

Located at `src/lib/services/audio.ts`

**Functions:**
- `validateAudioFile()` - Validate audio format and size
- `encryptAudio()` - Encrypt audio with AES-256-GCM
- `uploadAudio()` - Upload and store encrypted audio

### Audio Client Service (Client-side)

Located at `src/lib/services/audioClient.ts`

**Functions:**
- `uploadAudioFile()` - Upload audio to API with progress tracking
- `uploadWithRetry()` - Upload with automatic retry logic

## API Endpoints

### POST /api/audio/upload

Upload and encrypt audio files.

**Request:**
- `audio` (File) - Audio file
- `userId` (string) - User ID
- `encryptionKey` (string) - User's encryption key
- `duration` (number) - Recording duration in seconds
- `title` (string, optional) - Note title
- `folderId` (string, optional) - Folder ID

**Response:**
```json
{
  "success": true,
  "data": {
    "audioId": "note-id",
    "encryptedUrl": "/api/audio/note-id",
    "duration": 120,
    "format": {
      "mimeType": "audio/webm;codecs=opus",
      "codec": "opus",
      "bitrate": 64000,
      "sampleRate": 48000
    }
  }
}
```

## Browser Compatibility

- Chrome 49+
- Firefox 25+
- Safari 14.1+
- Edge 79+

**Required APIs:**
- MediaRecorder API
- Web Audio API
- getUserMedia API
- Opus codec support

## Security

All audio files are:
1. Encrypted with AES-256-GCM before upload
2. Protected by Arcjet security (rate limiting, bot detection)
3. Validated for format and size
4. Stored with user-controlled encryption keys

## Error Handling

The components handle various error scenarios:
- Permission denied
- Browser incompatibility
- Device not found
- Recording failures
- Upload failures
- Network errors

All errors include:
- Error code
- User-friendly message
- Technical details
- Retry indicator
