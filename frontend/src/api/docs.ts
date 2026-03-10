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

/** Carpeta del Manual del Usuario (solo esta se muestra). */
const MANUAL_USUARIO_ROOT = '13-manual-usuario';

export async function fetchDocsFullTree(root = MANUAL_USUARIO_ROOT): Promise<DocsNode[]> {
  const res = await httpFetch(`/docs/tree/full?root=${encodeURIComponent(root)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Error al cargar la estructura');
  }
  const json: DocsTreeResponse = await res.json();
  return json.data;
}

export async function fetchDocsSearch(q: string, root = MANUAL_USUARIO_ROOT): Promise<DocsSearchResult[]> {
  if (!q || q.trim().length < 2) return [];
  const res = await httpFetch(`/docs/search?q=${encodeURIComponent(q.trim())}&root=${encodeURIComponent(root)}`);
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
