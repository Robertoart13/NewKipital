import { Table } from 'antd';
import type { TableProps } from 'antd';

/**
 * Tabla envuelta con clase KPITAL.
 * Extender aquí convenciones (paginación, tamaño, etc.) si se necesitan.
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
