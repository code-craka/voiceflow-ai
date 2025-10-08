"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Note } from "@/types/notes";

export default function NoteDetailPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const noteId = params?.id as string;

  const [note, setNote] = React.useState<Note | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState("");

  React.useEffect(() => {
    const fetchNote = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/notes/${noteId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch note");
        }

        const data = await response.json();
        setNote(data.data);
        setEditedTitle(data.data.title);
      } catch (err) {
        console.error("Error fetching note:", err);
        setError(err instanceof Error ? err.message : "Failed to load note");
      } finally {
        setIsLoading(false);
      }
    };

    if (noteId) {
      fetchNote();
    }
  }, [noteId]);

  const handleSaveTitle = async (): Promise<void> => {
    if (!note) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: editedTitle }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const data = await response.json();
      setNote(data.data);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating note:", err);
      alert("Failed to update note. Please try again.");
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      router.push("/dashboard/notes");
    } catch (err) {
      console.error("Error deleting note:", err);
      alert("Failed to delete note. Please try again.");
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading note...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !note) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
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
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error || "Note not found"}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
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
          <Button variant="destructive" onClick={handleDelete}>
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
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete Note
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <div className="flex gap-2">
                    <Input
                      id="title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSaveTitle}>Save</Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-2xl">{note.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Edit
                  </Button>
                </div>
              )}
              <CardDescription className="flex items-center gap-2">
                <span>{formatDate(note.createdAt)}</span>
                {note.duration && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(note.duration)}</span>
                  </>
                )}
                {note.metadata?.processingStatus && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{note.metadata.processingStatus}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {note.summary && (
          <Card>
            <CardHeader>
              <CardTitle>AI Summary</CardTitle>
              <CardDescription>
                Generated summary and key insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{note.summary}</p>
            </CardContent>
          </Card>
        )}

        {note.transcription && (
          <Card>
            <CardHeader>
              <CardTitle>Transcription</CardTitle>
              <CardDescription>
                {note.metadata?.transcriptionProvider && (
                  <>Transcribed with {note.metadata.transcriptionProvider}</>
                )}
                {note.metadata?.transcriptionConfidence && (
                  <> • {Math.round(note.metadata.transcriptionConfidence * 100)}% confidence</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {note.transcription}
              </p>
            </CardContent>
          </Card>
        )}

        {note.tags && note.tags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-secondary text-secondary-foreground"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {note.metadata?.errorMessage && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Processing Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {note.metadata.errorMessage}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
