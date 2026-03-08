import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('antd', () => ({
  Table: ({
    columns,
    dataSource,
    className,
    loading,
    pagination,
  }: {
    columns?: Array<{ key: string; title: React.ReactNode; dataIndex: string }>;
    dataSource?: Record<string, unknown>[];
    className?: string;
    loading?: boolean;
    pagination?: { showTotal?: (total: number) => React.ReactNode } | false;
  }) => {
    const total = dataSource?.length ?? 0;
    const showTotal =
      pagination !== false ? (pagination as { showTotal?: (n: number) => React.ReactNode })?.showTotal : undefined;
    return (
      <div className={['ant-table', className].filter(Boolean).join(' ')}>
        {loading && <div className="ant-spin" />}
        <table>
          <thead>
            <tr>
              {columns?.map((c) => (
                <th key={c.key}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataSource?.map((row) => (
              <tr key={String(row.key)}>
                {columns?.map((c) => (
                  <td key={c.key}>{String(row[c.dataIndex] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {showTotal && <div>{showTotal(total)}</div>}
      </div>
    );
  },
}));

import { KpTable } from '../KpTable';

interface Row {
  key: string;
  nombre: string;
  codigo: string;
}

const columns = [
  { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
  { title: 'Codigo', dataIndex: 'codigo', key: 'codigo' },
];

const data: Row[] = [
  { key: '1', nombre: 'Juan Perez', codigo: 'EMP-001' },
  { key: '2', nombre: 'Ana Garcia', codigo: 'EMP-002' },
];

describe('KpTable', () => {
  it('renders with kp-table class', () => {
    const { container } = render(<KpTable<Row> columns={columns} dataSource={[]} />);
    expect(container.querySelector('.kp-table')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<KpTable<Row> columns={columns} dataSource={[]} />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Codigo')).toBeInTheDocument();
  });

  it('renders data rows correctly', () => {
    render(<KpTable<Row> columns={columns} dataSource={data} />);
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('EMP-002')).toBeInTheDocument();
  });

  it('renders empty table without errors', () => {
    const { container } = render(<KpTable<Row> columns={columns} dataSource={[]} />);
    expect(container.querySelector('.ant-table')).toBeInTheDocument();
  });

  it('shows total count in pagination', () => {
    render(<KpTable<Row> columns={columns} dataSource={data} />);
    expect(screen.getByText(/Total: 2/)).toBeInTheDocument();
  });

  it('accepts and passes loading prop', () => {
    const { container } = render(<KpTable<Row> columns={columns} dataSource={[]} loading={true} />);
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });
});
