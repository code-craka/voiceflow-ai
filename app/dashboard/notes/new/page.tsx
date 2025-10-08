"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AudioRecorderWithUpload } from "@/components/audio/AudioRecorderWithUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NewNotePage(): JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [audioId, setAudioId] = React.useState<string | null>(null);

  // Mock encryption key - in production, this would come from secure storage
  const encryptionKey = React.useMemo(() => {
    return "mock-encryption-key-" + session?.user?.id;
  }, [session?.user?.id]);

  const handleUploadComplete = (id: string): void => {
    setAudioId(id);
    setUploadSuccess(true);
  };

  const handleUploadError = (error: string): void => {
    console.error("Upload error:", error);
  };

  const handleViewNote = (): void => {
    if (audioId) {
      router.push(`/dashboard/notes/${audioId}`);
    }
  };

  const handleNewRecording = (): void => {
    setUploadSuccess(false);
    setAudioId(null);
  };

  if (!session?.user) {
    return <div />;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Recording</h1>
            <p className="text-muted-foreground">
              Record a voice note with AI-powered transcription
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard/notes")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to Notes
          </Button>
        </div>

        {!uploadSuccess ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Audio Recorder</CardTitle>
                <CardDescription>
                  Click "Start Recording" to begin capturing your voice note. Your
                  audio will be automatically transcribed and processed with AI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudioRecorderWithUpload
                  userId={session.user.id}
                  encryptionKey={encryptionKey}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recording Tips</CardTitle>
                <CardDescription>
                  Get the best results from your voice notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                    className="text-primary mt-0.5 flex-shrink-0"
                  >
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Use a quiet environment</p>
                    <p className="text-sm text-muted-foreground">
                      Background noise can affect transcription accuracy
                    </p>
                  </div>
                </div>
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
                    className="text-primary mt-0.5 flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Speak clearly and naturally</p>
                    <p className="text-sm text-muted-foreground">
                      Clear speech improves AI transcription quality
                    </p>
                  </div>
                </div>
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
                    className="text-primary mt-0.5 flex-shrink-0"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Organize with folders and tags</p>
                    <p className="text-sm text-muted-foreground">
                      Add notes to folders and tag them after recording
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recording Complete!</CardTitle>
              <CardDescription>
                Your voice note has been uploaded and is being processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <p className="font-medium text-green-900">Upload Successful</p>
                  <p className="text-sm text-green-700">
                    Your audio is being transcribed and processed with AI
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleViewNote} className="flex-1">
                  View Note
                </Button>
                <Button onClick={handleNewRecording} variant="outline" className="flex-1">
                  New Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
