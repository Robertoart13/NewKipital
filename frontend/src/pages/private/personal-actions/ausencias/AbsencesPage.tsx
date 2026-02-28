import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  App as AntdApp,
  Button,
  Card,
  Collapse,
  Flex,
  Input,
  Select,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AppstoreOutlined, ArrowLeftOutlined, EditOutlined, FilterOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppSelector } from '../../../../store/hooks';
import { hasPermission } from '../../../../store/selectors/permissions.selectors';
import {
  fetchAbsenceEmployeesCatalog,
  fetchAbsenceMovementsCatalog,
  fetchPersonalActions,
  type PersonalActionListItem,
} from '../../../../api/personalActions';
import { fetchPayrolls, type PayrollListItem } from '../../../../api/payroll';
import {
  type PayrollMovementListItem,
} from '../../../../api/payrollMovements';
import styles from '../../configuration/UsersManagementPage.module.css';
import {
  AbsenceTransactionModal,
  type AbsenceFormDraft,
  type AbsenceTransactionLine,
} from './AbsenceTransactionModal';

const ESTADO_LABEL: Record<number, { text: string; color: string }> = {
  1: { text: 'Borrador', color: 'default' },
  2: { text: 'Pendiente Supervisor', color: 'orange' },
  3: { text: 'Pendiente RRHH', color: 'gold' },
  4: { text: 'Aprobada', color: 'green' },
  5: { text: 'Consumida', color: 'cyan' },
  6: { text: 'Cancelada', color: 'red' },
  7: { text: 'Invalidada', color: 'volcano' },
  8: { text: 'Expirada', color: 'magenta' },
  9: { text: 'Rechazada', color: 'red' },
};

interface AbsenceUiRow extends PersonalActionListItem {
  employeeLabel?: string;
}

function getEstadoTag(estado: number) {
  const meta = ESTADO_LABEL[estado] ?? { text: `Estado ${estado}`, color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

function createDraftFromRow(row: PersonalActionListItem): AbsenceFormDraft {
  const defaultLine: AbsenceTransactionLine = {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipoAusencia: 'JUSTIFICADA',
    remuneracion: true,
    formula: row.descripcion ?? '',
    monto: row.monto ?? undefined,
    fechaEfecto: row.fechaEfecto ? dayjs(row.fechaEfecto) : undefined,
  };

  return {
    idEmpresa: row.idEmpresa,
    idEmpleado: row.idEmpleado,
    observacion: row.descripcion ?? '',
    lines: [defaultLine],
  };
}

export function AbsencesPage() {
  const { message } = AntdApp.useApp();
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);
  const canCreate = useAppSelector((state) => hasPermission(state, 'hr-action-ausencias:create'));
  const canEdit = useAppSelector((state) => hasPermission(state, 'hr-action-ausencias:edit'));

  const defaultCompanyId = useMemo(() => {
    const active = Number(activeCompany?.id);
    if (Number.isFinite(active) && active > 0) return active;
    const first = Number(companies[0]?.id);
    return Number.isFinite(first) && first > 0 ? first : undefined;
  }, [activeCompany?.id, companies]);

  const [rows, setRows] = useState<AbsenceUiRow[]>([]);
  const [employees, setEmployees] = useState<
    Array<{
      id: number;
      idEmpresa: number;
      codigo: string;
      nombre: string;
      apellido1: string;
      apellido2?: string | null;
      idPeriodoPago?: number | null;
      monedaSalario?: string | null;
    }>
  >([]);
  const [payrolls, setPayrolls] = useState<PayrollListItem[]>([]);
  const [movements, setMovements] = useState<PayrollMovementListItem[]>([]);
  const [absenceActionTypeId, setAbsenceActionTypeId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState<number | undefined>(defaultCompanyId);
  const [estado, setEstado] = useState<number | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingRow, setEditingRow] = useState<AbsenceUiRow | null>(null);

  const loadRows = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchPersonalActions(String(companyId), estado);
      const filtered = data.filter((item) => item.tipoAccion.trim().toLowerCase() === 'ausencia');
      setRows(filtered);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudieron cargar las ausencias.');
    } finally {
      setLoading(false);
    }
  }, [companyId, estado, message]);

  const loadCatalogs = useCallback(async () => {
    try {
      const [employeesResp, payrollsResp, movementsResp] = await Promise.all([
        companyId ? fetchAbsenceEmployeesCatalog(companyId) : Promise.resolve([]),
        companyId ? fetchPayrolls(String(companyId), true) : Promise.resolve([]),
        companyId ? fetchAbsenceMovementsCatalog(companyId, 20) : Promise.resolve([]),
      ]);

      setEmployees(employeesResp);
      setPayrolls(payrollsResp);
      setMovements(
        movementsResp.map((movement) => ({
          id: movement.id,
          idEmpresa: movement.idEmpresa,
          nombre: movement.nombre,
          idArticuloNomina: 0,
          idTipoAccionPersonal: movement.idTipoAccionPersonal,
          idClase: null,
          idProyecto: null,
          descripcion: movement.descripcion ?? null,
          esMontoFijo: 1,
          montoFijo: '0',
          porcentaje: '0',
          formulaAyuda: movement.formulaAyuda ?? '--',
          esInactivo: movement.esInactivo,
        })),
      );
      setAbsenceActionTypeId(undefined);
    } catch {
      setEmployees([]);
      setPayrolls([]);
      setMovements([]);
      setAbsenceActionTypeId(undefined);
    }
  }, [companyId]);

  useEffect(() => {
    void loadRows();
    void loadCatalogs();
  }, [loadRows, loadCatalogs]);

  const rowsWithEmployee = useMemo(() => {
    const map = new Map<number, string>();
    employees.forEach((employee) => {
      map.set(employee.id, `${employee.nombre} ${employee.apellido1}`);
    });

    return rows.map((row) => ({ ...row, employeeLabel: map.get(row.idEmpleado) }));
  }, [rows, employees]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rowsWithEmployee;
    return rowsWithEmployee.filter((row) => {
      const text = `${row.id} ${row.idEmpleado} ${row.employeeLabel ?? ''} ${row.descripcion ?? ''}`.toLowerCase();
      return text.includes(term);
    });
  }, [rowsWithEmployee, search]);

  const columns: ColumnsType<AbsenceUiRow> = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
    {
      title: 'Empleado',
      key: 'empleado',
      render: (_, row) => row.employeeLabel ?? `Empleado #${row.idEmpleado}`,
    },
    {
      title: 'Fecha efecto',
      dataIndex: 'fechaEfecto',
      key: 'fechaEfecto',
      width: 130,
      render: (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '--'),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 170,
      render: (value) => getEstadoTag(value),
    },
    {
      title: 'Descripcion',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (value) => value?.trim() || '--',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_, row) => (
        <Button
          icon={<EditOutlined />}
          size="small"
          disabled={!canEdit}
          onClick={() => {
            setEditingRow(row);
            setMode('edit');
            setOpenModal(true);
          }}
        >
          Editar
        </Button>
      ),
    },
  ], [canEdit]);

  const modalTitle = mode === 'create' ? 'Crear Ausencia' : 'Editar Ausencia';

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/dashboard">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Ausencias</h1>
            <p className={styles.pageSubtitle}>Gestione ausencias por empresa con líneas de transacción por periodo</p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <AppstoreOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestión de Ausencias</h2>
                <p className={styles.gestionDesc}>Encabezado de acción + múltiples líneas por planilla</p>
              </div>
            </Flex>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={`${styles.actionButton} ${styles.btnPrimary}`}
              disabled={!canCreate}
              onClick={() => {
                setEditingRow(null);
                setMode('create');
                setOpenModal(true);
              }}
            >
              Crear ausencia
            </Button>
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
            <Flex align="center" gap={8} wrap="wrap">
              <FilterOutlined className={styles.registrosFilterIcon} />
              <h3 className={styles.registrosTitle}>Registros de Ausencias</h3>
            </Flex>
            <Button icon={<ReloadOutlined />} onClick={() => void loadRows()}>Refrescar</Button>
          </Flex>

          <Collapse
            className={styles.filtersCollapse}
            activeKey={filtersOpen ? ['filtros'] : []}
            onChange={(keys) => setFiltersOpen((Array.isArray(keys) ? keys : [keys]).includes('filtros'))}
            items={[{
              key: 'filtros',
              label: 'Filtros',
              children: (
                <Flex gap={12} wrap="wrap" align="end">
                  <div style={{ minWidth: 250 }}>
                    <span className={styles.filterLabel}>Empresa</span>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      style={{ width: '100%' }}
                      value={companyId}
                      options={companies.map((company) => ({ value: Number(company.id), label: company.nombre }))}
                      onChange={(value) => setCompanyId(Number(value))}
                    />
                  </div>
                  <div style={{ minWidth: 220 }}>
                    <span className={styles.filterLabel}>Estado</span>
                    <Select
                      allowClear
                      style={{ width: '100%' }}
                      placeholder="Todos"
                      value={estado}
                      options={Object.entries(ESTADO_LABEL).map(([value, meta]) => ({ value: Number(value), label: meta.text }))}
                      onChange={(value) => setEstado(value)}
                    />
                  </div>
                  <div style={{ minWidth: 260 }}>
                    <span className={styles.filterLabel}>Buscar</span>
                    <Input
                      allowClear
                      placeholder="ID, empleado, descripcion"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </Flex>
              ),
            }]}
          />

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            className={`${styles.configTable} ${styles.companiesTable}`}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total, [start, end]) => `Mostrando ${start} a ${end} de ${total} registros`,
            }}
          />
        </div>
      </Card>

      <AbsenceTransactionModal
        open={openModal}
        mode={mode}
        title={modalTitle}
        companies={companies}
        employees={employees}
        payrolls={payrolls}
        movements={movements}
        actionTypeIdForAbsence={absenceActionTypeId}
        initialCompanyId={companyId}
        initialDraft={editingRow ? createDraftFromRow(editingRow) : undefined}
        onCancel={() => setOpenModal(false)}
        onSubmit={() => {
          message.info('Vista de Ausencias lista. Guardado funcional se implementa en el siguiente bloque.');
          setOpenModal(false);
        }}
      />
    </div>
  );
}

