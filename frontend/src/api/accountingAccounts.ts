import { httpFetch } from '../interceptors/httpInterceptor';

export interface AccountingAccountListItem {
  id: number;
  idEmpresa: number;
  nombre: string;
  descripcion?: string | null;
  codigo: string;
  idExternoNetsuite?: string | null;
  codigoExterno?: string | null;
  idTipoErp: number;
  idTipoAccionPersonal: number;
  esInactivo: number;
  fechaCreacion?: string;
  fechaModificacion?: string;
}

export interface AccountingAccountPayload {
  idEmpresa: number;
  nombre: string;
  descripcion?: string;
  codigo: string;
  idExternoNetsuite?: string;
  codigoExterno?: string;
  idTipoErp: number;
  idTipoAccionPersonal: number;
}

export interface AccountingAccountType {
  id: number;
  nombre: string;
  descripcion?: string | null;
  idExterno?: string | null;
  status: number;
}

export interface PersonalActionType {
  id: number;
  codigo: string;
  nombre: string;
  estado: number;
}

export interface AccountingAccountAuditTrailItem {
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

export async function fetchAccountingAccounts(
  idEmpresa?: number,
  showInactive = false,
  idEmpresas?: number[],
): Promise<AccountingAccountListItem[]> {
  const params = new URLSearchParams();
  if (idEmpresas && idEmpresas.length > 0) {
    params.set('idEmpresas', idEmpresas.join(','));
  } else if (idEmpresa) {
    params.set('idEmpresa', String(idEmpresa));
  }
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/accounting-accounts${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar cuentas contables');
  return res.json();
}

export async function fetchAccountingAccount(id: number): Promise<AccountingAccountListItem> {
  const res = await httpFetch(`/accounting-accounts/${id}`);
  if (!res.ok) throw new Error('Error al cargar cuenta contable');
  return res.json();
}

export async function createAccountingAccount(payload: AccountingAccountPayload): Promise<AccountingAccountListItem> {
  const res = await httpFetch('/accounting-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear cuenta contable');
  }
  return res.json();
}

export async function updateAccountingAccount(id: number, payload: Partial<AccountingAccountPayload>): Promise<AccountingAccountListItem> {
  const res = await httpFetch(`/accounting-accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar cuenta contable');
  }
  return res.json();
}

export async function inactivateAccountingAccount(id: number): Promise<AccountingAccountListItem> {
  const res = await httpFetch(`/accounting-accounts/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar cuenta contable');
  return res.json();
}

export async function reactivateAccountingAccount(id: number): Promise<AccountingAccountListItem> {
  const res = await httpFetch(`/accounting-accounts/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar cuenta contable');
  return res.json();
}

export async function fetchAccountingAccountAuditTrail(id: number, limit = 200): Promise<AccountingAccountAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/accounting-accounts/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = await res.json().catch(() => null) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de cuentas contables');
  }
  return res.json();
}

export async function fetchAccountingAccountTypes(): Promise<AccountingAccountType[]> {
  const res = await httpFetch('/accounting-accounts/types');
  if (!res.ok) throw new Error('Error al cargar tipos de cuenta');
  return res.json();
}

export async function fetchPersonalActionTypes(): Promise<PersonalActionType[]> {
  const res = await httpFetch('/accounting-accounts/personal-action-types');
  if (!res.ok) throw new Error('Error al cargar tipos de accion personal');
  return res.json();
}
