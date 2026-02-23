import { Table, Dropdown, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EllipsisOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { EmployeeListItem } from '../../../../api/employees';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';

interface EmployeesTableProps {
  data: EmployeeListItem[];
  loading?: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  canEdit?: boolean;
}

export function EmployeesTable({
  data,
  loading,
  pagination,
  canEdit = false,
}: EmployeesTableProps) {
  const columns: ColumnsType<EmployeeListItem> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
    },
    {
      title: 'Cédula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 120,
    },
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, r) => `${r.nombre} ${r.apellido1 || ''} ${r.apellido2 ? ` ${r.apellido2}` : ''}`.trim(),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Departamento',
      key: 'departamento',
      width: 150,
      render: (_, r) => r.departamento?.nombre ?? '—',
    },
    {
      title: 'Puesto',
      key: 'puesto',
      width: 150,
      render: (_, r) => r.puesto?.nombre ?? '—',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 90,
      render: (estado: number) => <EmployeeStatusBadge estado={estado} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: <Link to={`/employees/${r.id}`}>Ver</Link>,
              },
              ...(canEdit
                ? [
                    {
                      key: 'edit',
                      icon: <EditOutlined />,
                      label: <Link to={`/employees/${r.id}`}>Editar</Link>,
                    },
                  ]
                : []),
            ],
          }}
        >
          <Button type="text" icon={<EllipsisOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <Table<EmployeeListItem>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showTotal: (t) => `Total ${t} registros`,
        onChange: pagination.onChange,
      }}
      size="middle"
    />
  );
}
