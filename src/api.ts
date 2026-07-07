import { request } from "./httpClient";

export interface NoteSummary {
  _id: string;
  name: string;
  slug: string;
  visibility: "public" | "private";
}

export interface CollectionSummary {
  _id: string;
  name: string;
  slug: string;
  visibility: "public" | "private";
  notes: NoteSummary[];
}

export interface NoteAuthor {
  _id: string;
  fullName?: string;
  userName?: string;
  avatar?: string;
  role?: string;
}

export interface NoteDetail {
  _id: string;
  name: string;
  slug: string;
  visibility: "public" | "private";
  content: string;
  createdAt?: string;
  updatedAt?: string;
  contentUpdatedAt?: string;
}

export interface NoteSearchResult {
  _id: string;
  name: string;
  collectionId: { name: string; slug: string };
  userId: { _id: string; fullName: string; userName: string; avatar: string; role: string };
  slug: string;
}

export interface NoteSearchResponse {
  notes: NoteSearchResult[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  meta: { query: string; tokensMatched: number };
}

export async function fetchCollections(
  apiBaseUrl: string,
  userId: string,
  authHeader: Record<string, string>,
): Promise<CollectionSummary[]> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/collection/all-collections?userId=${encodeURIComponent(
    userId,
  )}`;
  const result = await request<{ collections: CollectionSummary[] }>(url, {
    headers: authHeader,
  });
  return result.json.collections ?? [];
}

export async function fetchNote(
  apiBaseUrl: string,
  username: string,
  collectionSlug: string,
  noteSlug: string,
  authHeader: Record<string, string>,
): Promise<{ note: NoteDetail; author: NoteAuthor }> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/note/${encodeURIComponent(
    username,
  )}/${encodeURIComponent(collectionSlug)}/${encodeURIComponent(noteSlug)}`;
  const result = await request<{ note: NoteDetail; author: NoteAuthor }>(url, {
    headers: authHeader,
  });
  return result.json;
}

export async function searchNotes(
  apiBaseUrl: string,
  query: string,
  page = 1,
  limit = 10,
): Promise<NoteSearchResponse> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/note/search?q=${encodeURIComponent(
    query,
  )}&page=${page}&limit=${limit}`;
  const result = await request<NoteSearchResponse>(url);
  return result.json;
}