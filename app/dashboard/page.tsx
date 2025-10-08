"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage(): JSX.Element {
  const router = useRouter();

  const handleSearch = (query: string): void => {
    router.push(`/dashboard/notes?search=${encodeURIComponent(query)}`);
  };

  const handleNewNote = (): void => {
    router.push("/dashboard/notes/new");
  };

  return (
    <DashboardLayout onSearch={handleSearch}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to VoiceFlow AI - Your AI-powered voice note assistant
            </p>
          </div>
          <Button onClick={handleNewNote} size="lg">
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
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            New Recording
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>
                Record your first voice note
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleNewNote} className="w-full">
                Start Recording
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Notes</CardTitle>
              <CardDescription>
                View your latest recordings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/notes")}
              >
                View All Notes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organize</CardTitle>
              <CardDescription>
                Manage folders and tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/dashboard/folders")}
              >
                Manage Folders
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Learn how to make the most of VoiceFlow AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </div>
              <div>
                <h3 className="font-medium">Record Your Voice</h3>
                <p className="text-sm text-muted-foreground">
                  Click "New Recording" to start capturing your thoughts with high-quality audio
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </div>
              <div>
                <h3 className="font-medium">AI Transcription</h3>
                <p className="text-sm text-muted-foreground">
                  Your audio is automatically transcribed with 90%+ accuracy using advanced AI
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </div>
              <div>
                <h3 className="font-medium">Smart Summaries</h3>
                <p className="text-sm text-muted-foreground">
                  Get AI-generated summaries, key points, and action items from your notes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                4
              </div>
              <div>
                <h3 className="font-medium">Organize & Search</h3>
                <p className="text-sm text-muted-foreground">
                  Use folders and tags to organize, then search across all your transcriptions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
