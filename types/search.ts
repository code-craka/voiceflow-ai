import type { Note } from "./notes";

export interface SearchFilters {
  folderId?: string;
  tagIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  note: Note;
  rank: number;
  snippet?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  responseTime: number;
}
