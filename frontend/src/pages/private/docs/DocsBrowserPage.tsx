import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import { Col, Input, Row, Spin, Tree, Typography } from 'antd';

const { Search } = Input;
import type { DataNode } from 'antd/es/tree';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchDocsFile,
  fetchDocsFullTree,
  fetchDocsSearch,
  type DocsNode,
  type DocsSearchResult,
} from '../../../api/docs';

import ReactMarkdown from 'react-markdown';

import styles from './DocsBrowserPage.module.css';

/** Parsea tablas GFM (|col1|col2|) sin dependencia remark-gfm. */
function preprocessTables(md: string): Array<{ type: 'md' | 'table'; content: string; rows?: string[][] }> {
  const parts: Array<{ type: 'md' | 'table'; content: string; rows?: string[][] }> = [];
  const normalized = md.replace(/\r\n|\r/g, '\n');
  const lines = normalized.split('\n');
  let i = 0;
  let mdBuffer = '';

  const isTableRow = (s: string) => /^\|.+\|$/.test(s.trim()) && s.trim().length > 2;
  const isSeparatorRow = (s: string) => /^\s*\|[\s\-:|]+\|?\s*$/.test(s.trim()) && s.includes('-');

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];

    if (isTableRow(line) && next && isSeparatorRow(next)) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim());
      const rows: string[][] = [header];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
        if (cells.some(Boolean)) rows.push(cells);
        i++;
      }
      if (mdBuffer) {
        parts.push({ type: 'md', content: mdBuffer.trimEnd() });
        mdBuffer = '';
      }
      parts.push({ type: 'table', content: '', rows });
      continue;
    }
    mdBuffer += line + '\n';
    i++;
  }
  if (mdBuffer) parts.push({ type: 'md', content: mdBuffer.trimEnd() });
  return parts;
}

const { Title, Text } = Typography;

const MANUAL_USUARIO_ROOT = '13-manual-usuario';
const GUIA_RAPIDA_PATH = `${MANUAL_USUARIO_ROOT}/00-GUIA-RAPIDA-USUARIO.md`;

function resolveDocPath(href: string, currentPath: string | null): string | null {
  if (!href || !href.toLowerCase().endsWith('.md')) return null;
  const baseDir = currentPath ? currentPath.replace(/\/[^/]+$/, '') || '' : MANUAL_USUARIO_ROOT;
  const base = baseDir ? baseDir + '/' : '';
  if (href.startsWith('./')) return base + href.slice(2);
  if (href.startsWith('../')) {
    const parts = base.replace(/\/$/, '').split('/').filter(Boolean);
    let up = href;
    while (up.startsWith('../')) {
      parts.pop();
      up = up.slice(3);
    }
    return (parts.length ? parts.join('/') + '/' : '') + up;
  }
  if (!href.includes('/')) return base + href;
  return href;
}

function nodeToTreeData(nodes: DocsNode[]): DataNode[] {
  return nodes.map((n) => ({
    key: n.path,
    title: (
      <span className={styles.treeTitle}>
        {n.type === 'dir' ? (
          <FolderOutlined className={styles.treeIconDir} />
        ) : (
          <FileTextOutlined className={styles.treeIconFile} />
        )}
        {n.name}
      </span>
    ),
    isLeaf: n.type === 'file',
    children: n.children && n.children.length > 0 ? nodeToTreeData(n.children) : undefined,
  }));
}

const WELCOME_CONTENT = `# Manual del Usuario - Guía KPITAL 360

Bienvenido a la guía del usuario. Aquí encontrarás las instrucciones de operación para usar el sistema.

## Cómo usar

1. **Buscar**: Usa el buscador superior para encontrar temas (ej: "crear empleado", "planilla", "vacaciones"). Los resultados indicarán en qué documento está la información.
2. **Navegar**: Usa la tabla de contenidos a la izquierda para explorar los documentos del manual.
3. **Leer**: Selecciona un documento para ver su contenido en el panel principal.
`;

export function DocsBrowserPage() {
  const [tree, setTree] = useState<DocsNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(GUIA_RAPIDA_PATH);
  const [content, setContent] = useState<string>(WELCOME_CONTENT);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocsSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const loadFullTree = useCallback(async () => {
    setTreeLoading(true);
    setError(null);
    try {
      const data = await fetchDocsFullTree();
      setTree(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar la documentación');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const loadFile = useCallback(async (path: string) => {
    setContentLoading(true);
    setError(null);
    try {
      const { content: c } = await fetchDocsFile(path);
      setContent(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el archivo');
      setContent('');
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFullTree();
  }, [loadFullTree]);

  useEffect(() => {
    if (selectedPath) {
      loadFile(selectedPath);
    } else {
      setContent(WELCOME_CONTENT);
    }
  }, [selectedPath, loadFile]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const results = await fetchDocsSearch(q);
      setSearchResults(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en la búsqueda');
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleOpenDoc = (path: string) => {
    setSelectedPath(path);
    setSearchResults(null);
  };

  const treeData = useMemo(() => nodeToTreeData(tree), [tree]);

  const onSelect = (_: React.Key[], info: { node: DataNode }) => {
    const node = info.node;
    if (node.key && typeof node.key === 'string' && node.isLeaf) {
      setSelectedPath(node.key);
    }
  };

  return (
    <div className={styles.helpCenter}>
      <div className={styles.searchBar}>
        <Search
          placeholder='Buscar en el manual (ej: crear empleado, planilla, vacaciones...)'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSearch={handleSearch}
          allowClear
          size="large"
          enterButton="Buscar"
          className={styles.searchInput}
          loading={searching}
        />
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {searchResults !== null && (
        <div className={styles.searchResults}>
          <Title level={5} style={{ margin: '0 0 12px 0' }}>
            Resultados para &quot;{searchQuery}&quot;
          </Title>
          {searching ? (
            <Spin />
          ) : searchResults.length === 0 ? (
            <Text type="secondary">No se encontraron documentos con ese término.</Text>
          ) : (
            <div className={styles.searchList}>
              {searchResults.map((r) => (
                <div key={r.path} className={styles.searchItem}>
                  <button
                    type="button"
                    className={styles.searchItemLink}
                    onClick={() => handleOpenDoc(r.path)}
                  >
                    <FileTextOutlined /> {r.path}
                  </button>
                  <div className={styles.searchSnippets}>
                    {r.snippets.map((s, i) => (
                      <p key={i} className={styles.snippet}>
                        {s}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Row gutter={0} className={styles.mainRow}>
        <Col xs={24} md={8} lg={6} className={styles.tocCol}>
          <aside className={styles.toc}>
            <div className={styles.tocHeader}>
              <Title level={5} className={styles.tocTitle}>
                Tabla de contenidos
              </Title>
            </div>
            <div className={styles.tocScroll}>
              {treeLoading ? (
                <div className={styles.spin}>
                  <Spin tip="Cargando..." />
                </div>
              ) : (
                <Tree
                showLine
                blockNode
                treeData={treeData}
                onSelect={onSelect}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                selectedKeys={selectedPath ? [selectedPath] : []}
                />
              )}
            </div>
          </aside>
        </Col>
        <Col xs={24} md={16} lg={18} className={styles.contentCol}>
          <div className={styles.contentScroll}>
            <main className={styles.content}>
            {selectedPath && contentLoading ? (
              <div className={styles.spin}>
                <Spin tip="Cargando documento..." />
              </div>
            ) : (
              <article className={styles.article}>
                {preprocessTables(content).map((seg, idx) =>
                  seg.type === 'table' && seg.rows && seg.rows.length > 0 ? (
                    <div key={idx} className={styles.tableWrapper}>
                      <table className={styles.mdTable}>
                        <thead>
                          <tr>
                            {seg.rows[0].map((cell, c) => (
                              <th key={c} className={styles.mdTh}>
                                {cell.includes('`')
                                  ? cell.split(/(`[^`]+`)/g).map((part, i) =>
                                      part.startsWith('`') && part.endsWith('`') ? (
                                        <code key={i} className={styles.mdCode}>
                                          {part.slice(1, -1)}
                                        </code>
                                      ) : (
                                        part
                                      ),
                                    )
                                  : cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {seg.rows.slice(1).map((row, r) => (
                            <tr key={r}>
                              {row.map((cell, c) => (
                                <td key={c} className={styles.mdTd}>
                                  {cell.includes('`')
                                    ? cell.split(/(`[^`]+`)/g).map((part, i) =>
                                        part.startsWith('`') && part.endsWith('`') ? (
                                          <code key={i} className={styles.mdCode}>
                                            {part.slice(1, -1)}
                                          </code>
                                        ) : (
                                          part
                                        ),
                                      )
                                    : cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ReactMarkdown
                      key={idx}
                      components={{
                    a: ({ href, children }) => {
                      const resolved = href ? resolveDocPath(href, selectedPath) : null;
                      if (resolved) {
                        return (
                          <button
                            type="button"
                            className={styles.mdLink}
                            onClick={() => setSelectedPath(resolved)}
                          >
                            {children}
                          </button>
                        );
                      }
                      return (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      );
                    },
                    h1: ({ children }) => <h1 className={styles.mdH1}>{children}</h1>,
                    h2: ({ children }) => <h2 className={styles.mdH2}>{children}</h2>,
                    h3: ({ children }) => <h3 className={styles.mdH3}>{children}</h3>,
                    p: ({ children }) => <p className={styles.mdP}>{children}</p>,
                    ul: ({ children }) => <ul className={styles.mdUl}>{children}</ul>,
                    ol: ({ children }) => <ol className={styles.mdOl}>{children}</ol>,
                    table: ({ children }) => (
                      <div className={styles.tableWrapper}>
                        <table className={styles.mdTable}>{children}</table>
                      </div>
                    ),
                    th: ({ children }) => <th className={styles.mdTh}>{children}</th>,
                    td: ({ children }) => <td className={styles.mdTd}>{children}</td>,
                    code: ({ children }) => <code className={styles.mdCode}>{children}</code>,
                    pre: ({ children }) => <pre className={styles.mdPre}>{children}</pre>,
                  }}
                >
                  {seg.content}
                </ReactMarkdown>
                  ),
                )}
              </article>
            )}
            </main>
          </div>
        </Col>
      </Row>
    </div>
  );
}
