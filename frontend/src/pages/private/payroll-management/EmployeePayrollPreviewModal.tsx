import { useMemo } from 'react';

import { Button, Modal, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import type {
  PayrollListItem,
  PayrollPreviewActionRow,
  PayrollPreviewEmployeeRow,
} from '../../../api/payroll';
import genStyles from './PayrollGeneratePage.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  employee: PayrollPreviewEmployeeRow | null;
  payroll: PayrollListItem | null;
  companyName: string;
  canViewSensitive: boolean;
};

function formatDate(value?: string | null): string {
  if (!value) return '--';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD/MM/YYYY') : '--';
}

function formatMoney(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function toBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'si', 'yes'].includes(value.trim().toLowerCase());
  }
  return false;
}

const PAYROLL_STATE_LABEL: Record<number, string> = {
  0: 'Inactiva',
  1: 'Abierta',
  2: 'En Proceso',
  3: 'Verificada',
  4: 'Aplicada',
  5: 'Contabilizada',
  6: 'Notificada',
  7: 'Inactiva',
};

function normalizeText(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isApprovedStatus(status?: string | null): boolean {
  return normalizeText(status).includes('aprob');
}

function isCcssCategory(category?: string | null): boolean {
  return normalizeText(category).includes('carga social');
}

const actionColumnsForModal = (
  canViewSensitive: boolean,
): ColumnsType<PayrollPreviewActionRow> => [
  { title: 'Categoría', dataIndex: 'categoria' },
  { title: 'Tipo de Acción', dataIndex: 'tipoAccion' },
  {
    title: 'Monto',
    dataIndex: 'monto',
    align: 'right',
    render: (value: string) =>
      canViewSensitive ? `₡ ${formatMoney(value)}` : '***',
  },
  {
    title: 'Tipo (+/-)',
    dataIndex: 'tipoSigno',
    align: 'center',
    width: 90,
  },
  {
    title: 'Estado',
    dataIndex: 'estado',
    align: 'center',
  },
];

export function EmployeePayrollPreviewModal({
  open,
  onClose,
  employee,
  payroll,
  companyName,
  canViewSensitive,
}: Props) {
  const visible = open && !!employee && !!payroll;
  const approvedActions = useMemo(() => {
    if (!employee?.acciones?.length) return [];

    return employee.acciones
      .map((action) =>
        isCcssCategory(action.categoria)
          ? { ...action, estado: 'Aprobada' }
          : action,
      )
      .filter(
        (action) => isApprovedStatus(action.estado) || isCcssCategory(action.categoria),
      )
      .sort((a, b) => {
        const categoryDiff = normalizeText(a.categoria).localeCompare(
          normalizeText(b.categoria),
          'es',
        );
        if (categoryDiff !== 0) return categoryDiff;

        return normalizeText(a.tipoAccion).localeCompare(
          normalizeText(b.tipoAccion),
          'es',
        );
      });
  }, [employee?.acciones]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1100}
      title={null}
      destroyOnHidden
    >
      {!visible || !employee || !payroll ? null : (
        <div className={genStyles.employeePreviewModal}>
          {/* Barra superior como en la referencia */}
          <div className={genStyles.employeePreviewTopBar}>
            Previsualización de Pago de Salario
          </div>

          {/* Encabezado empresa + bloque periodo de pago */}
          <div className={genStyles.employeePreviewHeaderRow}>
            <div className={genStyles.employeePreviewHeaderLeft}>
              <div className={genStyles.employeePreviewCompany}>{companyName}</div>
            </div>
            <div className={genStyles.employeePreviewHeaderRight}>
              <div className={genStyles.employeePreviewHeaderRightTitle}>
                Previsualización de Pago de Salario
              </div>
              <div className={genStyles.employeePreviewPayrollInline}>
                Periodo de pago:&nbsp;
                {formatDate(payroll.fechaInicioPeriodo)} -{' '}
                {formatDate(payroll.fechaFinPeriodo)}
              </div>
            </div>
          </div>

          <div className={genStyles.employeePreviewDivider} />

          {/* Información del empleado en dos columnas, similar al diseño original */}
          <div className={genStyles.employeePreviewInfoGrid}>
            <div className={genStyles.employeePreviewInfoCol}>
              <div>
                <strong>Código:</strong> {employee.codigoEmpleado}
              </div>
              <div>
                <strong>Moneda:</strong> {payroll.moneda ?? '--'}
              </div>
              <div>
                <strong>Tipo planilla:</strong> {payroll.tipoPlanilla ?? 'Regular'}
              </div>
              <div>
                <strong>Estado planilla:</strong>{' '}
                {PAYROLL_STATE_LABEL[payroll.estado] ?? `Estado ${payroll.estado}`}
              </div>
            </div>
            <div className={genStyles.employeePreviewInfoCol}>
              <div>
                <strong>Nombre:</strong> {employee.nombreEmpleado}
              </div>
              <div>
                <strong>Días trabajados:</strong> {employee.dias}
              </div>
              <div>
                <strong>Incluido en planilla:</strong>{' '}
                {toBooleanFlag(employee.seleccionadoPlanilla) ? 'Sí' : 'No'}
              </div>
              <div>
                <strong>Verificado:</strong>{' '}
                {toBooleanFlag(employee.verificadoEmpleado) ? 'Sí' : 'No'}
              </div>
            </div>
          </div>

          {/* Resumen de planilla del empleado */}
          <div className={genStyles.employeePreviewSection}>
            <div className={genStyles.employeePreviewSectionTitle}>
              Resumen de Planilla
            </div>
            <table className={genStyles.employeePreviewSummaryTable}>
              <thead>
                <tr>
                  <th>Salario base</th>
                  <th>Salario quincenal Bruto</th>
                  <th>Devengado (días)</th>
                  <th>Cargas sociales</th>
                  <th>Impuesto Renta</th>
                  <th className={genStyles.employeePreviewSummaryNetHeader}>
                    Monto Neto
                  </th>
                  <th>Días</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{canViewSensitive ? `₡ ${formatMoney(employee.salarioBase)}` : '***'}</td>
                  <td>
                    {canViewSensitive
                      ? `₡ ${formatMoney(employee.salarioBrutoPeriodo)}`
                      : '***'}
                  </td>
                  <td>
                    {canViewSensitive
                      ? `₡ ${formatMoney(employee.devengadoMonto)}`
                      : '***'}
                  </td>
                  <td>
                    {canViewSensitive
                      ? `₡ ${formatMoney(employee.cargasSociales)}`
                      : '***'}
                  </td>
                  <td>
                    {canViewSensitive
                      ? `₡ ${formatMoney(employee.impuestoRenta)}`
                      : '***'}
                  </td>
                  <td className={genStyles.employeePreviewSummaryNetCell}>
                    {canViewSensitive
                      ? `₡ ${formatMoney(employee.totalNeto)}`
                      : '***'}
                  </td>
                  <td>{employee.dias}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detalle de acciones de personal */}
          <div className={genStyles.employeePreviewSection}>
            <div className={genStyles.employeePreviewSectionTitle}>
              Detalle de acciones de personal
            </div>
            <Table<PayrollPreviewActionRow>
              rowKey={(a) =>
                `${employee.idEmpleado}-${a.idAccion ?? 'na'}-${a.categoria}-${a.tipoAccion}-${a.monto}-${a.estado}-${a.tipoSigno}`
              }
              dataSource={approvedActions}
              columns={actionColumnsForModal(canViewSensitive)}
              size="small"
              pagination={false}
              className={`${genStyles.previewTable} ${genStyles.actionsTable}`}
              scroll={{ y: 320 }}
            />
          </div>

          {/* Footer informativo */}
          <div className={genStyles.employeePreviewFooter}>
            <div className={genStyles.employeePreviewFooterTitle}>
              {payroll.nombrePlanilla?.trim() ??
                `Planilla ${PAYROLL_STATE_LABEL[payroll.estado] ?? payroll.estado}`}
            </div>
            <div className={genStyles.employeePreviewFooterHint}>
              Importante: Este documento es una previsualización de la planilla, no se puede
              utilizar como comprobante de pago.
            </div>
            <div className={genStyles.employeePreviewFooterActions}>
              <Button type="primary" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

