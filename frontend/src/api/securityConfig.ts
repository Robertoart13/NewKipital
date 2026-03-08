/* =============================================================================
   MODULE: securityConfig
   =============================================================================

   Capa de acceso a datos para la configuracion de seguridad (usuarios,
   roles, permisos, asignaciones, aplicaciones).

   Responsabilidades:
   - Consultar y gestionar permisos del catalogo
   - Consultar y gestionar roles
   - Consultar y gestionar usuarios
   - Asignar apps, empresas y roles a usuarios
   - Consultar bitacora de auditoria de usuario

   Decisiones de diseno:
   - Todas las solicitudes HTTP se canalizan mediante httpFetch
   - parseErrorMessage y ensureOk centralizan el manejo de errores
   - Los catalogos soportan filtros (modulo, includeInactive, appCode)

   ========================================================================== */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   TIPOS E INTERFACES DE DOMINIO
   ============================================================================= */

/** Modo del catalogo de permisos: migracion o UI. */
export type PermissionCatalogMode = 'migration' | 'ui';

/**
 * ============================================================================
 * System Permission
 * ============================================================================
 *
 * Permiso del sistema en el catalogo de seguridad.
 *
 * ============================================================================
 */
export interface SystemPermission {
  /** Identificador unico del permiso. */
  id: number;

  /** Codigo unico del permiso (ej: "EMPLEADOS_CREAR"). */
  codigo: string;

  /** Nombre legible del permiso. */
  nombre: string;

  /** Descripcion del alcance; puede ser nula. */
  descripcion: string | null;

  /** Modulo al que pertenece (ej: "EMPLEADOS", "NOMINA"). */
  modulo: string;

  /** Estado: 1 activo, 0 inactivo. */
  estado: number;

  /** Fecha de creacion (ISO). */
  fechaCreacion: string;

  /** Fecha de ultima modificacion; nula si nunca. */
  fechaModificacion: string | null;

  /** ID del usuario que creo; nulo si no aplica. */
  creadoPor: number | null;

  /** ID del usuario que modifico; nulo si no aplica. */
  modificadoPor: number | null;
}

/**
 * Rol del sistema en el catalogo de seguridad.
 */
export interface SystemRole {
  /** Identificador unico del rol. */
  id: number;

  /** Codigo unico del rol. */
  codigo: string;

  /** Nombre legible del rol. */
  nombre: string;

  /** Descripcion; puede ser nula. */
  descripcion: string | null;

  /** Estado: 1 activo, 0 inactivo. */
  estado: number;
}

/**
 * Usuario del sistema en la vista de configuracion.
 */
export interface SystemUser {
  /** Identificador unico del usuario. */
  id: number;

  /** Email del usuario. */
  email: string;

  /** Nombre. */
  nombre: string;

  /** Apellido. */
  apellido: string;

  /** Estado: 1 activo, 0 inactivo. */
  estado: number;
}

/**
 * Aplicacion registrada en el sistema.
 */
export interface SystemApp {
  /** Identificador unico de la app. */
  id: number;

  /** Codigo de la app (ej: "kpital", "timewise"). */
  codigo: string;

  /** Nombre legible de la app. */
  nombre: string;

  /** Estado: 1 activo, 0 inactivo. */
  estado: number;
}

/**
 * Empresa en el selector de asignacion de usuarios.
 */
export interface ConfigCompanyItem {
  /** ID de la empresa. */
  id: number;

  /** Nombre de la empresa. */
  nombre: string;

  /** Prefijo de codigos; opcional. */
  prefijo?: string | null;

  /** Estado: 1 activo, 0 inactivo; opcional. */
  estado?: number;
}

/**
 * Asignacion de rol a usuario en contexto empresa+app.
 */
export interface UserRoleAssignment {
  /** ID del usuario. */
  idUsuario: number;

  /** ID del rol. */
  idRol: number;

  /** ID de la empresa. */
  idEmpresa: number;

  /** ID de la aplicacion. */
  idApp: number;

  /** Estado: 1 activo, 0 inactivo. */
  estado: number;
}

/**
 * Asignacion de empresa a usuario.
 */
export interface UserCompanyAssignment {
  /** ID del usuario. */
  idUsuario: number;

  /** ID de la empresa. */
  idEmpresa: number;

  /** Estado: 1 activo, 0 inactivo. */
  estado: number;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Parse Error Message
 * ============================================================================
 *
 * Extrae mensaje de error del payload de respuesta.
 * Soporta message como string o string[] (validacion NestJS).
 *
 * @param defaultMessage - Mensaje de respaldo si el payload no contiene message.
 * @param payload - Objeto JSON parseado de la respuesta.
 *
 * @returns Mensaje final listo para lanzar como excepcion.
 *
 * ============================================================================
 */
function parseErrorMessage(defaultMessage: string, payload: unknown): string {
  /** Si no hay payload o no es objeto, retorna respaldo. */
  if (!payload || typeof payload !== 'object') return defaultMessage;

  const candidate = payload as { message?: string | string[] };

  /** Soporta array de mensajes (class-validator). */
  if (Array.isArray(candidate.message)) {
    return candidate.message.join(', ');
  }

  /** Soporta string no vacio. */
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message;
  }

  return defaultMessage;
}

/**
 * ============================================================================
 * Ensure Ok
 * ============================================================================
 *
 * Valida que la respuesta HTTP sea exitosa y extrae el JSON.
 *
 * @param res - Respuesta HTTP.
 * @param defaultMessage - Mensaje de respaldo si el body no contiene message.
 *
 * @returns Body parseado como JSON.
 *
 * @throws {Error} Si res.ok es false.
 *
 * ============================================================================
 */
async function ensureOk<T>(res: Response, defaultMessage: string): Promise<T> {
  /** Valida status y extrae mensaje de error si falla. */
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(parseErrorMessage(defaultMessage, payload));
  }

  return res.json();
}

/* =============================================================================
   API: PERMISOS Y ROLES
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Permissions Catalog Mode
 * ============================================================================
 *
 * Obtiene el modo actual del catalogo de permisos (migration | ui).
 *
 * @returns Modo del catalogo.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
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

  const qs = params.toString();
  const res = await httpFetch(`/config/permissions${qs ? `?${qs}` : ''}`);
  return ensureOk<SystemPermission[]>(res, 'Error al cargar permisos');
}

export async function fetchPermissionsForRoles(filters?: {
  modulo?: string;
  includeInactive?: boolean;
}): Promise<SystemPermission[]> {
  const params = new URLSearchParams();

  if (filters?.modulo) params.set('modulo', filters.modulo);
  if (filters?.includeInactive !== undefined) params.set('includeInactive', String(filters.includeInactive));

  const qs = params.toString();
  const res = await httpFetch(`/permissions${qs ? `?${qs}` : ''}`);
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
  if (res.status === 403) {
    return [];
  }
  return ensureOk<SystemRole[]>(res, 'Error al cargar roles para usuarios');
}

export async function fetchRolesByApp(appCode: 'timewise' | 'kpital'): Promise<SystemRole[]> {
  return fetchRolesForUsers(false, appCode);
}

/**
 * Elemento del historial de auditoria de un usuario.
 */
export interface UserAuditTrailItem {
  /** ID del evento de auditoria. */
  id: string;

  /** Modulo que origino el evento. */
  modulo: string;

  /** Accion ejecutada. */
  accion: string;

  /** Entidad afectada. */
  entidad: string;

  /** ID de la entidad; nulo en eventos globales. */
  entidadId: string | null;

  /** ID del usuario actor; nulo si no aplica. */
  actorUserId: number | null;

  /** Nombre del actor; nulo si no aplica. */
  actorNombre: string | null;

  /** Email del actor; nulo si no aplica. */
  actorEmail: string | null;

  /** Descripcion textual del evento. */
  descripcion: string;

  /** Fecha del evento (ISO); nula si no aplica. */
  fechaCreacion: string | null;

  /** Metadata libre; nula si no aplica. */
  metadata: Record<string, unknown> | null;
}

export async function fetchCompaniesForUserConfig(): Promise<ConfigCompanyItem[]> {
  const res = await httpFetch('/config/users/companies-catalog');
  return ensureOk<ConfigCompanyItem[]>(res, 'Error al cargar empresas para configuración de usuarios');
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

export async function updateRole(id: number, payload: { nombre?: string; descripcion?: string }): Promise<SystemRole> {
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

export async function fetchUsers(includeInactive = false, configView = false): Promise<SystemUser[]> {
  const params = new URLSearchParams();
  params.set('includeInactive', String(includeInactive));
  if (configView) params.set('configView', 'true');
  const res = await httpFetch(`/users?${params}`);
  return ensureOk<SystemUser[]>(res, 'Error al cargar usuarios');
}

export async function inactivateUser(id: number, motivo?: string): Promise<SystemUser> {
  const res = await httpFetch(`/users/${id}/inactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
  return ensureOk<SystemUser>(res, 'Error al inactivar usuario');
}

export async function reactivateUser(id: number): Promise<SystemUser> {
  const res = await httpFetch(`/users/${id}/reactivate`, { method: 'PATCH' });
  return ensureOk<SystemUser>(res, 'Error al reactivar usuario');
}

export async function blockUser(id: number, motivo?: string): Promise<SystemUser> {
  const res = await httpFetch(`/users/${id}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ motivo }),
  });
  return ensureOk<SystemUser>(res, 'Error al bloquear usuario');
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

export async function replaceUserCompanies(userId: number, companyIds: number[]): Promise<{ companyIds: number[] }> {
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

/**
 * Resumen de roles y permisos del usuario por contexto.
 */
export interface UserRolesSummary {
  /** Codigo de la aplicacion. */
  appCode: string;

  /** IDs de roles globales asignados. */
  globalRoleIds: number[];

  /** Permisos denegados globalmente; opcional. */
  globalPermissionDeny?: string[];

  /** Roles por empresa. */
  contextRoles: { companyId: number; roleIds: number[] }[];

  /** Excepciones de rol por empresa. */
  exclusions: { companyId: number; roleIds: number[] }[];

  /** Sobrescrituras de permisos por empresa. */
  permissionOverrides: { companyId: number; allow: string[]; deny: string[] }[];
}

export async function fetchUserRolesSummary(userId: number, appCode: string): Promise<UserRolesSummary> {
  const params = new URLSearchParams({ appCode });
  const res = await httpFetch(`/config/users/${userId}/roles-summary?${params}`);
  return ensureOk<UserRolesSummary>(res, 'Error al cargar resumen de roles');
}

export async function fetchUserAuditTrail(userId: number, limit = 150): Promise<UserAuditTrailItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/config/users/${userId}/audit-trail?${params}`);
  return ensureOk<UserAuditTrailItem[]>(res, 'Error al cargar bitacora del usuario');
}

export async function replaceUserGlobalRoles(
  userId: number,
  payload: { appCode: string; roleIds: number[] },
): Promise<{ appCode: string; roleIds: number[] }> {
  const res = await httpFetch(`/config/users/${userId}/global-roles`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return ensureOk<{ appCode: string; roleIds: number[] }>(res, 'Error al guardar roles globales');
}

export async function fetchUserGlobalRoles(
  userId: number,
  appCode: string,
): Promise<{ appCode: string; roleIds: number[] }> {
  const params = new URLSearchParams({ appCode });
  const res = await httpFetch(`/config/users/${userId}/global-roles?${params}`);
  return ensureOk<{ appCode: string; roleIds: number[] }>(res, 'Error al cargar roles globales');
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
  const res = await httpFetch(`/config/users/${userId}/role-exclusions?${params}`);
  return ensureOk<{ companyId: number; appCode: string; roleIds: number[] }>(res, 'Error al cargar excepciones de rol');
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
  const res = await httpFetch(`/config/users/${userId}/permissions?${params}`);
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
  return ensureOk<{ appCode: string; deny: string[] }>(res, 'Error al guardar denegaciones globales');
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

