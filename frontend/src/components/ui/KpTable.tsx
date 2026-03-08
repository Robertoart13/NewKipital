/* =============================================================================
   COMPONENT: KpTable
   =============================================================================

   Wrapper de la tabla Ant Design con clase corporativa KPITAL.

   Responsabilidades:
   - Aplicar clase kp-table
   - Configurar paginacion por defecto (10 items, showTotal)
   - Reexportar todas las props de Table de antd

   ========================================================================== */

import { Table } from 'antd';

import type { TableProps } from 'antd';

/**
 * ============================================================================
 * KpTable
 * ============================================================================
 *
 * Tabla envuelta con clase KPITAL. Paginacion y tamaño por defecto.
 *
 * @param props - Props del Table de antd (columns, dataSource, loading, etc.).
 *
 * ============================================================================
 */
export function KpTable<RecordType extends object>(props: TableProps<RecordType>) {
  return (
    <Table
      className="kp-table"
      pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total: ${t}` }}
      size="middle"
      {...props}
    />
  );
}

