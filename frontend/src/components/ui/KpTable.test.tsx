import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpTable } from './KpTable';

interface Row {
  key: string;
  nombre: string;
  codigo: string;
}

const columns = [
  { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
  { title: 'Código', dataIndex: 'codigo', key: 'codigo' },
];

const data: Row[] = [
  { key: '1', nombre: 'Juan Pérez', codigo: 'EMP-001' },
  { key: '2', nombre: 'Ana García', codigo: 'EMP-002' },
];

describe('KpTable', () => {
  it('renders with kp-table class', () => {
    const { container } = render(<KpTable<Row> columns={columns} dataSource={[]} />);
    expect(container.querySelector('.kp-table')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<KpTable<Row> columns={columns} dataSource={[]} />);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Código')).toBeInTheDocument();
  });

  it('renders data rows correctly', () => {
    render(<KpTable<Row> columns={columns} dataSource={data} />);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Ana García')).toBeInTheDocument();
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
    const { container } = render(
      <KpTable<Row> columns={columns} dataSource={[]} loading={true} />,
    );
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });
});
