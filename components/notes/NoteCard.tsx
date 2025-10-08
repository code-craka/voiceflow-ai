"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Note } from "@/types/notes";

interface NoteCardProps {
  note: Note;
  onDelete?: (noteId: string) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps): JSX.Element {
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = () => {
    const status = note.metadata?.processingStatus || "pending";
    const statusConfig = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      transcribing: { label: "Transcribing", className: "bg-blue-100 text-blue-800" },
      processing_ai: { label: "Processing", className: "bg-purple-100 text-purple-800" },
      completed: { label: "Completed", className: "bg-green-100 text-green-800" },
      failed: { label: "Failed", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">
              <Link href={`/dashboard/notes/${note.id}`} className="hover:underline">
                {note.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{formatDate(note.createdAt)}</span>
              {note.duration && (
                <>
                  <span>•</span>
                  <span>{formatDuration(note.duration)}</span>
                </>
              )}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {note.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {note.summary}
          </p>
        )}
        {note.transcription && !note.summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {note.transcription}
          </p>
        )}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-secondary text-secondary-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/notes/${note.id}`}>
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
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View
            </Link>
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(note.id)}
              className="text-destructive hover:text-destructive"
            >
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
