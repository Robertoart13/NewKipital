/* =============================================================================
   MODULE: permissions
   =============================================================================

   Capa de acceso a datos para el modulo de Permisos y Autorizacion.

   Responsabilidades:
   - Obtener permisos del usuario en el contexto de una empresa + app especifica
   - Obtener permisos agregados del usuario para la app activa en todas sus empresas
   - Consultar el catalogo de permisos del sistema para la vista administrativa

   Decisiones de diseno:
   - `fetchPermissionsForCompany` usa POST /auth/switch-company para forzar
     la revalidacion del contexto de autorizacion al cambiar de empresa
   - `fetchPermissionsForApp` usa GET /auth/me para obtener permisos agregados
     sin cambiar el contexto de empresa activa
   - `fetchSystemPermissions` expone el catalogo completo para la administracion
     de roles y configuracion de seguridad

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

import type { Permission } from '../store/slices/permissionsSlice';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * System Permission
 * ============================================================================
 *
 * Representa un permiso del sistema registrado en el catalogo de seguridad.
 *
 * Los permisos del sistema son las unidades atomicas de autorizacion que
 * se asignan a roles y que el backend verifica en cada operacion protegida.
 *
 * ============================================================================
 */
export interface SystemPermission {
  /** Identificador unico del permiso. */
  id: number;

  /** Codigo unico del permiso (ej: "EMPLEADOS_CREAR", "NOMINA_APLICAR"). */
  codigo: string;

  /** Nombre legible del permiso. */
  nombre: string;

  /** Descripcion del alcance del permiso; puede ser nula. */
  descripcion: string | null;

  /** Modulo al que pertenece el permiso (ej: "EMPLEADOS", "NOMINA"). */
  modulo: string;

  /**
   * Estado del permiso en el sistema.
   * - 1 = activo
   * - 0 = inactivo
   */
  estado: number;

  /** Fecha de creacion del permiso en formato ISO 8601. */
  fechaCreacion: string;
}

/* =============================================================================
   API: AUTORIZACION POR CONTEXTO
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Permissions For Company
 * ============================================================================
 *
 * Obtiene los permisos y roles del usuario autenticado en el contexto
 * de una empresa y aplicacion especificas.
 *
 * Llama a POST /auth/switch-company para forzar la revalidacion del token
 * de autorizacion en el servidor. Este endpoint actualiza el contexto activo
 * del usuario (empresa + app) antes de retornar los permisos.
 *
 * @param companyId   - ID de la empresa como string (se convierte a int).
 * @param appCode     - Codigo de la aplicacion activa. Por defecto `'kpital'`.
 * @param refreshAuthz - Si es `true`, fuerza la revalidacion del token. Por defecto `true`.
 *
 * @returns Objeto con la lista de permisos y roles del usuario en ese contexto.
 *
 * @throws {Error} Si la peticion falla o el usuario no tiene acceso a la empresa.
 *
 * ============================================================================
 */
export async function fetchPermissionsForCompany(
  companyId: string,
  appCode = 'kpital',
  refreshAuthz = true,
): Promise<{ permissions: Permission[]; roles: string[] }> {
  const res = await httpFetch('/auth/switch-company', {
    method: 'POST',
    body: JSON.stringify({
      companyId: parseInt(companyId, 10),
      appCode,
      /** Solo incluye `refreshAuthz` en el body si es `true` para evitar enviar `undefined`. */
      refreshAuthz: refreshAuthz ? true : undefined,
    }),
  });

  if (!res.ok) {
    throw new Error('Error al cargar permisos');
  }

  return res.json();
}

/**
 * ============================================================================
 * Fetch Permissions For App
 * ============================================================================
 *
 * Obtiene los permisos agregados del usuario para la aplicacion activa,
 * consolidando los permisos de todas las empresas a las que tiene acceso.
 *
 * A diferencia de `fetchPermissionsForCompany`, este endpoint no cambia
 * el contexto de empresa activa del usuario; solo retorna los permisos
 * acumulados para la app especificada.
 *
 * @param appCode     - Codigo de la aplicacion activa. Por defecto `'kpital'`.
 * @param refreshAuthz - Si es `true`, fuerza revalidacion del token. Por defecto `true`.
 *
 * @returns Objeto con la lista de permisos y roles del usuario para la app.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchPermissionsForApp(
  appCode = 'kpital',
  refreshAuthz = true,
): Promise<{ permissions: Permission[]; roles: string[] }> {
  const qs = new URLSearchParams({ appCode });
  if (refreshAuthz) {
    qs.set('refreshAuthz', 'true');
  }
  const res = await httpFetch(`/auth/me?${qs.toString()}`);
  if (!res.ok) {
    throw new Error('Error al cargar permisos de la aplicacion');
  }
  const data = await res.json();
  return {
    /** Garantiza que `permissions` sea siempre un arreglo aunque el backend devuelva otro tipo. */
    permissions: Array.isArray(data?.permissions) ? data.permissions : [],
    /** Garantiza que `roles` sea siempre un arreglo aunque el backend devuelva otro tipo. */
    roles: Array.isArray(data?.roles) ? data.roles : [],
  };
}

/* =============================================================================
   API: CATALOGO DE PERMISOS
   ============================================================================= */

/**
 * ============================================================================
 * Fetch System Permissions
 * ============================================================================
 *
 * Obtiene la lista de permisos del sistema para la vista administrativa.
 *
 * Por defecto incluye permisos activos e inactivos para permitir la
 * gestion completa de roles desde la configuracion de seguridad.
 *
 * @param filters.modulo          - Filtra permisos por modulo especifico.
 * @param filters.includeInactive - Controla si se incluyen permisos inactivos.
 *
 * @returns Lista de permisos del sistema con sus metadatos.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchSystemPermissions(filters?: {
  modulo?: string;
  includeInactive?: boolean;
}): Promise<SystemPermission[]> {
  const params = new URLSearchParams();

  if (filters?.modulo) {
    params.set('modulo', filters.modulo);
  }
  if (filters?.includeInactive !== undefined) {
    params.set('includeInactive', String(filters.includeInactive));
  }

  const qs = params.toString();
  const res = await httpFetch(`/permissions${qs ? `?${qs}` : ''}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al cargar permisos del sistema');
  }

  return res.json();
}
