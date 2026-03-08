/* =============================================================================
   MODULE: tableSorters
   =============================================================================

   Utilidades para ordenamiento de columnas de tabla Ant Design.

   Responsabilidades:
   - compareTableValues
   - applyDefaultSorters (agrega sorter a columnas con dataIndex)

   ========================================================================== */

import type { ColumnsType } from 'antd/es/table';

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * ============================================================================
 * compareTableValues
 * ============================================================================
 *
 * Compara valores para ordenamiento con locale es.
 *
 * ============================================================================
 */
export function compareTableValues(left: unknown, right: unknown): number {
  return collator.compare(normalizeValue(left), normalizeValue(right));
}

function readDataIndexValue<T>(row: T, dataIndex: string | number | readonly (string | number)[]) {
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce<unknown>((acc, key) => {
      if (acc === null || acc === undefined) return undefined;
      return (acc as Record<string | number, unknown>)[key];
    }, row as unknown);
  }
  return (row as Record<string | number, unknown>)[dataIndex];
}

/**
 * ============================================================================
 * applyDefaultSorters
 * ============================================================================
 *
 * Aplica sorter por defecto a columnas con dataIndex (recursivo para children).
 *
 * ============================================================================
 */
export function applyDefaultSorters<T>(columns: ColumnsType<T>): ColumnsType<T> {
  return columns.map((column) => {
    if ('children' in column && column.children) {
      return {
        ...column,
        children: applyDefaultSorters(column.children as ColumnsType<T>),
      };
    }

    if (!('dataIndex' in column) || !column.dataIndex || column.sorter) {
      return column;
    }

    const dataIndex = column.dataIndex;

    return {
      ...column,
      sorter: (left: T, right: T) =>
        compareTableValues(readDataIndexValue(left, dataIndex), readDataIndexValue(right, dataIndex)),
    };
  });
}
