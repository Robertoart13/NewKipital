import { DownloadOutlined, QuestionCircleOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  type UploadProps,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';


import { fetchPayrolls, type PayrollListItem } from '../../../api/payroll';
import {
  commitOvertimeBulkUpload,
  fetchOvertimeBulkTemplateData,
  previewOvertimeBulkUpload,
  type OvertimeBulkPreviewResponse,
  type OvertimeBulkPreviewRowPayload,
  type OvertimeBulkTemplateDataResponse,
} from '../../../api/personalActions';
import { useAppSelector } from '../../../store/hooks';
import styles from '../configuration/UsersManagementPage.module.css';

import type { ColumnsType } from 'antd/es/table';

type PreviewRow = OvertimeBulkPreviewResponse['filas'][number];
type EditablePreviewRow = PreviewRow & {
  movimientoIdEditable: number | null;
  tipoJornadaEditable: '6' | '7' | '8' | null;
};

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mapJornadaToCode(raw: string): '6' | '7' | '8' | undefined {
  const value = raw.trim().toLowerCase();
  if (!value) return undefined;
  if (value === '6' || value.includes('nocturna')) return '6';
  if (value === '7' || value.includes('mixta')) return '7';
  if (value === '8' || value.includes('diurna')) return '8';
  return undefined;
}

function parseDateToIsoInput(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 25569) {
    const millis = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const text = String(value).trim();
  if (!text) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const crMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (crMatch) {
    const day = Number(crMatch[1]);
    const month = Number(crMatch[2]);
    const year = Number(crMatch[3]);
    if (day > 0 && month > 0 && month <= 12 && year > 1900) {
      return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return undefined;
}

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getStatusTag(status: PreviewRow['estadoLinea']) {
  if (status === 'VALIDA') return <Tag color="green">Valida</Tag>;
  if (status === 'NO_PROCESABLE') return <Tag color="gold">No procesable</Tag>;
  if (status === 'ERROR_BLOQUEANTE') return <Tag color="red">Error bloqueante</Tag>;
  return <Tag>Procesada</Tag>;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function PayrollOvertimeBulkUploadPage() {
  const { message, modal } = AntdApp.useApp();
  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);
  const canViewSensitive = useAppSelector(
    (state) =>
      state.permissions.permissions.includes('payroll:view_sensitive') ||
      state.permissions.permissions.includes('employee:view-sensitive'),
  );

  const [companyId, setCompanyId] = useState<number | undefined>(undefined);
  const [payrollId, setPayrollId] = useState<number | undefined>(undefined);
  const [payrolls, setPayrolls] = useState<PayrollListItem[]>([]);
  const [loadingPayrolls, setLoadingPayrolls] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateData, setTemplateData] = useState<OvertimeBulkTemplateDataResponse | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [preview, setPreview] = useState<OvertimeBulkPreviewResponse | null>(null);
  const [editableRows, setEditableRows] = useState<EditablePreviewRow[]>([]);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [lastFileMeta, setLastFileMeta] = useState<{ fileName: string; fileHashSha256: string } | null>(null);
  const [commitRunning, setCommitRunning] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  useEffect(() => {
    if (companyId != null) return;
    const active = Number(activeCompany?.id);
    if (Number.isInteger(active) && active > 0) {
      setCompanyId(active);
      return;
    }
    const first = Number(companies[0]?.id);
    if (Number.isInteger(first) && first > 0) setCompanyId(first);
  }, [activeCompany?.id, companies, companyId]);

  const loadPayrolls = useCallback(async () => {
    if (!companyId) {
      setPayrolls([]);
      setPayrollId(undefined);
      setTemplateData(null);
      return;
    }
    setLoadingPayrolls(true);
    try {
      const rows = await fetchPayrolls(String(companyId), false, undefined, undefined, false, [1, 2]);
      setPayrolls(rows ?? []);
      if (rows.length === 0) {
        setPayrollId(undefined);
        setTemplateData(null);
        return;
      }
      if (!rows.some((row) => Number(row.id) === Number(payrollId))) {
        setPayrollId(Number(rows[0].id));
      }
    } catch (error) {
      setPayrolls([]);
      setPayrollId(undefined);
      setTemplateData(null);
      message.error(error instanceof Error ? error.message : 'No se pudieron cargar planillas');
    } finally {
      setLoadingPayrolls(false);
    }
  }, [companyId, payrollId, message]);

  useEffect(() => {
    void loadPayrolls();
  }, [loadPayrolls]);

  const loadTemplateData = useCallback(async () => {
    if (!companyId || !payrollId) {
      setTemplateData(null);
      return;
    }
    setLoadingTemplate(true);
    try {
      const result = await fetchOvertimeBulkTemplateData(companyId, payrollId);
      setTemplateData(result);
    } catch (error) {
      setTemplateData(null);
      message.error(error instanceof Error ? error.message : 'No se pudieron cargar datos de plantilla');
    } finally {
      setLoadingTemplate(false);
    }
  }, [companyId, payrollId, message]);

  useEffect(() => {
    void loadTemplateData();
  }, [loadTemplateData]);

  const movementByName = useMemo(() => {
    const map = new Map<string, number>();
    (templateData?.movimientos ?? []).forEach((item) => map.set(normalizeHeader(item.nombre), Number(item.id)));
    return map;
  }, [templateData?.movimientos]);

  const movementById = useMemo(() => {
    const map = new Map<number, (OvertimeBulkTemplateDataResponse['movimientos'])[number]>();
    (templateData?.movimientos ?? []).forEach((item) => map.set(Number(item.id), item));
    return map;
  }, [templateData?.movimientos]);

  const formatMoney = useCallback(
    (value: number | null | undefined): string => {
      if (value == null || !Number.isFinite(Number(value))) return '--';
      const currency = String(templateData?.payroll?.moneda ?? 'CRC').toUpperCase();
      try {
        return new Intl.NumberFormat('es-CR', {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(value));
      } catch {
        return new Intl.NumberFormat('es-CR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(value));
      }
    },
    [templateData?.payroll?.moneda],
  );

  const calculateLocalOvertime = useCallback(
    (row: EditablePreviewRow): { montoCalculado: number | null; formulaCalculada: string | null; valorHora: number | null } => {
      if (!templateData) {
        return { montoCalculado: row.montoCalculado, formulaCalculada: row.formulaCalculada, valorHora: null };
      }

      const salaryBase = Number(row.salarioBase ?? 0);
      const qty = Number(row.cantidadHoras ?? 0);
      const movementId = Number(row.movimientoIdEditable ?? 0);
      const movement = movementById.get(movementId);
      const jornada = Number(row.tipoJornadaEditable ?? row.tipoJornada ?? 0);

      if (!movement || !salaryBase || !qty || !jornada) {
        return { montoCalculado: row.montoCalculado, formulaCalculada: row.formulaCalculada, valorHora: null };
      }

      const montoFijo = Number(movement.montoFijo ?? 0);
      const porcentaje = Number(movement.porcentaje ?? 0);

      if (Number(movement.esMontoFijo ?? 0) === 1 && montoFijo > 0) {
        const monto = round2(Math.round(montoFijo * qty));
        return {
          montoCalculado: monto,
          formulaCalculada: `Monto fijo: ${montoFijo} x ${qty}`,
          valorHora: round2(salaryBase / 30 / jornada),
        };
      }

      if (porcentaje > 0) {
        const porcentajeDecimal = porcentaje / 100;
        if (Number(templateData.payroll.idPeriodoPago) === 8 || Number(templateData.payroll.idPeriodoPago) === 11) {
          const monto = Math.round(round2(salaryBase * porcentajeDecimal * qty));
          return {
            montoCalculado: monto,
            formulaCalculada: `${round2(salaryBase)} x ${porcentaje}% x ${qty}`,
            valorHora: round2(salaryBase / 30 / jornada),
          };
        }

        const valorHora = salaryBase / 30 / jornada;
        const monto = Math.round(round2(valorHora * porcentajeDecimal * qty));
        return {
          montoCalculado: monto,
          formulaCalculada: `(${round2(salaryBase)}/30)/${jornada} x ${porcentaje}% x ${qty}`,
          valorHora: round2(valorHora),
        };
      }

      return {
        montoCalculado: 0,
        formulaCalculada: 'Sin configuracion de calculo',
        valorHora: round2(salaryBase / 30 / jornada),
      };
    },
    [movementById, templateData],
  );

  const parseExcelRows = useCallback(
    async (file: File): Promise<OvertimeBulkPreviewRowPayload[]> => {
      const XlsxPopulate = (await import('xlsx-populate')).default;
      const workbook = await XlsxPopulate.fromDataAsync(await file.arrayBuffer());
      const sheet = workbook.sheet('Empleados') ?? workbook.sheet(0);
      const usedRange = sheet.usedRange();
      if (!usedRange) return [];

      const values = usedRange.value() as unknown[] | unknown[][];
      const matrix = Array.isArray(values[0]) ? (values as unknown[][]) : [values as unknown[]];
      if (matrix.length < 2) return [];

      const headers = matrix[0].map((col) => normalizeHeader(String(col ?? '')));
      const columnIndex: Record<string, number> = {};
      headers.forEach((header, idx) => {
        columnIndex[header] = idx;
      });

      const idxNombre = columnIndex['nombre completo'];
      const idxCodigo = columnIndex['codigo empleado'];
      const idxMovimiento = columnIndex['movimiento'];
      const idxJornada = columnIndex['tipo de jornada'] ?? columnIndex['tipo jornada'];
      const idxHoras = columnIndex['cantidad de horas'] ?? columnIndex['horas'];
      const idxFechaInicio =
        columnIndex['fecha inicio hora extra'] ??
        columnIndex['fecha inicio'] ??
        columnIndex['fecha inicial'] ??
        columnIndex['fecha inicio extra'];
      const idxFechaFin =
        columnIndex['fecha fin hora extra'] ??
        columnIndex['fecha fin'] ??
        columnIndex['fecha final'] ??
        columnIndex['fecha fin extra'];

      const parsed: OvertimeBulkPreviewRowPayload[] = [];
      for (let i = 1; i < matrix.length; i += 1) {
        const row = matrix[i];
        const rawCodigo = idxCodigo != null ? String(row[idxCodigo] ?? '').trim() : '';
        const rawNombre = idxNombre != null ? String(row[idxNombre] ?? '').trim() : '';
        const rawMovimiento = idxMovimiento != null ? row[idxMovimiento] : undefined;
        const rawJornada = idxJornada != null ? String(row[idxJornada] ?? '').trim() : '';
        const rawHoras = idxHoras != null ? Number(row[idxHoras] ?? 0) : 0;
        const normalizedHoras = Number.isFinite(rawHoras) ? Math.abs(Math.trunc(rawHoras)) : 0;
        const rawFechaInicio = idxFechaInicio != null ? row[idxFechaInicio] : undefined;
        const rawFechaFin = idxFechaFin != null ? row[idxFechaFin] : undefined;

        const isEmpty =
          !rawCodigo && !rawNombre && !rawMovimiento && !rawJornada && !rawHoras && !rawFechaInicio && !rawFechaFin;
        if (isEmpty) continue;

        let movimientoId: number | undefined;
        if (typeof rawMovimiento === 'number' && Number.isInteger(rawMovimiento) && rawMovimiento > 0) {
          movimientoId = rawMovimiento;
        } else {
          const normalizedMovement = normalizeHeader(String(rawMovimiento ?? '')).replace(/\s+/g, ' ');
          if (normalizedMovement) {
            movimientoId = movementByName.get(normalizedMovement);
            if (!movimientoId) {
              const compactInput = normalizedMovement.replace(/[^a-z0-9]/g, '');
              for (const [key, value] of movementByName.entries()) {
                const compactKey = key.replace(/[^a-z0-9]/g, '');
                if (compactKey === compactInput) {
                  movimientoId = value;
                  break;
                }
              }
            }
          }
        }

        const fechaInicio = parseDateToIsoInput(rawFechaInicio);
        const fechaFin = parseDateToIsoInput(rawFechaFin);

        parsed.push({
          rowNumber: i + 1,
          nombreCompleto: rawNombre || undefined,
          codigoEmpleado: rawCodigo,
          movimientoId,
          tipoJornadaHorasExtras: mapJornadaToCode(rawJornada),
          cantidadHoras: normalizedHoras,
          fechaInicioHoraExtra: fechaInicio ?? '',
          fechaFinHoraExtra: fechaFin,
        });
      }
      return parsed;
    },
    [movementByName],
  );

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xlsm,.xls',
    maxCount: 1,
    beforeUpload: (file) => {
      setSelectedFile(file as File);
      setPreview(null);
      setEditableRows([]);
      setPreviewDirty(false);
      setLastFileMeta(null);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
      setPreview(null);
      setEditableRows([]);
      setPreviewDirty(false);
      setLastFileMeta(null);
    },
    fileList: selectedFile
      ? [
          {
            uid: selectedFile.name,
            name: selectedFile.name,
            status: 'done',
          },
        ]
      : [],
  };

  const handleDownloadTemplate = useCallback(async () => {
    if (!templateData) {
      message.warning('Seleccione empresa y planilla para generar la plantilla.');
      return;
    }

    setDownloadingTemplate(true);
    try {
      const XlsxPopulate = (await import('xlsx-populate')).default;
      const workbook = await XlsxPopulate.fromBlankAsync();

      const empleadosSheet = workbook.sheet(0);
      empleadosSheet.name('Empleados');
      const movimientosSheet = workbook.addSheet('Movimientos');
      const jornadasSheet = workbook.addSheet('TiposJornada');

      empleadosSheet.cell('A1').value([
        [
          'Nombre Completo',
          'Código Empleado',
          'Movimiento',
          'Tipo de Jornada',
          'Cantidad de Horas',
          'Fecha inicio',
          'Fecha fin',
        ],
      ]);
      const empleadosRows = templateData.empleados.map((item) => [
        item.nombreCompleto,
        item.codigoEmpleado,
        '',
        '',
        0,
        '',
        '',
      ]);
      if (empleadosRows.length > 0) {
        empleadosSheet.cell('A2').value(empleadosRows);
      }
      empleadosSheet.column('A').width(32);
      empleadosSheet.column('B').width(22);
      empleadosSheet.column('C').width(28);
      empleadosSheet.column('D').width(22);
      empleadosSheet.column('E').width(18);
      empleadosSheet.column('F').width(16);
      empleadosSheet.column('G').width(16);
      empleadosSheet.row(1).style('bold', true);

      movimientosSheet.cell('A1').value([
        [
          'id_tipo_movimiento',
          'nombre_tipo_movimiento',
          'porcentaje_tipo_movimiento',
          'monto_fijo_tipo_movimiento',
        ],
      ]);
      const movementRows = templateData.movimientos.map((item) => [
        item.id,
        item.nombre,
        Number(item.porcentaje ?? 0),
        Number(item.montoFijo ?? 0),
      ]);
      if (movementRows.length > 0) {
        movimientosSheet.cell('A2').value(movementRows);
      }
      movimientosSheet.column('A').width(20);
      movimientosSheet.column('B').width(42);
      movimientosSheet.column('C').width(24);
      movimientosSheet.column('D').width(24);
      movimientosSheet.row(1).style('bold', true);

      jornadasSheet.cell('A1').value([['Horas', 'Tipo de Jornada']]);
      jornadasSheet.cell('A2').value([
        [6, 'Nocturna (6 horas)'],
        [7, 'Mixta (7 horas)'],
        [8, 'Diurna (8 horas)'],
      ]);
      jornadasSheet.column('A').width(12);
      jornadasSheet.column('B').width(26);
      jornadasSheet.row(1).style('bold', true);

      // Data validations para facilitar carga correcta en Excel.
      // C = Movimiento, D = Tipo de Jornada.
      const validationStartRow = 2;
      const validationEndRow = Math.max(empleadosRows.length + 200, 500);
      const movementLastRow = Math.max(movementRows.length + 1, 2);
      const movementFormula = `'Movimientos'!$B$2:$B$${movementLastRow}`;
      const jornadaFormula = `'TiposJornada'!$B$2:$B$4`;

      empleadosSheet
        .range(`C${validationStartRow}:C${validationEndRow}`)
        .dataValidation({
          type: 'list',
          allowBlank: true,
          showInputMessage: true,
          promptTitle: 'Movimiento',
          prompt: 'Seleccione un movimiento válido de la hoja Movimientos.',
          showErrorMessage: true,
          errorTitle: 'Valor no válido',
          error: 'Debe seleccionar un movimiento existente en la lista.',
          formula1: movementFormula,
        });

      empleadosSheet
        .range(`D${validationStartRow}:D${validationEndRow}`)
        .dataValidation({
          type: 'list',
          allowBlank: true,
          showInputMessage: true,
          promptTitle: 'Tipo de jornada',
          prompt: 'Seleccione una opción válida de la hoja TiposJornada.',
          showErrorMessage: true,
          errorTitle: 'Valor no válido',
          error: 'Debe seleccionar una jornada existente en la lista.',
          formula1: jornadaFormula,
        });

      const blob = await workbook.outputAsync();
      const fileDate = new Date().toISOString().slice(0, 10);
      const fileName = `${templateData.payroll.nombrePlanilla || 'Planilla'}_${fileDate}.xlsx`
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '_');

      if (window.navigator && 'msSaveOrOpenBlob' in window.navigator) {
        (
          window.navigator as unknown as {
            msSaveOrOpenBlob: (data: Blob, name: string) => void;
          }
        ).msSaveOrOpenBlob(blob, fileName);
      } else {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        document.body.appendChild(anchor);
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(anchor);
      }

      message.success('Plantilla Excel descargada correctamente.');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No se pudo descargar la plantilla Excel.');
    } finally {
      setDownloadingTemplate(false);
    }
  }, [templateData, message]);

  const handlePreview = useCallback(async () => {
    if (!companyId || !payrollId) {
      message.warning('Debe seleccionar empresa y planilla.');
      return;
    }

    const shouldUseEditedRows = previewDirty && editableRows.length > 0;
    if (!shouldUseEditedRows && !selectedFile) {
      message.warning('Debe seleccionar un archivo Excel.');
      return;
    }

    setUploadingPreview(true);
    try {
      let rows: OvertimeBulkPreviewRowPayload[] = [];
      let fileName = selectedFile?.name ?? lastFileMeta?.fileName ?? '';
      let fileHashSha256 = lastFileMeta?.fileHashSha256 ?? '';

      if (shouldUseEditedRows) {
        rows = editableRows.map((row) => ({
          rowNumber: Number(row.rowNumber),
          nombreCompleto: row.nombreCompleto ?? undefined,
          codigoEmpleado: row.codigoEmpleado,
          movimientoId: row.movimientoIdEditable ?? undefined,
          tipoJornadaHorasExtras: row.tipoJornadaEditable ?? undefined,
          cantidadHoras: Number(row.cantidadHoras ?? 0),
          fechaInicioHoraExtra: row.fechaInicioHoraExtra ?? '',
          fechaFinHoraExtra: row.fechaFinHoraExtra ?? undefined,
        }));
      } else {
        rows = await parseExcelRows(selectedFile as File);
        fileHashSha256 = await sha256Hex(selectedFile as File);
        fileName = (selectedFile as File).name;
      }

      if (rows.length === 0) {
        message.warning('El archivo no contiene filas procesables en la hoja Empleados.');
        setPreview(null);
        setEditableRows([]);
        setPreviewDirty(false);
        return;
      }

      if (!fileName || !fileHashSha256) {
        message.warning('No se pudo identificar el archivo fuente. Cárguelo nuevamente.');
        return;
      }

      const result = await previewOvertimeBulkUpload({
        idEmpresa: companyId,
        payrollId,
        fileName,
        fileHashSha256,
        rows,
      });

      setPreview(result);
      setLastFileMeta({ fileName, fileHashSha256 });
      setEditableRows(
        result.filas.map((line) => ({
          ...line,
          movimientoIdEditable: line.movimientoId,
          tipoJornadaEditable: line.tipoJornada,
        })),
      );
      setPreviewDirty(false);
      message.success(`Preview generado: ${result.resumen.mensaje}`);
    } catch (error) {
      setPreview(null);
      setEditableRows([]);
      message.error(error instanceof Error ? error.message : 'No se pudo generar preview.');
    } finally {
      setUploadingPreview(false);
    }
  }, [
    companyId,
    payrollId,
    selectedFile,
    previewDirty,
    editableRows,
    parseExcelRows,
    message,
    lastFileMeta?.fileHashSha256,
    lastFileMeta?.fileName,
  ]);

  const handleCommit = useCallback(async () => {
    if (!companyId || !payrollId || !preview?.uploadPublicId) {
      message.warning('Primero debe generar el preview.');
      return;
    }
    modal.confirm({
      title: 'Confirmar carga masiva',
      content: `Se crearan acciones de horas extras en estado Aprobada solo para filas validas del preview (${preview.resumen.validas}). Filas con error bloqueante (${preview.resumen.errorBloqueante}) o no procesables (${preview.resumen.noProcesables}) no se cargaran. Desea continuar?`,
      icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
      okText: 'Si, confirmar',
      cancelText: 'Cancelar',
      centered: true,
      width: 420,
      rootClassName: styles.companyConfirmModal,
      okButtonProps: { className: styles.companyConfirmOk },
      cancelButtonProps: { className: styles.companyConfirmCancel },
      onOk: async () => {
        setCommitRunning(true);
        try {
          let previewToCommit = preview;
          if (previewDirty) {
            if (!lastFileMeta?.fileHashSha256 || !lastFileMeta?.fileName) {
              message.error('No se pudo validar cambios locales. Cargue archivo y genere preview de nuevo.');
              return;
            }
            const rows: OvertimeBulkPreviewRowPayload[] = editableRows.map((row) => ({
              rowNumber: Number(row.rowNumber),
              nombreCompleto: row.nombreCompleto ?? undefined,
              codigoEmpleado: row.codigoEmpleado,
              movimientoId: row.movimientoIdEditable ?? undefined,
              tipoJornadaHorasExtras: row.tipoJornadaEditable ?? undefined,
              cantidadHoras: Number(row.cantidadHoras ?? 0),
              fechaInicioHoraExtra: row.fechaInicioHoraExtra ?? '',
              fechaFinHoraExtra: row.fechaFinHoraExtra ?? undefined,
            }));

            previewToCommit = await previewOvertimeBulkUpload({
              idEmpresa: companyId,
              payrollId,
              fileName: lastFileMeta.fileName,
              fileHashSha256: lastFileMeta.fileHashSha256,
              rows,
            });
            setPreview(previewToCommit);
            setEditableRows(
              previewToCommit.filas.map((line) => ({
                ...line,
                movimientoIdEditable: line.movimientoId,
                tipoJornadaEditable: line.tipoJornada,
              })),
            );
            setPreviewDirty(false);
          }

          if (previewToCommit.resumen.validas === 0) {
            message.error('No se puede confirmar: no hay filas válidas para procesar.');
            return;
          }

          const result = await commitOvertimeBulkUpload({
            uploadPublicId: previewToCommit.uploadPublicId,
            idEmpresa: companyId,
            payrollId,
          });
          message.success(result.message);
          await loadTemplateData();
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'No se pudo confirmar la carga masiva.');
        } finally {
          setCommitRunning(false);
        }
      },
    });
  }, [
    companyId,
    payrollId,
    preview,
    previewDirty,
    editableRows,
    lastFileMeta?.fileHashSha256,
    lastFileMeta?.fileName,
    message,
    modal,
    loadTemplateData,
  ]);

  const updateEditableRow = useCallback(
    (
      rowKey: string,
      patch: Partial<Pick<EditablePreviewRow, 'movimientoIdEditable' | 'tipoJornadaEditable'>>,
    ) => {
      const recomputeRow = (baseRow: EditablePreviewRow): EditablePreviewRow => {
        const localCalc = calculateLocalOvertime(baseRow);
        return {
          ...baseRow,
          movimientoNombre:
            movementById.get(Number(baseRow.movimientoIdEditable ?? 0))?.nombre ?? baseRow.movimientoNombre,
          tipoJornada: baseRow.tipoJornadaEditable ?? baseRow.tipoJornada,
          montoCalculado: localCalc.montoCalculado,
          formulaCalculada: localCalc.formulaCalculada,
        };
      };

      setEditableRows((prev) =>
        prev.map((row) => {
          const currentKey = `${row.rowNumber}-${row.codigoEmpleado}`;
          if (currentKey !== rowKey) return row;
          return recomputeRow({ ...row, ...patch });
        }),
      );
      setPreviewDirty(true);
    },
    [calculateLocalOvertime, movementById],
  );

  const columns = useMemo<ColumnsType<EditablePreviewRow>>(
    () => [
      {
        title: 'Fila',
        dataIndex: 'rowNumber',
        width: 80,
      },
      {
        title: 'Empleado',
        dataIndex: 'nombreCompleto',
        render: (_value, row) => (
          <div>
            <div style={{ fontWeight: 600 }}>{row.nombreCompleto || '--'}</div>
            <div style={{ color: '#6b7a85' }}>{row.codigoEmpleado}</div>
          </div>
        ),
      },
      {
        title: 'Movimiento',
        dataIndex: 'movimientoIdEditable',
        render: (_value, row) => {
          const rowKey = `${row.rowNumber}-${row.codigoEmpleado}`;
          return (
            <Select
              style={{ minWidth: 240 }}
              placeholder="Seleccione movimiento"
              value={row.movimientoIdEditable ?? undefined}
              options={(templateData?.movimientos ?? []).map((item) => ({
                value: Number(item.id),
                label: item.nombre,
              }))}
              onChange={(value) =>
                updateEditableRow(rowKey, {
                  movimientoIdEditable: Number(value),
                })
              }
              disabled={uploadingPreview || commitRunning}
            />
          );
        },
      },
      {
        title: 'Jornada',
        dataIndex: 'tipoJornadaEditable',
        render: (_value, row) => {
          const rowKey = `${row.rowNumber}-${row.codigoEmpleado}`;
          return (
            <Select
              style={{ minWidth: 180 }}
              placeholder="Seleccione jornada"
              value={row.tipoJornadaEditable ?? undefined}
              options={(templateData?.tiposJornada ?? []).map((item) => ({
                value: item.id,
                label: item.nombre,
              }))}
              onChange={(value) =>
                updateEditableRow(rowKey, {
                  tipoJornadaEditable: (value as '6' | '7' | '8') ?? null,
                })
              }
              disabled={uploadingPreview || commitRunning}
            />
          );
        },
      },
      {
        title: 'Horas',
        dataIndex: 'cantidadHoras',
        width: 100,
        align: 'right',
      },
      {
        title: 'Salario Base',
        dataIndex: 'salarioBase',
        width: 190,
        align: 'right',
        render: (_value, row) => {
          const horas = Number(row.tipoJornadaEditable ?? row.tipoJornada ?? 0);
          const salario = Number(row.salarioBase ?? 0);
          const valorHora = horas > 0 ? salario / 30 / horas : null;
          if (!canViewSensitive) {
            return (
              <div
                style={{
                  backgroundColor: '#eaf3fb',
                  borderRadius: 6,
                  padding: '8px 10px',
                  border: '1px solid #d8e9f8',
                }}
              >
                <div style={{ fontWeight: 600 }}>***</div>
                <div style={{ color: '#6b7a85', fontStyle: 'italic' }}>*** / hora</div>
              </div>
            );
          }
          return (
            <div
              style={{
                backgroundColor: '#eaf3fb',
                borderRadius: 6,
                padding: '8px 10px',
                border: '1px solid #d8e9f8',
              }}
            >
              <div style={{ fontWeight: 600 }}>{formatMoney(row.salarioBase)}</div>
              <div style={{ color: '#6b7a85', fontStyle: 'italic' }}>
                {valorHora != null && Number.isFinite(valorHora) ? `${formatMoney(valorHora)} / hora` : '--'}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Monto Calculado',
        dataIndex: 'montoCalculado',
        width: 140,
        align: 'right',
        render: (value) => (
          <div
            style={{
              backgroundColor: '#eef9f2',
              borderRadius: 6,
              padding: '8px 10px',
              border: '1px solid #cdeed9',
              color: '#0b6e3e',
              fontWeight: 700,
            }}
          >
            {formatMoney(value)}
          </div>
        ),
      },
      {
        title: 'Fórmula Usada',
        dataIndex: 'formulaCalculada',
        width: 260,
        render: (value) => (
          <div style={{ color: '#485666', fontFamily: 'monospace' }}>
            {canViewSensitive ? value || '--' : '***'}
          </div>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'estadoLinea',
        width: 160,
        render: (value) => getStatusTag(value),
      },
      {
        title: 'Mensaje',
        dataIndex: 'mensajeLinea',
        render: (value) => (
          <div style={{ whiteSpace: 'pre-line' }}>
            {value || '--'}
          </div>
        ),
      },
    ],
    [
      canViewSensitive,
      commitRunning,
      formatMoney,
      templateData?.movimientos,
      templateData?.tiposJornada,
      updateEditableRow,
      uploadingPreview,
    ],
  );

  const disabledCommit =
    !preview || (previewDirty ? editableRows.length === 0 : preview.resumen.validas === 0);

  const sortedEditableRows = useMemo(() => {
    const priority: Record<string, number> = {
      VALIDA: 1,
      NO_PROCESABLE: 2,
      ERROR_BLOQUEANTE: 3,
      PROCESADA: 4,
    };
    return [...editableRows].sort((a, b) => {
      const pa = priority[a.estadoLinea] ?? 99;
      const pb = priority[b.estadoLinea] ?? 99;
      if (pa !== pb) return pa - pb;
      return Number(a.rowNumber) - Number(b.rowNumber);
    });
  }, [editableRows]);

  return (
    <div className={styles.pageWrapper}>
      <Card className={styles.mainCard} style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          Carga masiva de horas extras
        </Typography.Title>
        <Typography.Text type="secondary">
          Seleccione empresa y planilla, cargue Excel y confirme el procesamiento transaccional.
        </Typography.Text>
      </Card>

      <Card className={styles.mainCard} style={{ marginBottom: 16 }}>
        <Space wrap size={12} style={{ width: '100%' }}>
          <Select
            style={{ minWidth: 260 }}
            placeholder="Empresa"
            value={companyId}
            onChange={(value) => {
              setCompanyId(Number(value));
              setPayrollId(undefined);
              setTemplateData(null);
              setSelectedFile(null);
              setPreview(null);
              setEditableRows([]);
              setPreviewDirty(false);
              setLastFileMeta(null);
            }}
            options={companies.map((company) => ({
              value: Number(company.id),
              label: company.nombre,
            }))}
          />
          <Select
            loading={loadingPayrolls}
            style={{ minWidth: 420 }}
            placeholder="Planilla (Abierta / En Proceso)"
            value={payrollId}
            onChange={(value) => {
              setPayrollId(Number(value));
              setPreview(null);
              setEditableRows([]);
              setPreviewDirty(false);
            }}
            options={payrolls.map((row) => ({
              value: Number(row.id),
              label: `${row.nombrePlanilla ?? `Planilla #${row.id}`} | ${row.fechaInicioPeriodo} - ${row.fechaFinPeriodo} | ${
                Number(row.estado) === 1 ? 'Abierta' : 'En Proceso'
              }`,
            }))}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSelectedFile(null);
              setPreview(null);
              setEditableRows([]);
              setPreviewDirty(false);
              setLastFileMeta(null);
              void loadPayrolls();
            }}
          >
            Refrescar planillas
          </Button>
        </Space>

        {templateData ? (
          <Alert
            style={{ marginTop: 12 }}
            type="info"
            title={`Planilla seleccionada: ${templateData.payroll.nombrePlanilla}`}
            description={`Empleados elegibles: ${templateData.empleados.length} | Movimientos disponibles: ${templateData.movimientos.length}`}
            showIcon
          />
        ) : null}
      </Card>

      <Card className={styles.mainCard} style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => void handleDownloadTemplate()}
            disabled={!templateData || loadingTemplate}
            loading={downloadingTemplate}
          >
            Descargar plantilla Excel
          </Button>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Seleccionar Excel</Button>
          </Upload>
          <Button type="primary" loading={uploadingPreview} onClick={() => void handlePreview()}>
            Generar preview
          </Button>
          <Button type="default" disabled={disabledCommit} loading={commitRunning} onClick={() => void handleCommit()}>
            Confirmar carga masiva
          </Button>
        </Space>

        {preview ? (
          <Alert
            style={{ marginTop: 12 }}
            type={preview.resumen.errorBloqueante > 0 ? 'error' : 'success'}
            showIcon
            title={preview.resumen.mensaje}
            description={`Total: ${preview.resumen.total} | Validas: ${preview.resumen.validas} | No procesables: ${preview.resumen.noProcesables} | Errores bloqueantes: ${preview.resumen.errorBloqueante}`}
          />
        ) : null}

      </Card>

      <Card className={styles.mainCard}>
        <Table
          bordered
          rowKey={(row) => `${row.rowNumber}-${row.codigoEmpleado}`}
          columns={columns}
          dataSource={sortedEditableRows}
          pagination={false}
          locale={{ emptyText: 'Sin preview. Cargue archivo y genere preview.' }}
        />
      </Card>
    </div>
  );
}
