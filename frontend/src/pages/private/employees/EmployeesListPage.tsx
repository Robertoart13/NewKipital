import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Empty,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  DownOutlined,
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  TeamOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import { canCreateEmployee, canEditEmployee } from '../../../store/selectors/permissions.selectors';
import { useEmployees } from '../../../queries/employees/useEmployees';
import { employeeKeys } from '../../../queries/employees/keys';
import { EmployeeCreateModal } from './components/EmployeeCreateModal';
import { EmployeeEditModal } from './components/EmployeeEditModal';
import type { EmployeeFilters as EmployeeFiltersType, EmployeeListItem } from '../../../api/employees';
import styles from '../configuration/UsersManagementPage.module.css';

type PaneKey = 'codigo' | 'empresa' | 'nombreCompleto' | 'cedula' | 'correo' | 'telefono' | 'estado';

interface PaneConfig {
  key: PaneKey;
  title: string;
}

interface PaneOption {
  value: string;
  count: number;
}

const paneConfig: PaneConfig[] = [
  { key: 'codigo', title: 'Codigo Empleado' },
  { key: 'empresa', title: 'Empresa' },
  { key: 'nombreCompleto', title: 'Nombre Completo' },
  { key: 'cedula', title: 'Cedula' },
  { key: 'correo', title: 'Correo' },
  { key: 'telefono', title: 'Telefono' },
  { key: 'estado', title: 'Estado' },
];

function buildFullName(employee: EmployeeListItem): string {
  return [employee.apellido1, employee.apellido2, employee.nombre]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ');
}

function getPaneValue(
  employee: EmployeeListItem,
  key: PaneKey,
  companyNameById: Map<number, string>,
): string {
  if (key === 'codigo') return employee.codigo ?? '';
  if (key === 'empresa') return companyNameById.get(employee.idEmpresa) ?? `Empresa #${employee.idEmpresa}`;
  if (key === 'nombreCompleto') return buildFullName(employee);
  if (key === 'cedula') return employee.cedula ?? '';
  if (key === 'correo') return employee.email ?? '';
  if (key === 'telefono') return employee.telefono?.trim() || '—';
  return employee.estado === 1 ? 'Activo' : 'Inactivo';
}

export function EmployeesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companyId = useAppSelector((s) => s.activeCompany.company?.id ?? null);
  const companies = useAppSelector((s) => s.auth.companies);
  const canCreate = useAppSelector(canCreateEmployee);
  const canEdit = useAppSelector(canEditEmployee);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [paneSearch, setPaneSearch] = useState<Record<PaneKey, string>>({
    codigo: '',
    empresa: '',
    nombreCompleto: '',
    cedula: '',
    correo: '',
    telefono: '',
    estado: '',
  });
  const [paneSelections, setPaneSelections] = useState<Record<PaneKey, string[]>>({
    codigo: [],
    empresa: [],
    nombreCompleto: [],
    cedula: [],
    correo: [],
    telefono: [],
    estado: [],
  });
  const [paneOpen, setPaneOpen] = useState<Record<PaneKey, boolean>>({
    codigo: false,
    empresa: false,
    nombreCompleto: false,
    cedula: false,
    correo: false,
    telefono: false,
    estado: false,
  });
  const [filters, setFilters] = useState<EmployeeFiltersType & { companyIds?: number[] }>({
    page: 1,
    pageSize: 10,
    includeInactive: false,
  });
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);

  const companyKey = selectedCompanyIds.length
    ? [...selectedCompanyIds].sort((a, b) => a - b).join(',')
    : companyId != null
      ? String(companyId)
      : 'all';
  const shouldFetchEmployees = selectedCompanyIds.length > 0;

  const { data, isLoading, isError, refetch } = useEmployees({
    companyKey,
    filters,
    enabled: shouldFetchEmployees,
  });

  const companyNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const company of companies) {
      map.set(company.id, company.nombre);
    }
    return map;
  }, [companies]);

  const paginated = shouldFetchEmployees
    ? data ?? { data: [], total: 0, page: 1, pageSize }
    : { data: [], total: 0, page: 1, pageSize };

  const matchesGlobalSearch = (employee: EmployeeListItem): boolean => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const fullName = buildFullName(employee).toLowerCase();
    const companyName = (companyNameById.get(employee.idEmpresa) ?? '').toLowerCase();
    return (
      (employee.codigo ?? '').toLowerCase().includes(term)
      || (employee.cedula ?? '').toLowerCase().includes(term)
      || (employee.email ?? '').toLowerCase().includes(term)
      || (employee.telefono ?? '').toLowerCase().includes(term)
      || fullName.includes(term)
      || companyName.includes(term)
    );
  };

  const dataFilteredByPaneSelections = (excludePane?: PaneKey) =>
    paginated.data.filter((employee) => {
      if (!matchesGlobalSearch(employee)) return false;
      for (const pane of paneConfig) {
        if (pane.key === excludePane) continue;
        const selected = paneSelections[pane.key];
        if (selected.length === 0) continue;
        const value = getPaneValue(employee, pane.key, companyNameById);
        if (!selected.includes(value)) return false;
      }
      return true;
    });

  const paneOptions = useMemo(() => {
    const result: Record<PaneKey, PaneOption[]> = {
      codigo: [],
      empresa: [],
      nombreCompleto: [],
      cedula: [],
      correo: [],
      telefono: [],
      estado: [],
    };

    for (const pane of paneConfig) {
      const filteredData = dataFilteredByPaneSelections(pane.key);
      const counter = new Map<string, number>();
      for (const employee of filteredData) {
        const value = getPaneValue(employee, pane.key, companyNameById).trim();
        if (!value) continue;
        counter.set(value, (counter.get(value) ?? 0) + 1);
      }
      const paneTerm = paneSearch[pane.key].trim().toLowerCase();
      result[pane.key] = Array.from(counter.entries())
        .map(([value, count]) => ({ value, count }))
        .filter((item) => !paneTerm || item.value.toLowerCase().includes(paneTerm))
        .sort((a, b) => a.value.localeCompare(b.value));
    }
    return result;
  }, [companyNameById, paneSearch, paneSelections, paginated.data, search]);

  const filteredEmployees = useMemo(
    () => dataFilteredByPaneSelections(),
    [paneSelections, paginated.data, search, companyNameById],
  );

  const columns: ColumnsType<EmployeeListItem> = [
    {
      title: 'Codigo empleado',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 170,
    },
    {
      title: 'Empresa',
      key: 'empresa',
      width: 220,
      render: (_, employee) => companyNameById.get(employee.idEmpresa) ?? `Empresa #${employee.idEmpresa}`,
    },
    {
      title: 'Nombre completo',
      key: 'nombreCompleto',
      width: 260,
      render: (_, employee) => buildFullName(employee),
    },
    {
      title: 'Cedula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 170,
    },
    {
      title: 'Correo',
      dataIndex: 'email',
      key: 'email',
      width: 260,
    },
    {
      title: 'Telefono',
      key: 'telefono',
      width: 170,
      render: (_, employee) => employee.telefono?.trim() || '—',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado: number) =>
        estado === 1
          ? <Tag className={styles.tagActivo}>Activo</Tag>
          : <Tag className={styles.tagInactivo}>Inactivo</Tag>,
    },
  ];

  const applyFilters = (next: Partial<EmployeeFiltersType>) => {
    setFilters((current) => ({
      ...current,
      ...next,
      page: 1,
    }));
  };

  const clearAllFilters = () => {
    setSearch('');
    setPaneSearch({
      codigo: '',
      empresa: '',
      nombreCompleto: '',
      cedula: '',
      correo: '',
      telefono: '',
      estado: '',
    });
    setPaneSelections({
      codigo: [],
      empresa: [],
      nombreCompleto: [],
      cedula: [],
      correo: [],
      telefono: [],
      estado: [],
    });
    setPaneOpen({
      codigo: false,
      empresa: false,
      nombreCompleto: false,
      cedula: false,
      correo: false,
      telefono: false,
      estado: false,
    });
    setShowInactive(false);
    setSelectedCompanyIds([]);
    setFilters((current) => ({
      ...current,
      page: 1,
      includeInactive: false,
      estado: 1,
      search: undefined,
      companyIds: undefined,
    }));
  };

  const clearPaneSelection = (key: PaneKey) => {
    setPaneSelections((prev) => ({ ...prev, [key]: [] }));
    setPaneSearch((prev) => ({ ...prev, [key]: '' }));
  };

  const openAllPanes = () => {
    setPaneOpen({
      codigo: true,
      empresa: true,
      nombreCompleto: true,
      cedula: true,
      correo: true,
      telefono: true,
      estado: true,
    });
  };

  const collapseAllPanes = () => {
    setPaneOpen({
      codigo: false,
      empresa: false,
      nombreCompleto: false,
      cedula: false,
      correo: false,
      telefono: false,
      estado: false,
    });
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link to="/dashboard" className={styles.pageBackLink}>
            <ArrowLeftOutlined style={{ fontSize: 18 }} />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Listado de Empleados</h1>
            <p className={styles.pageSubtitle}>Visualice y gestione todos los empleados registrados en el sistema de recursos humanos</p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Flex align="center" gap={14}>
              <div className={styles.gestionIconWrap}>
                <TeamOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <p className={styles.gestionTitle}>Gestion de Empleados</p>
                <p className={styles.gestionDesc}>Administre y consulte todos los empleados registrados en el sistema</p>
              </div>
            </Flex>
            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
                onClick={() => setCreateModalOpen(true)}
              >
                Crear Empleado
              </Button>
            )}
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex justify="space-between" align="center" className={styles.registrosHeader} wrap="wrap" gap={12}>
            <Flex align="center" gap={8}>
              <FilterOutlined className={styles.registrosFilterIcon} />
              <h3 className={styles.registrosTitle}>Registros de Empleados</h3>
              <Select
                value={pageSize}
                onChange={(value) => {
                  setPageSize(value);
                  setFilters((current) => ({ ...current, page: 1, pageSize: value }));
                }}
                options={[10, 20, 50, 100].map((n) => ({ label: String(n), value: n }))}
                style={{ width: 80 }}
              />
              <span style={{ color: '#6b7a85', fontSize: 14 }}>entries per page</span>
            </Flex>
            <Flex align="center" gap={8}>
              <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivos</span>
              <Switch
                checked={showInactive}
                onChange={(checked) => {
                  setShowInactive(checked);
                  applyFilters({
                    includeInactive: checked,
                    estado: checked ? undefined : 1,
                  });
                }}
                size="small"
              />
              <Select
                mode="multiple"
                allowClear
                placeholder="Filtrar por empresa(s)"
                value={selectedCompanyIds}
                onChange={(values) => {
                  const next = values as number[];
                  setSelectedCompanyIds(next);
                  setFilters((current) => ({
                    ...current,
                    page: 1,
                    companyIds: next.length ? next : undefined,
                  }));
                }}
                options={companies.map((company) => ({
                  value: company.id,
                  label: company.nombre,
                }))}
                style={{ minWidth: 220 }}
              />
            </Flex>
          </Flex>

          <Collapse
            activeKey={filtersExpanded ? ['filtros'] : []}
            onChange={(keys) => setFiltersExpanded(keys.includes('filtros'))}
            className={styles.filtersCollapse}
            items={[
              {
                key: 'filtros',
                label: 'Filtros',
                children: (
                  <>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
                      <Input
                        placeholder="Search"
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSearch(value);
                          applyFilters({ search: value || undefined });
                        }}
                        allowClear
                        className={styles.searchInput}
                        style={{ maxWidth: 240 }}
                      />
                      <Flex gap={8}>
                        <Button size="small" onClick={collapseAllPanes}>Collapse All</Button>
                        <Button size="small" onClick={openAllPanes}>Show All</Button>
                        <Button size="small" onClick={clearAllFilters}>Limpiar Todo</Button>
                      </Flex>
                    </Flex>

                    <Row gutter={[12, 12]}>
                      {paneConfig.map((pane) => (
                        <Col xs={24} md={12} xl={8} key={pane.key}>
                          <div className={styles.paneCard}>
                            <Flex gap={6} align="center" wrap="wrap">
                              <Input
                                value={paneSearch[pane.key]}
                                onChange={(event) => setPaneSearch((prev) => ({ ...prev, [pane.key]: event.target.value }))}
                                placeholder={pane.title}
                                prefix={<SearchOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
                                suffix={(
                                  <Flex gap={2}>
                                    <SortAscendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                                    <SortDescendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                                  </Flex>
                                )}
                                size="middle"
                                className={styles.filterInput}
                                style={{ flex: 1, minWidth: 120 }}
                              />
                              <Button
                                size="middle"
                                icon={<SearchOutlined />}
                                onClick={() => setPaneOpen((prev) => ({ ...prev, [pane.key]: true }))}
                                title="Abrir opciones"
                              />
                              <Button size="middle" onClick={() => clearPaneSelection(pane.key)} title="Limpiar">
                                x
                              </Button>
                              <Button
                                size="middle"
                                icon={paneOpen[pane.key] ? <UpOutlined /> : <DownOutlined />}
                                onClick={() => setPaneOpen((prev) => ({ ...prev, [pane.key]: !prev[pane.key] }))}
                                title={paneOpen[pane.key] ? 'Colapsar' : 'Expandir'}
                              />
                            </Flex>
                            {paneOpen[pane.key] && (
                              <div className={styles.paneOptionsBox}>
                                <Checkbox.Group
                                  value={paneSelections[pane.key]}
                                  onChange={(values) => setPaneSelections((prev) => ({ ...prev, [pane.key]: values as string[] }))}
                                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                >
                                  {paneOptions[pane.key].map((option) => (
                                    <Checkbox key={`${pane.key}:${option.value}`} value={option.value}>
                                      <Space>
                                        <span>{option.value}</span>
                                        <Badge count={option.count} style={{ backgroundColor: '#5a6c7d' }} />
                                      </Space>
                                    </Checkbox>
                                  ))}
                                </Checkbox.Group>
                                {paneOptions[pane.key].length === 0 && (
                                  <span className={styles.emptyHint}>Sin valores para este filtro</span>
                                )}
                              </div>
                            )}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </>
                ),
              },
            ]}
          />

          {isError ? (
            <Empty description="Error al cargar empleados" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button onClick={() => refetch()}>Reintentar</Button>
            </Empty>
          ) : (
              <Table<EmployeeListItem>
                rowKey="id"
                loading={isLoading}
                columns={columns}
                dataSource={filteredEmployees}
                className={`${styles.configTable} ${styles.companiesTable}`}
                locale={{
                  emptyText: 'No hay empleados registrados',
                }}
                pagination={{
                  current: paginated.page,
                  pageSize: paginated.pageSize,
                  total: paginated.total,
                  showSizeChanger: false,
                  onChange: (page, size) => {
                    setFilters((current) => ({ ...current, page, pageSize: size }));
                  },
                  showTotal: (total, range) => `Mostrando ${range[0]} a ${range[1]} de ${total} registros`,
                }}
                onRow={(record) => ({
                    onClick: () => {
                      if (canEdit) {
                        setEditingEmployeeId(record.id);
                        setEditModalOpen(true);
                        return;
                      }
                      navigate(`/employees/${record.id}`);
                    },
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </div>
        </Card>

        <EmployeeCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.all(companyKey) });
          }}
        />

        <EmployeeEditModal
          employeeId={editingEmployeeId ?? undefined}
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingEmployeeId(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: employeeKeys.all(companyKey) });
          }}
        />
      </div>
  );
}
