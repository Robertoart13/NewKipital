import { useMemo } from 'react';

import type { ColumnsType } from 'antd/es/table';

import { applyDefaultSorters } from '../lib/tableSorters';

export function useSortableColumns<T>(
  columnsOrFactory: ColumnsType<T> | (() => ColumnsType<T>),
  deps?: unknown[],
): ColumnsType<T> {
  if (typeof columnsOrFactory === 'function') {
    return useMemo(() => applyDefaultSorters(columnsOrFactory()), deps ?? []);
  }

  const memoDeps = deps ? [columnsOrFactory, ...deps] : [columnsOrFactory];
  return useMemo(() => applyDefaultSorters(columnsOrFactory), memoDeps);
}
