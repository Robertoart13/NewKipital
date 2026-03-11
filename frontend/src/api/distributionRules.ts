import { httpFetch } from '../interceptors/httpInterceptor';

export interface DistributionRuleLine {
  id: number;
  idTipoAccionPersonal: number;
  codigoTipoAccionPersonal: string;
  nombreTipoAccionPersonal: string;
  idCuentaContable: number;
  codigoCuentaContable: string;
  nombreCuentaContable: string;
}

export interface DistributionRuleItem {
  id: number;
  publicId: string;
  idEmpresa: number;
  nombreEmpresa: string;
  esReglaGlobal: number;
  idDepartamento: number | null;
  nombreDepartamento: string | null;
  idPuesto: number | null;
  nombrePuesto: string | null;
  estadoRegla: number;
  fechaCreacion: string;
  fechaModificacion: string;
  creadoPor: number | null;
  modificadoPor: number | null;
  totalAsignaciones: number;
  detalles: DistributionRuleLine[];
}

export interface DistributionRulePayloadLine {
  idTipoAccionPersonal: number;
  idCuentaContable: number;
}

export interface CreateDistributionRulePayload {
  idEmpresa: number;
  esReglaGlobal: boolean;
  idDepartamento?: number | null;
  idPuesto?: number | null;
  detalles: DistributionRulePayloadLine[];
}

export interface UpdateDistributionRulePayload {
  esReglaGlobal?: boolean;
  idDepartamento?: number | null;
  idPuesto?: number | null;
  detalles: DistributionRulePayloadLine[];
}

export interface DistributionRuleAuditItem {
  id: string;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  actorUserId: number | null;
  actorNombre: string | null;
  actorEmail: string | null;
  descripcion: string;
  fechaCreacion: string | null;
  metadata: Record<string, unknown> | null;
  cambios: Array<{ campo: string; antes: string; despues: string }>;
}

async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
  return message || fallbackMessage;
}

export async function fetchDistributionRules(params?: {
  idEmpresa?: number;
  esReglaGlobal?: number;
  esActivo?: number;
}): Promise<DistributionRuleItem[]> {
  const query = new URLSearchParams();
  if (params?.idEmpresa) query.set('idEmpresa', String(params.idEmpresa));
  if (params?.esReglaGlobal != null) query.set('esReglaGlobal', String(params.esReglaGlobal));
  if (params?.esActivo != null) query.set('esActivo', String(params.esActivo));

  const qs = query.toString();
  const res = await httpFetch(`/distribution-rules${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Error al cargar reglas de distribucion'));
  }
  return res.json();
}

export async function fetchDistributionRule(publicId: string): Promise<DistributionRuleItem> {
  const res = await httpFetch(`/distribution-rules/${publicId}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Error al cargar la regla de distribucion'));
  }
  return res.json();
}

export async function createDistributionRule(
  payload: CreateDistributionRulePayload,
): Promise<DistributionRuleItem> {
  const res = await httpFetch('/distribution-rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Error al crear regla de distribucion'));
  }
  return res.json();
}

export async function updateDistributionRule(
  publicId: string,
  payload: UpdateDistributionRulePayload,
): Promise<DistributionRuleItem> {
  const res = await httpFetch(`/distribution-rules/${publicId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Error al editar regla de distribucion'));
  }
  return res.json();
}

export async function inactivateDistributionRule(publicId: string): Promise<DistributionRuleItem> {
  const res = await httpFetch(`/distribution-rules/${publicId}/inactivate`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Error al inactivar regla de distribucion'));
  }
  return res.json();
}

export async function reactivateDistributionRule(publicId: string): Promise<DistributionRuleItem> {
  const res = await httpFetch(`/distribution-rules/${publicId}/reactivate`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Error al reactivar regla de distribucion'));
  }
  return res.json();
}

export async function fetchDistributionRuleAuditTrail(
  publicId: string,
  limit = 200,
): Promise<DistributionRuleAuditItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/distribution-rules/${publicId}/audit-trail?${qs}`);
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, 'Error al cargar bitacora de reglas de distribucion'),
    );
  }
  return res.json();
}
