import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Empty, Skeleton, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import { canCreateEmployee } from '../../../store/selectors/permissions.selectors';
import { useEmployees } from '../../../queries/employees/useEmployees';
import { useDepartments } from '../../../queries/catalogs/useDepartments';
import { employeeKeys } from '../../../queries/employees/keys';
import { EmployeesTable } from './components/EmployeesTable';
import { EmployeeFilters } from './components/EmployeeFilters';
import { EmployeeCreateModal } from './components/EmployeeCreateModal';
import type { EmployeeFilters as EmployeeFiltersType } from '../../../api/employees';

export function EmployeesListPage() {
  const queryClient = useQueryClient();
  const companyId = useAppSelector((s) => s.activeCompany.company?.id ?? null);
  const canCreate = useAppSelector(canCreateEmployee);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState<EmployeeFiltersType>({
    page: 1,
    pageSize: 20,
  });

  const { data, isLoading, isError, refetch } = useEmployees({
    companyId,
    filters,
  });
  const { data: departments = [] } = useDepartments();

  const paginated = data ?? { data: [], total: 0, page: 1, pageSize: 20 };

  return (
    <>
      <Card
        title={
          <Space>
            <span>Empleados</span>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
                Nuevo Empleado
              </Button>
            )}
          </Space>
        }
      >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <EmployeeFilters
          filters={filters}
          onChange={setFilters}
          departments={departments}
        />
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : isError ? (
          <Empty
            description="Error al cargar empleados"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={() => refetch()}>Reintentar</Button>
          </Empty>
        ) : paginated.data.length === 0 ? (
          <Empty
            description="No hay empleados registrados"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {canCreate && (
              <Button type="primary" onClick={() => setCreateModalOpen(true)}>
                Crear empleado
              </Button>
            )}
          </Empty>
        ) : (
          <EmployeesTable
            data={paginated.data}
            loading={isLoading}
            pagination={{
              current: paginated.page,
              pageSize: paginated.pageSize,
              total: paginated.total,
              onChange: (page, pageSize) =>
                setFilters((f: EmployeeFiltersType) => ({ ...f, page, pageSize })),
            }}
            canEdit={true}
          />
        )}
      </Space>
    </Card>

      <EmployeeCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: employeeKeys.all(companyId ?? 'all') });
        }}
      />
    </>
  );
}
