import { Input, Select, Space } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import type { EmployeeFilters as EmployeeFiltersType } from '../../../../api/employees';

interface EmployeeFiltersProps {
  filters: EmployeeFiltersType;
  onChange: (f: EmployeeFiltersType) => void;
  departments?: { id: number; nombre: string }[];
}

export function EmployeeFilters({
  filters,
  onChange,
  departments = [],
}: EmployeeFiltersProps) {
  const [searchLocal, setSearchLocal] = useState(filters.search ?? '');

  useEffect(() => {
    const t = setTimeout(() => {
      onChange({ ...filters, search: searchLocal || undefined, page: 1 });
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- solo ejecutar cuando cambia searchLocal
  }, [searchLocal]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchLocal(e.target.value);
  }, []);

  return (
    <Space wrap size="middle">
      <Input.Search
        placeholder="Buscar por nombre, cédula, código, email..."
        allowClear
        value={searchLocal}
        onChange={handleSearchChange}
        onSearch={(v) => { setSearchLocal(v); onChange({ ...filters, search: v || undefined, page: 1 }); }}
        style={{ minWidth: 260 }}
      />
      <Select
        placeholder="Departamento"
        allowClear
        style={{ minWidth: 180 }}
        value={filters.idDepartamento ?? undefined}
        onChange={(v) => onChange({ ...filters, idDepartamento: v ?? undefined, page: 1 })}
        options={departments.map((d) => ({ value: d.id, label: d.nombre }))}
      />
      <Select
        placeholder="Estado"
        allowClear
        style={{ minWidth: 120 }}
        value={filters.includeInactive ? 'all' : (filters.estado ?? 1)}
        onChange={(v) =>
          onChange({
            ...filters,
            includeInactive: v === 'all',
            estado: v === 'all' ? undefined : (typeof v === 'number' ? v : undefined),
            page: 1,
          })
        }
        options={[
          { value: 1, label: 'Activos' },
          { value: 0, label: 'Inactivos' },
          { value: 'all', label: 'Todos' },
        ]}
      />
    </Space>
  );
}
