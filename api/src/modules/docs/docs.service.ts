import { Injectable } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

/** Ruta base de documentación (relativa a process.cwd de la API). */
const DOCS_BASE = resolve(process.cwd(), '..', 'docs');

export interface DocsNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: DocsNode[];
}

/**
 * Servicio para listar y leer archivos de la carpeta docs.
 * Solo permite acceso dentro de la carpeta docs (protección path traversal).
 */
@Injectable()
export class DocsService {
  private sanitizePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.includes('..')) {
      throw new Error('Ruta no permitida');
    }
    return normalized;
  }

  private resolveDocsPath(relativePath: string): string {
    const safe = this.sanitizePath(relativePath);
    const full = resolve(DOCS_BASE, safe);
    const rel = relative(DOCS_BASE, full);
    if (rel.startsWith('..')) {
      throw new Error('Ruta fuera del directorio de documentación');
    }
    return full;
  }

  /**
   * Obtiene el árbol de archivos y carpetas bajo una ruta.
   */
  async getTree(relativePath = ''): Promise<DocsNode[]> {
    const fullPath = relativePath ? this.resolveDocsPath(relativePath) : DOCS_BASE;
    const entries = await readdir(fullPath, { withFileTypes: true });
    const nodes: DocsNode[] = [];
    const prefix = relativePath ? `${relativePath}/` : '';

    for (const entry of entries) {
      const name = entry.name;
      if (name.startsWith('.') || name === 'node_modules') continue;

      const path = prefix + name;
      if (entry.isDirectory()) {
        nodes.push({ name, path, type: 'dir' });
      } else if (entry.isFile() && (name.endsWith('.md') || name.endsWith('.txt'))) {
        nodes.push({ name, path, type: 'file' });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }

  /** Carpeta raíz del Manual de Usuario (solo esta se expone por defecto). */
  static readonly MANUAL_USUARIO_ROOT = '13-manual-usuario';

  /**
   * Construye el árbol completo de forma recursiva.
   * @param rootPath - Ruta raíz relativa (vacío = docs completo; '13-manual-usuario' = solo manual usuario)
   */
  async getFullTree(rootPath = DocsService.MANUAL_USUARIO_ROOT): Promise<DocsNode[]> {
    return this.buildTreeRecursive(rootPath || '');
  }

  private async buildTreeRecursive(relativePath: string): Promise<DocsNode[]> {
    const fullPath = relativePath ? this.resolveDocsPath(relativePath) : DOCS_BASE;
    const entries = await readdir(fullPath, { withFileTypes: true });
    const nodes: DocsNode[] = [];
    const prefix = relativePath ? `${relativePath}/` : '';

    for (const entry of entries) {
      const name = entry.name;
      if (name.startsWith('.') || name === 'node_modules') continue;

      const path = prefix + name;
      if (entry.isDirectory()) {
        const children = await this.buildTreeRecursive(path);
        nodes.push({ name, path, type: 'dir', children });
      } else if (entry.isFile() && (name.endsWith('.md') || name.endsWith('.txt'))) {
        nodes.push({ name, path, type: 'file' });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }

  /**
   * Busca en archivos .md y .txt.
   * @param query - Término de búsqueda
   * @param rootPath - Limitar búsqueda a esta carpeta (por defecto 13-manual-usuario)
   */
  async search(query: string, rootPath = DocsService.MANUAL_USUARIO_ROOT): Promise<Array<{ path: string; snippets: string[] }>> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const q = query.trim().toLowerCase();
    const results: Array<{ path: string; snippets: string[] }> = [];
    await this.searchInDir(rootPath || '', q, results);
    return results;
  }

  private async searchInDir(
    relativePath: string,
    query: string,
    results: Array<{ path: string; snippets: string[] }>,
  ): Promise<void> {
    const fullPath = relativePath ? this.resolveDocsPath(relativePath) : DOCS_BASE;
    const entries = await readdir(fullPath, { withFileTypes: true });
    const prefix = relativePath ? `${relativePath}/` : '';

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await this.searchInDir(prefix + entry.name, query, results);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
        const filePath = prefix + entry.name;
        const content = await this.getFileContent(filePath);
        const snippets = this.extractSnippets(content, query);
        if (snippets.length > 0) {
          results.push({ path: filePath, snippets });
        }
      }
    }
  }

  private extractSnippets(content: string, query: string): string[] {
    const lower = content.toLowerCase();
    const snippets: string[] = [];
    let pos = 0;
    const snippetLen = 120;
    const maxSnippets = 3;

    while (snippets.length < maxSnippets) {
      const idx = lower.indexOf(query, pos);
      if (idx === -1) break;
      const start = Math.max(0, idx - 40);
      const end = Math.min(content.length, idx + query.length + 80);
      let snip = content.slice(start, end).trim();
      if (snip.length > snippetLen) {
        snip = (start > 0 ? '…' : '') + snip.slice(0, snippetLen) + '…';
      }
      if (!snippets.includes(snip)) snippets.push(snip);
      pos = idx + 1;
    }
    return snippets;
  }

  /**
   * Obtiene el contenido de un archivo (solo .md y .txt).
   */
  async getFileContent(relativePath: string): Promise<string> {
    const ext = relativePath.split('.').pop()?.toLowerCase();
    if (ext !== 'md' && ext !== 'txt') {
      throw new Error('Solo se permiten archivos .md y .txt');
    }
    const fullPath = this.resolveDocsPath(relativePath);
    const content = await readFile(fullPath, 'utf-8');
    return content;
  }
}
