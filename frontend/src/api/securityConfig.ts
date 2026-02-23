import { httpFetch } from '../interceptors/httpInterceptor';

export type PermissionCatalogMode = 'migration' | 'ui';

export interface SystemPermission {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
  estado: number;
  fechaCreacion: string;
  fechaModificacion: string | null;
  creadoPor: number | null;
  modificadoPor: number | null;
}

export interface SystemRole {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: number;
}

export interface SystemUser {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  estado: number;
}

export interface SystemApp {
  id: number;
  codigo: string;
  nombre: string;
  estado: number;
}

export interface UserRoleAssignment {
  idUsuario: number;
  idRol: number;
  idEmpresa: number;
  idApp: number;
  estado: number;
}

export interface UserCompanyAssignment {
  idUsuario: number;
  idEmpresa: number;
  estado: number;
}

function parseErrorMessage(defaultMessage: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object') return defaultMessage;

  const candidate = payload as { message?: string | string[] };
  if (Array.isArray(candidate.message)) {
    return candidate.message.join(', ');
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }
  return defaultMessage;
}

async function ensureOk<T>(res: Response, defaultMessage: string): Promise<T> {
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(parseErrorMessage(defaultMessage, payload));
  }
  return res.json();
}

export async function fetchPermissionsCatalogMode(): Promise<PermissionCatalogMode> {
  const res = await httpFetch('/config/permissions/mode');
  const data = await ensureOk<{ mode: PermissionCatalogMode }>(res, 'Error al cargar modo de catalogo');
  return data.mode;
}

export async function fetchConfigPermissions(filters?: {
  modulo?: string;
  includeInactive?: boolean;
}): Promise<SystemPermission[]> {
  const params = new URLSearchParams();

  if (filters?.modulo) params.set('modulo', filters.modulo);
  if (filters?.includeInactive !== undefined) params.set('includeInactive', String(filters.includeInactive));

  const res = await httpFetch(`/config/permissions${params.toString() ? `?${params}` : ''}`);
  return ensureOk<SystemPermission[]>(res, 'Error al cargar permisos');
}

export async function fetchPermissionsForRoles(filters?: {
  modulo?: string;
  includeInactive?: boolean;
}): Promise<SystemPermission[]> {
  const params = new URLSearchParams();

  if (filters?.modulo) params.set('modulo', filters.modulo);
  if (filters?.includeInactive !== undefined) params.set('includeInactive', String(filters.includeInactive));

  const res = await httpFetch(`/permissions${params.toString() ? `?${params}` : ''}`);
  return ensureOk<SystemPermission[]>(res, 'Error al cargar permisos para roles');
}

export async function createConfigPermission(payload: {
  codigo: string;
  nombre: string;
  descripcion?: string;
  modulo: string;
}): Promise<SystemPermission> {
  const res = await httpFetch('/config/permissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return ensureOk<SystemPermission>(res, 'Error al crear permiso');
}

export async function updateConfigPermission(
  id: number,
  payload: {
    codigo?: string;
    nombre?: string;
    descripcion?: string;
    modulo?: string;
  },
): Promise<SystemPermission> {
  const res = await httpFetch(`/config/permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return ensureOk<SystemPermission>(res, 'Error al actualizar permiso');
}

export async function inactivateConfigPermission(id: number): Promise<SystemPermission> {
  const res = await httpFetch(`/config/permissions/${id}/inactivate`, { method: 'PATCH' });
  return ensureOk<SystemPermission>(res, 'Error al inactivar permiso');
}

export async function reactivateConfigPermission(id: number): Promise<SystemPermission> {
  const res = await httpFetch(`/config/permissions/${id}/reactivate`, { method: 'PATCH' });
  return ensureOk<SystemPermission>(res, 'Error al reactivar permiso');
}

export async function fetchRoles(includeInactive = false, appCode?: 'kpital' | 'timewise'): Promise<SystemRole[]> {
  const params = new URLSearchParams();
  params.set('includeInactive', String(includeInactive));
  if (appCode) params.set('appCode', appCode);
  const res = await httpFetch(`/config/roles?${params}`);
  return ensureOk<SystemRole[]>(res, 'Error al cargar roles');
}

export async function fetchRolesForUsers(includeInactive = false, appCode?: string): Promise<SystemRole[]> {
  const params = new URLSearchParams();
  params.set('includeInactive', String(includeInactive));
  if (appCode) params.set('appCode', appCode);
  const res = await httpFetch(`/config/users/roles-catalog?${params}`);
  return ensureOk<SystemRole[]>(res, 'Error al cargar roles para usuarios');
}

export async function fetchRolesByApp(appCode: 'timewise' | 'kpital'): Promise<SystemRole[]> {
  return fetchRolesForUsers(false, appCode);
}

export async function createRole(payload: {
  codigo: string;
  nombre: string;
  descripcion?: string;
  appCode: 'kpital' | 'timewise';
}): Promise<SystemRole> {
  const res = await httpFetch('/config/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return ensureOk<SystemRole>(res, 'Error al crear rol');
}

export async function updateRole(
  id: number,
  payload: { nombre?: string; descripcion?: string },
): Promise<SystemRole> {
  const res = await httpFetch(`/config/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return ensureOk<SystemRole>(res, 'Error al actualizar rol');
}

export async function replaceRolePermissions(id: number, permissions: string[]): Promise<SystemPermission[]> {
  const res = await httpFetch(`/config/roles/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
  return ensureOk<SystemPermission[]>(res, 'Error al actualizar permisos del rol');
}

export async function fetchRolePermissions(id: number): Promise<SystemPermission[]> {
  const res = await httpFetch(`/config/roles/${id}/permissions`);
  return ensureOk<SystemPermission[]>(res, 'Error al cargar permisos del rol');
}

export async function inactivateRole(id: number): Promise<SystemRole> {
  const res = await httpFetch(`/roles/${id}/inactivate`, { method: 'PATCH' });
  return ensureOk<SystemRole>(res, 'Error al inactivar rol');
}

export async function reactivateRole(id: number): Promise<SystemRole> {
  const res = await httpFetch(`/roles/${id}/reactivate`, { method: 'PATCH' });
  return ensureOk<SystemRole>(res, 'Error al reactivar rol');
}

export async function fetchUsers(
  includeInactive = false,
  configView = false,
): Promise<SystemUser[]> {
  const params = new URLSearchParams();
  params.set('includeInactive', String(includeInactive));
  if (configView) params.set('configView', 'true');
  const res = await httpFetch(`/users?${params}`);
  return ensureOk<SystemUser[]>(res, 'Error al cargar usuarios');
}

export async function fetchApps(): Promise<SystemApp[]> {
  const res = await httpFetch('/apps');
  return ensureOk<SystemApp[]>(res, 'Error al cargar apps');
}

export async function fetchUserApps(userId: number): Promise<{ idApp: number }[]> {
  const res = await httpFetch(`/user-assignments/apps/${userId}`);
  const data = await ensureOk<{ id: number; idUsuario: number; idApp: number; estado: number }[]>(
    res,
    'Error al cargar apps del usuario',
  );
  return (data ?? []).filter((a) => a.estado === 1).map((a) => ({ idApp: a.idApp }));
}

export async function assignUserApp(userId: number, idApp: number): Promise<{ id: number }> {
  const res = await httpFetch('/user-assignments/apps', {
    method: 'POST',
    body: JSON.stringify({ idUsuario: userId, idApp }),
  });
  return ensureOk<{ id: number }>(res, 'Error al asignar aplicación');
}

export async function fetchUserCompanies(userId: number): Promise<UserCompanyAssignment[]> {
  const res = await httpFetch(`/user-assignments/companies/${userId}`);
  return ensureOk<UserCompanyAssignment[]>(res, 'Error al cargar empresas del usuario');
}

export async function replaceUserCompanies(
  userId: number,
  companyIds: number[],
): Promise<{ companyIds: number[] }> {
  const res = await httpFetch(`/config/users/${userId}/companies`, {
    method: 'PUT',
    body: JSON.stringify({ companyIds }),
  });
  return ensureOk<{ companyIds: number[] }>(res, 'Error al guardar empresas del usuario');
}

export async function fetchUserRolesInContext(
  userId: number,
  companyId: number,
  appId: number,
): Promise<UserRoleAssignment[]> {
  const params = new URLSearchParams({
    idEmpresa: String(companyId),
    idApp: String(appId),
  });
  const res = await httpFetch(`/user-assignments/roles/${userId}?${params}`);
  return ensureOk<UserRoleAssignment[]>(res, 'Error al cargar roles del usuario');
}

export async function replaceUserRolesInContext(
  userId: number,
  payload: {
    companyId: number;
    appCode: string;
    roleIds: number[];
  },
): Promise<UserRoleAssignment[]> {
  const res = await httpFetch(`/config/users/${userId}/roles`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return ensureOk<UserRoleAssignment[]>(res, 'Error al guardar roles por contexto');
}

export interface UserRolesSummary {
  appCode: string;
  globalRoleIds: number[];
  globalPermissionDeny?: string[];
  contextRoles: { companyId: number; roleIds: number[] }[];
  exclusions: { companyId: number; roleIds: number[] }[];
  permissionOverrides: { companyId: number; allow: string[]; deny: string[] }[];
}

export async function fetchUserRolesSummary(
  userId: number,
  appCode: string,
): Promise<UserRolesSummary> {
  const params = new URLSearchParams({ appCode });
  const res = await httpFetch(`/config/users/${userId}/roles-summary?${params}`);
  return ensureOk<UserRolesSummary>(res, 'Error al cargar resumen de roles');
}

export async function replaceUserGlobalRoles(
  userId: number,
  payload: { appCode: string; roleIds: number[] },
): Promise<{ appCode: string; roleIds: number[] }> {
  const res = await httpFetch(`/config/users/${userId}/global-roles`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return ensureOk<{ appCode: string; roleIds: number[] }>(
    res,
    'Error al guardar roles globales',
  );
}

export async function fetchUserGlobalRoles(
  userId: number,
  appCode: string,
): Promise<{ appCode: string; roleIds: number[] }> {
  const params = new URLSearchParams({ appCode });
  const res = await httpFetch(`/config/users/${userId}/global-roles?${params}`);
  return ensureOk<{ appCode: string; roleIds: number[] }>(
    res,
    'Error al cargar roles globales',
  );
}

export async function replaceUserRoleExclusions(
  userId: number,
  payload: {
    companyId: number;
    appCode: string;
    roleIds: number[];
  },
): Promise<{ companyId: number; appCode: string; roleIds: number[] }> {
  const res = await httpFetch(`/config/users/${userId}/role-exclusions`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return ensureOk<{ companyId: number; appCode: string; roleIds: number[] }>(
    res,
    'Error al guardar excepciones de rol',
  );
}

export async function fetchUserRoleExclusions(
  userId: number,
  companyId: number,
  appCode: string,
): Promise<{ companyId: number; appCode: string; roleIds: number[] }> {
  const params = new URLSearchParams({ companyId: String(companyId), appCode });
  const res = await httpFetch(
    `/config/users/${userId}/role-exclusions?${params}`,
  );
  return ensureOk<{ companyId: number; appCode: string; roleIds: number[] }>(
    res,
    'Error al cargar excepciones de rol',
  );
}

export async function fetchUserPermissionOverrides(
  userId: number,
  companyId: number,
  appCode: string,
): Promise<{
  idUsuario: number;
  companyId: number;
  appCode: string;
  allow: string[];
  deny: string[];
}> {
  const params = new URLSearchParams({
    companyId: String(companyId),
    appCode,
  });
  const res = await httpFetch(
    `/config/users/${userId}/permissions?${params}`,
  );
  return ensureOk(res, 'Error al cargar excepciones de permisos');
}

export async function replaceUserGlobalPermissionDenials(
  userId: number,
  payload: { appCode: string; deny: string[] },
): Promise<{ appCode: string; deny: string[] }> {
  const res = await httpFetch(`/config/users/${userId}/global-permission-denials`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return ensureOk<{ appCode: string; deny: string[] }>(
    res,
    'Error al guardar denegaciones globales',
  );
}

export async function replaceUserPermissionOverrides(
  userId: number,
  payload: {
    companyId: number;
    appCode: string;
    allow?: string[];
    deny?: string[];
  },
): Promise<{
  idUsuario: number;
  companyId: number;
  appCode: string;
  allow: string[];
  deny: string[];
}> {
  const res = await httpFetch(`/config/users/${userId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return ensureOk(res, 'Error al guardar excepciones de permisos');
}
