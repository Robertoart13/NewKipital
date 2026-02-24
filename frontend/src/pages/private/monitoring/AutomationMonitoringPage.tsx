import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Collapse,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  fetchEncryptQueue,
  fetchIdentityQueue,
  fetchQueuesSummary,
  releaseStuckQueues,
  requeueJob,
  rescanQueues,
  type QueueFilters,
  type QueueJobItem,
  type QueueSummaryResponse,
} from '../../../api/opsMonitoring';
import { useAppSelector } from '../../../store/hooks';
import { formatDateTime12h } from '../../../lib/formatDate';
import styles from '../configuration/UsersManagementPage.module.css';

const { Text } = Typography;

const STATUS_OPTIONS_OPERATIVO = [
  'PENDING',
  'PROCESSING',
  'ERROR_CONFIG',
  'ERROR_DUPLICATE',
  'ERROR_PERM',
  'ERROR_FATAL',
];
const STATUS_OPTIONS_HISTORIAL = ['DONE'];

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'En proceso',
  DONE: 'Procesado',
  ERROR_CONFIG: 'Error de configuracion',
  ERROR_DUPLICATE: 'Error por duplicado',
  ERROR_PERM: 'Error de permisos',
  ERROR_FATAL: 'Error critico',
};

function getStatusColor(status: string) {
  if (status === 'DONE') return 'success';
  if (status === 'PENDING') return 'processing';
  if (status === 'PROCESSING') return 'warning';
  if (status.startsWith('ERROR')) return 'error';
  return 'default';
}

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function getQueueSummaryLabel(queue: Record<string, number> | undefined) {
  const pending = queue?.PENDING ?? 0;
  const processing = queue?.PROCESSING ?? 0;
  const done = queue?.DONE ?? 0;
  const errors = Object.entries(queue ?? {})
    .filter(([key]) => key.startsWith('ERROR'))
    .reduce((sum, [, value]) => sum + value, 0);

  return `Pendiente: ${pending} | En proceso: ${processing} | Procesado: ${done} | Error: ${errors}`;
}

function buildDateFrom(range: '24h' | '7d' | '30d') {
  const now = Date.now();
  const offsetMs = range === '24h' ? 24 * 60 * 60 * 1000 : range === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  return new Date(now - offsetMs).toISOString();
}

export function AutomationMonitoringPage() {
  const { message } = AntdApp.useApp();
  const permissions = useAppSelector((state) => state.permissions.permissions);
  const canOperate = permissions.includes('automation:admin');

  const [summary, setSummary] = useState<QueueSummaryResponse | null>(null);
  const [identityData, setIdentityData] = useState<QueueJobItem[]>([]);
  const [encryptData, setEncryptData] = useState<QueueJobItem[]>([]);
  const [identityTotal, setIdentityTotal] = useState(0);
  const [encryptTotal, setEncryptTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'encrypt'>('identity');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [vista, setVista] = useState<'operativo' | 'historial'>('operativo');
  const [rangoHistorial, setRangoHistorial] = useState<'24h' | '7d' | '30d'>('24h');

  const [filters, setFilters] = useState<QueueFilters>({
    page: 1,
    pageSize: 25,
    attemptsMin: 0,
    includeDone: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResp, identityResp, encryptResp] = await Promise.all([
        fetchQueuesSummary(),
        fetchIdentityQueue(filters),
        fetchEncryptQueue(filters),
      ]);
      setSummary(summaryResp);
      setIdentityData(identityResp.data);
      setIdentityTotal(identityResp.total);
      setEncryptData(encryptResp.data);
      setEncryptTotal(encryptResp.total);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Error cargando monitoreo');
    } finally {
      setLoading(false);
    }
  }, [filters, message]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      void loadData();
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

  useEffect(() => {
    if (vista === 'historial') {
      setFilters((prev) => ({
        ...prev,
        includeDone: 1,
        estado: prev.estado && prev.estado !== 'DONE' ? undefined : prev.estado,
        fechaDesde: buildDateFrom(rangoHistorial),
        fechaHasta: undefined,
        lockedOnly: 0,
        stuckOnly: 0,
        pageSize: Math.min(prev.pageSize ?? 25, 100),
        page: 1,
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      includeDone: 0,
      fechaDesde: undefined,
      fechaHasta: undefined,
      estado: prev.estado === 'DONE' ? undefined : prev.estado,
      pageSize: Math.min(prev.pageSize ?? 25, 200),
      page: 1,
    }));
  }, [vista, rangoHistorial]);

  const commonColumns: ColumnsType<QueueJobItem> = useMemo(
    () => [
      { title: 'ID Cola', dataIndex: 'idQueue', key: 'idQueue', width: 100 },
      { title: 'ID Empleado', dataIndex: 'idEmpleado', key: 'idEmpleado', width: 110 },
      {
        title: 'Estado',
        dataIndex: 'estado',
        key: 'estado',
        width: 140,
        render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusLabel(status)}</Tag>,
      },
      { title: 'Intentos', dataIndex: 'attempts', key: 'attempts', width: 90 },
      {
        title: 'Proximo reintento',
        dataIndex: 'nextRetryAt',
        key: 'nextRetryAt',
        width: 180,
        render: (value: string | null) => (value ? formatDateTime12h(value) : '-'),
      },
      {
        title: 'Bloqueado por',
        dataIndex: 'lockedBy',
        key: 'lockedBy',
        width: 140,
        render: (v: string | null) => v || '-',
      },
      {
        title: 'Bloqueado en',
        dataIndex: 'lockedAt',
        key: 'lockedAt',
        width: 180,
        render: (value: string | null) => (value ? formatDateTime12h(value) : '-'),
      },
      {
        title: 'Ultimo error',
        dataIndex: 'lastError',
        key: 'lastError',
        width: 260,
        ellipsis: true,
        render: (value: string | null) => value || '-',
      },
      {
        title: 'Creado',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (value: string) => formatDateTime12h(value),
      },
      {
        title: 'Actualizado',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 180,
        render: (value: string) => formatDateTime12h(value),
      },
      {
        title: 'Diagnostico',
        dataIndex: 'diagnostico',
        key: 'diagnostico',
        width: 280,
      },
      ...(canOperate
        ? ([
            {
              title: 'Acciones',
              key: 'actions',
              width: 120,
              fixed: 'right',
              render: (_: unknown, record: QueueJobItem) => (
                <Button
                  size="small"
                  className={styles.btnSecondary}
                  disabled={record.estado === 'DONE'}
                  onClick={async () => {
                    try {
                      await requeueJob(activeTab, record.idQueue);
                      message.success('Proceso reintentado');
                      await loadData();
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'Error al reintentar proceso');
                    }
                  }}
                >
                  Reintentar
                </Button>
              ),
            },
          ] as ColumnsType<QueueJobItem>)
        : []),
    ],
    [activeTab, canOperate, loadData, message],
  );

  const cards = useMemo(
    () => [
      {
        title: 'Cola de Identidad',
        tooltip:
          'Esta seccion muestra los procesos encargados de crear o validar la identidad digital del empleado antes del cifrado.',
        value: getQueueSummaryLabel(summary?.identity),
      },
      {
        title: 'Cola de Cifrado',
        tooltip: 'Procesos encargados de proteger los datos sensibles del empleado mediante cifrado seguro.',
        value: getQueueSummaryLabel(summary?.encrypt),
      },
      {
        title: 'Activos sin usuario',
        tooltip: 'Cantidad de empleados activos que aun no tienen usuario digital asociado.',
        value: String(summary?.activosSinUsuario ?? 0),
      },
      {
        title: 'Activos no cifrados',
        tooltip: 'Empleados cuyos datos sensibles todavia no han sido protegidos mediante cifrado.',
        value: String(summary?.activosNoCifrados ?? 0),
      },
      {
        title: 'Datos sin cifrar detectados',
        tooltip: 'Registros que contienen informacion sensible en formato visible y deben procesarse.',
        value: String(summary?.plaintextDetected ?? 0),
      },
      {
        title: 'Tiempo del pendiente mas antiguo (min)',
        tooltip: 'Indica cuanto tiempo lleva el proceso mas antiguo esperando ser ejecutado.',
        value: String(summary?.oldestPendingAgeMinutes ?? 0),
      },
      {
        title: 'Velocidad de procesamiento (5 min)',
        tooltip: 'Promedio de procesos completados por minuto en los ultimos 5 minutos.',
        value: String(summary?.throughputJobsPerMin5 ?? 0),
      },
      {
        title: 'Velocidad de procesamiento (15 min)',
        tooltip: 'Promedio de procesos completados por minuto en los ultimos 15 minutos.',
        value: String(summary?.throughputJobsPerMin15 ?? 0),
      },
      {
        title: 'Errores recientes (15 min)',
        tooltip: 'Cantidad total de errores en ambas colas durante los ultimos 15 minutos.',
        value: String(summary?.errorsLast15m ?? 0),
      },
      {
        title: 'Procesos atascados',
        tooltip: 'Cantidad de jobs en proceso con lock vencido o lock ausente.',
        value: String(summary?.stuckProcessing ?? 0),
      },
    ],
    [summary],
  );

  const healthStatus = useMemo(() => {
    const oldest = summary?.oldestPendingAgeMinutes ?? 0;
    const errorsLast15m = summary?.errorsLast15m ?? 0;
    const stuckProcessing = summary?.stuckProcessing ?? 0;
    if (oldest > 30 || stuckProcessing > 3) {
      return {
        color: 'error',
        label: 'Critico',
        detail: `Oldest pending=${oldest} min, errores15m=${errorsLast15m}, stuck=${stuckProcessing}.`,
      };
    }
    if (oldest > 10 || errorsLast15m > 3) {
      return {
        color: 'warning',
        label: 'Requiere revision',
        detail: `Oldest pending=${oldest} min, errores15m=${errorsLast15m}, stuck=${stuckProcessing}.`,
      };
    }
    if (oldest <= 5 && errorsLast15m === 0) {
      return {
        color: 'success',
        label: 'Saludable',
        detail: `Oldest pending=${oldest} min, errores15m=${errorsLast15m}, stuck=${stuckProcessing}.`,
      };
    }
    return {
      color: 'warning',
      label: 'Requiere revision',
      detail: `Oldest pending=${oldest} min, errores15m=${errorsLast15m}, stuck=${stuckProcessing}.`,
    };
  }, [summary]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Monitoreo</h1>
            <p className={styles.pageSubtitle}>Automatizaciones (Colas)</p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} styles={{ body: { padding: 16 } }}>
        <Collapse
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'info-monitoreo',
              label: 'Que significa este monitoreo?',
              children: (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text strong>Que estoy viendo aqui?</Text>
                  <Text>
                    Este panel muestra el estado de los procesos automaticos que garantizan que los datos de los
                    empleados esten correctamente asociados y protegidos.
                  </Text>
                  <Text>El sistema funciona en dos fases:</Text>
                  <Text>1. Identidad: se crea o valida el usuario digital del empleado.</Text>
                  <Text>2. Cifrado: se protegen los datos sensibles para cumplir estandares de seguridad.</Text>
                  <Text strong>Que significan los estados?</Text>
                  <Text>Pendiente: el proceso esta en fila para ejecutarse.</Text>
                  <Text>En proceso: actualmente se esta ejecutando.</Text>
                  <Text>Procesado: finalizo correctamente.</Text>
                  <Text>Error: ocurrio un problema que requiere revision.</Text>
                  <Text strong>Que deberia observar?</Text>
                  <Text>Si Pendientes baja progresivamente, el sistema esta trabajando.</Text>
                  <Text>Si Datos sin cifrar baja, la proteccion esta avanzando.</Text>
                  <Text>Si Pendientes no baja por varios minutos, podria existir congestion.</Text>
                </Space>
              ),
            },
          ]}
        />

        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Tabs
              activeKey={vista}
              onChange={(key) => setVista(key as 'operativo' | 'historial')}
              items={[
                { key: 'operativo', label: 'Operativo' },
                { key: 'historial', label: 'Historial de procesados' },
              ]}
            />
            <Select
              allowClear
              style={{ width: 170 }}
              placeholder="Estado"
              value={filters.estado}
              options={(vista === 'operativo' ? STATUS_OPTIONS_OPERATIVO : STATUS_OPTIONS_HISTORIAL).map((s) => ({
                label: getStatusLabel(s),
                value: s,
              }))}
              onChange={(estado) => setFilters((prev) => ({ ...prev, estado, page: 1 }))}
            />
            <InputNumber
              placeholder="ID Empleado"
              value={filters.idEmpleado}
              onChange={(idEmpleado) => setFilters((prev) => ({ ...prev, idEmpleado: idEmpleado ?? undefined, page: 1 }))}
            />
            {vista === 'operativo' ? (
              <>
                <InputNumber
                  min={0}
                  placeholder="Intentos >="
                  value={filters.attemptsMin}
                  onChange={(attemptsMin) => setFilters((prev) => ({ ...prev, attemptsMin: attemptsMin ?? 0, page: 1 }))}
                />
                <Select
                  allowClear
                  style={{ width: 160 }}
                  placeholder="Filtro de bloqueo"
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      lockedOnly: value === 'locked' ? 1 : 0,
                      stuckOnly: value === 'stuck' ? 1 : 0,
                      page: 1,
                    }))
                  }
                  options={[
                    { label: 'Solo bloqueados', value: 'locked' },
                    { label: 'Solo atascados', value: 'stuck' },
                  ]}
                />
              </>
            ) : (
              <Select
                style={{ width: 170 }}
                value={rangoHistorial}
                onChange={(value) => setRangoHistorial(value as '24h' | '7d' | '30d')}
                options={[
                  { label: 'Ultimas 24 horas', value: '24h' },
                  { label: 'Ultimos 7 dias', value: '7d' },
                  { label: 'Ultimos 30 dias', value: '30d' },
                ]}
              />
            )}
          </Space>

          <Space>
            <Text type="secondary">Actualizacion automatica 15s</Text>
            <Switch checked={autoRefresh} onChange={setAutoRefresh} />
            <Button onClick={() => void loadData()} className={styles.btnSecondary}>
              Actualizar ahora
            </Button>
            {canOperate && (
              <>
                <Button
                  className={styles.btnSecondary}
                  onClick={async () => {
                    try {
                      await rescanQueues();
                      message.success('Reanalisis ejecutado');
                      await loadData();
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'Error al reanalizar');
                    }
                  }}
                >
                  Reanalizar ahora
                </Button>
                <Button
                  className={styles.btnSecondary}
                  onClick={async () => {
                    try {
                      await releaseStuckQueues();
                      message.success('Procesos bloqueados liberados');
                      await loadData();
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : 'Error al liberar procesos bloqueados');
                    }
                  }}
                >
                  Liberar procesos bloqueados
                </Button>
              </>
            )}
          </Space>
        </Space>

        <Card size="small" style={{ marginTop: 16 }}>
          <Space direction="vertical" size={4}>
            <Text type="secondary">Semaforo de salud del sistema</Text>
            <Space>
              <Tag color={healthStatus.color}>{healthStatus.label}</Tag>
              <Text>{healthStatus.detail}</Text>
            </Space>
          </Space>
        </Card>

        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {cards.map((card) => (
            <Col key={card.title} xs={24} sm={12} md={8} lg={6}>
              <Card size="small">
                <Space size={6}>
                  <Text type="secondary">{card.title}</Text>
                  <Tooltip title={card.tooltip}>
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{card.value}</div>
              </Card>
            </Col>
          ))}
        </Row>

        <Tabs
          style={{ marginTop: 16 }}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'identity' | 'encrypt')}
          items={[
            {
              key: 'identity',
              label: `Cola de Identidad (${identityTotal})`,
              children: (
                <Table<QueueJobItem>
                  rowKey="idQueue"
                  loading={loading}
                  columns={commonColumns}
                  dataSource={identityData}
                  scroll={{ x: 1900 }}
                  pagination={{
                    current: filters.page ?? 1,
                    pageSize: filters.pageSize ?? 25,
                    total: identityTotal,
                    onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
                  }}
                />
              ),
            },
            {
              key: 'encrypt',
              label: `Cola de Cifrado (${encryptTotal})`,
              children: (
                <Table<QueueJobItem>
                  rowKey="idQueue"
                  loading={loading}
                  columns={commonColumns}
                  dataSource={encryptData}
                  scroll={{ x: 1900 }}
                  pagination={{
                    current: filters.page ?? 1,
                    pageSize: filters.pageSize ?? 25,
                    total: encryptTotal,
                    onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
                  }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
