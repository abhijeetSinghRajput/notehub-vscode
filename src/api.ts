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
