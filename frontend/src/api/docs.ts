import { httpFetch } from '../interceptors/httpInterceptor';

export interface DocsNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: DocsNode[];
}

export interface DocsTreeResponse {
  success: boolean;
  data: DocsNode[];
}

export interface DocsFileResponse {
  success: boolean;
  data: { content: string; path: string };
}

export async function fetchDocsTree(path?: string): Promise<DocsNode[]> {
  const url = path ? `/docs/tree?path=${encodeURIComponent(path)}` : '/docs/tree';
  const res = await httpFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Error al cargar la estructura de documentación');
  }
  const json: DocsTreeResponse = await res.json();
  return json.data;
}

export interface DocsSearchResult {
  path: string;
  snippets: string[];
}

export interface DocsSearchResponse {
  success: boolean;
  data: DocsSearchResult[];
}

/** Si root es null, el backend devuelve todo docs/. */
export async function fetchDocsFullTree(root: string | null = null): Promise<DocsNode[]> {
  const url = root ? `/docs/tree/full?root=${encodeURIComponent(root)}` : '/docs/tree/full';
  const res = await httpFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Error al cargar la estructura');
  }
  const json: DocsTreeResponse = await res.json();
  return json.data;
}

export async function fetchDocsSearch(q: string, root: string | null = null): Promise<DocsSearchResult[]> {
  if (!q || q.trim().length < 2) return [];
  const base = `/docs/search?q=${encodeURIComponent(q.trim())}`;
  const url = root ? `${base}&root=${encodeURIComponent(root)}` : base;
  const res = await httpFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Error en la búsqueda');
  }
  const json: DocsSearchResponse = await res.json();
  return json.data;
}

export async function fetchDocsFile(path: string): Promise<{ content: string; path: string }> {
  const res = await httpFetch(`/docs/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Error al cargar el archivo');
  }
  const json: DocsFileResponse = await res.json();
  return json.data;
}
