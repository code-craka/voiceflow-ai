"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NotesList } from "@/components/notes/NotesList";
import { Button } from "@/components/ui/button";
import type { Note } from "@/types/notes";

export default function NotesPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search");
  
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchNotes = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        
        const url = searchQuery
          ? `/api/search?query=${encodeURIComponent(searchQuery)}`
          : "/api/notes";
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch notes");
        }
        
        const data = await response.json();
        setNotes(data.data || []);
      } catch (err) {
        console.error("Error fetching notes:", err);
        setError(err instanceof Error ? err.message : "Failed to load notes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [searchQuery]);

  const handleDelete = async (noteId: string): Promise<void> => {
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

      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (err) {
      console.error("Error deleting note:", err);
      alert("Failed to delete note. Please try again.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
            <p className="text-muted-foreground">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : "All your voice notes"}
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/notes/new")}>
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
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            New Recording
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <NotesList notes={notes} onDelete={handleDelete} isLoading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
