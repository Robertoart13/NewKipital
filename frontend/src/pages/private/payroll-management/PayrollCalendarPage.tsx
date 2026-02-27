import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  Empty,
  Flex,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import { fetchPayrolls, type PayrollListItem } from '../../../api/payroll';
import styles from '../configuration/UsersManagementPage.module.css';

const { Text } = Typography;

interface CalendarEvent {
  payrollId: number;
  label: string;
  kind: 'period' | 'payment';
  status: number;
}

function toDate(value?: string | null): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.startOf('day') : null;
}

export function PayrollCalendarPage() {
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);
  const [rows, setRows] = useState<PayrollListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [panelMonth, setPanelMonth] = useState<Dayjs>(() => dayjs().startOf('month'));
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(() => {
    const active = Number(activeCompany?.id);
    if (Number.isFinite(active) && active > 0) return active;
    const first = Number(companies[0]?.id);
    return Number.isFinite(first) && first > 0 ? first : undefined;
  });

  const loadPayrolls = useCallback(async () => {
    if (!selectedCompanyId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const from = panelMonth.startOf('month').subtract(1, 'month').format('YYYY-MM-DD');
      const to = panelMonth.endOf('month').add(1, 'month').format('YYYY-MM-DD');
      const data = await fetchPayrolls(String(selectedCompanyId), showInactive, from, to, false);
      const filtered = showInactive ? data : data.filter((item) => item.estado !== 0 && item.estado !== 7);
      setRows(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el calendario de planillas.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [panelMonth, selectedCompanyId, showInactive]);

  useEffect(() => {
    void loadPayrolls();
  }, [loadPayrolls]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const push = (dateKey: string, event: CalendarEvent) => {
      const current = map.get(dateKey) ?? [];
      current.push(event);
      map.set(dateKey, current);
    };

    rows.forEach((row) => {
      const start = toDate(row.fechaInicioPeriodo);
      const end = toDate(row.fechaFinPeriodo);
      const paymentDate = toDate(row.fechaPagoProgramada);
      const name = row.nombrePlanilla?.trim() || `Planilla #${row.id}`;

      if (start && end && !start.isAfter(end, 'day')) {
        let cursor = start;
        while (!cursor.isAfter(end, 'day')) {
          push(cursor.format('YYYY-MM-DD'), {
            payrollId: row.id,
            label: name,
            kind: 'period',
            status: row.estado,
          });
          cursor = cursor.add(1, 'day');
        }
      }

      if (paymentDate) {
        push(paymentDate.format('YYYY-MM-DD'), {
          payrollId: row.id,
          label: `Pago: ${name}`,
          kind: 'payment',
          status: row.estado,
        });
      }
    });

    return map;
  }, [rows]);

  const cellRender = (value: Dayjs) => {
    const key = value.format('YYYY-MM-DD');
    const events = eventsByDate.get(key) ?? [];
    if (events.length === 0) return null;

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {events.slice(0, 2).map((event, index) => (
          <li key={`${event.payrollId}-${event.kind}-${index}`} style={{ marginBottom: 2 }}>
            <Tooltip title={event.label}>
              <Badge
                status={event.kind === 'payment' ? 'success' : 'processing'}
                text={<Text style={{ fontSize: 11 }}>{event.label}</Text>}
              />
            </Tooltip>
          </li>
        ))}
        {events.length > 2 ? (
          <li>
            <Text style={{ fontSize: 11, color: '#5b6b79' }}>+{events.length - 2} mas</Text>
          </li>
        ) : null}
      </ul>
    );
  };

  return (
    <div className={styles.pageWrapper}>
      <Card className={styles.pageCard}>
        <Flex justify="space-between" align="center" gap={16} wrap>
          <Space direction="vertical" size={0}>
            <Link to="/payroll-params/calendario/dias-pago" className={styles.backLink}>
              <ArrowLeftOutlined />
              <span>Volver al listado de planillas</span>
            </Link>
            <h1 className={styles.pageTitle}>Calendario de Nomina</h1>
            <Text type="secondary">Visualice las planillas por periodo y fecha de pago programada.</Text>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadPayrolls()} loading={loading}>
            Refrescar
          </Button>
        </Flex>
      </Card>

      <Card className={styles.filtersCard} style={{ marginTop: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12} lg={10}>
            <Select
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              value={selectedCompanyId}
              placeholder="Seleccione empresa"
              options={companies.map((company) => ({
                label: company.nombre,
                value: Number(company.id),
              }))}
              onChange={(value) => setSelectedCompanyId(value)}
            />
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Flex align="center" gap={8}>
              <Switch checked={showInactive} onChange={setShowInactive} />
              <span>Mostrar inactivas</span>
            </Flex>
          </Col>
          <Col xs={24} lg={8}>
            <Space wrap>
              <Tag icon={<CalendarOutlined />} color="processing">Periodo</Tag>
              <Tag color="success">Fecha de pago</Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className={styles.tableCard} style={{ marginTop: 16 }}>
        {error ? (
          <Alert type="error" showIcon message={error} />
        ) : null}

        <Spin spinning={loading}>
          {!selectedCompanyId ? (
            <Empty description="Seleccione una empresa para visualizar el calendario." />
          ) : rows.length === 0 ? (
            <Empty description="No hay planillas para el periodo seleccionado." />
          ) : (
            <Calendar
              value={panelMonth}
              onPanelChange={(date) => setPanelMonth(date.startOf('month'))}
              cellRender={cellRender}
              fullscreen
            />
          )}
        </Spin>
      </Card>
    </div>
  );
}
