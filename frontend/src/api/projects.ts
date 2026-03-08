/* =============================================================================
   MODULE: projects
   =============================================================================

   Capa de acceso a datos para el modulo de Proyectos (centros de costo).

   Responsabilidades:
   - Consultar proyectos activos e inactivos por empresa
   - Obtener el detalle de un proyecto especifico
   - Crear proyectos
   - Actualizar proyectos
   - Inactivar y reactivar registros (soft-delete)
   - Consultar la bitacora de auditoria

   Decisiones de diseno:
   - Los proyectos son por empresa (`idEmpresa` requerido en el payload)
   - `idExterno` permite integracion con ERPs y sistemas de contabilidad externos
   - `codigo` es un identificador corto unico por empresa para referencia rapida

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Project List Item
 * ============================================================================
 *
 * Representa un proyecto o centro de costo en la lista administrativa.
 *
 * Los proyectos permiten segmentar movimientos de nomina y acciones personales
 * por unidad de negocio o iniciativa especifica dentro de una empresa.
 *
 * ============================================================================
 */
export interface ProjectListItem {
  /** Identificador unico del proyecto. */
  id: number;

  /** ID de la empresa propietaria del proyecto. */
  idEmpresa: number;

  /** Nombre descriptivo del proyecto. */
  nombre: string;

  /** Descripcion adicional del proyecto; puede ser nula. */
  descripcion?: string | null;

  /** Codigo corto unico del proyecto dentro de la empresa. */
  codigo: string;

  /** Identificador externo para integracion con ERP; puede ser nulo. */
  idExterno?: string | null;

  /**
   * Estado de actividad del proyecto.
   * - 0 = activo
   * - 1 = inactivo (soft-delete)
   */
  esInactivo: number;

  /** Fecha de creacion asignada por el servidor en formato ISO 8601. */
  fechaCreacion?: string;

  /** Fecha de ultima modificacion en formato ISO 8601. */
  fechaModificacion?: string;
}

/**
 * ============================================================================
 * Project Payload
 * ============================================================================
 *
 * Payload para crear o actualizar un proyecto.
 *
 * Excluye campos controlados por el backend:
 * - id
 * - esInactivo
 * - fechas de auditoria
 *
 * ============================================================================
 */
export interface ProjectPayload {
  /** ID de la empresa a la que pertenece el proyecto. */
  idEmpresa: number;

  /** Nombre del proyecto. */
  nombre: string;

  /** Descripcion adicional; opcional. */
  descripcion?: string;

  /** Codigo corto unico del proyecto. */
  codigo: string;

  /** Identificador externo para integracion con ERP; opcional. */
  idExterno?: string;
}

/**
 * ============================================================================
 * Project Audit Trail Item
 * ============================================================================
 *
 * Representa un evento de la bitacora de auditoria de un proyecto.
 *
 * ============================================================================
 */
export interface ProjectAuditTrailItem {
  /** Identificador unico del evento de auditoria. */
  id: string;

  /** Modulo que origino el evento. */
  modulo: string;

  /** Accion ejecutada (CREATE, UPDATE, INACTIVATE, REACTIVATE). */
  accion: string;

  /** Entidad afectada. */
  entidad: string;

  /** ID de la entidad afectada; puede ser nulo en eventos globales. */
  entidadId: string | null;

  /** ID del usuario que ejecuto la accion. */
  actorUserId: number | null;

  /** Nombre del usuario actor. */
  actorNombre: string | null;

  /** Email del usuario actor. */
  actorEmail: string | null;

  /** Resumen textual del evento. */
  descripcion: string;

  /** Fecha del evento en formato ISO 8601. */
  fechaCreacion: string | null;

  /** Metadata libre adicional del evento. */
  metadata: Record<string, unknown> | null;

  /** Lista de campos modificados con valores antes y despues. */
  cambios: Array<{ campo: string; antes: string; despues: string }>;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Projects
 * ============================================================================
 *
 * Obtiene la lista de proyectos con filtros opcionales por empresa y estado.
 *
 * @param idEmpresa    - ID de empresa para filtrar proyectos; opcional.
 * @param showInactive - Si es `true`, retorna solo registros inactivos.
 *
 * @returns Lista de proyectos.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchProjects(idEmpresa?: number, showInactive = false): Promise<ProjectListItem[]> {
  const params = new URLSearchParams();
  if (idEmpresa) {
    params.set('idEmpresa', String(idEmpresa));
  }
  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }
  const qs = params.toString();
  const res = await httpFetch(`/projects${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar proyectos');
  return res.json();
}

/**
 * ============================================================================
 * Fetch Project
 * ============================================================================
 *
 * Obtiene el detalle completo de un proyecto por su identificador.
 *
 * @param id - Identificador unico del proyecto.
 *
 * @returns Objeto con el detalle del proyecto.
 *
 * @throws {Error} Si el proyecto no existe o la peticion falla.
 *
 * ============================================================================
 */
export async function fetchProject(id: number): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}`);
  if (!res.ok) throw new Error('Error al cargar proyecto');
  return res.json();
}

/**
 * ============================================================================
 * Create Project
 * ============================================================================
 *
 * Crea un nuevo proyecto en el sistema.
 *
 * @param payload - Datos del nuevo proyecto.
 *
 * @returns El proyecto creado con su `id` asignado por el servidor.
 *
 * @throws {Error} Si ocurre un error de validacion o una falla general.
 *
 * ============================================================================
 */
export async function createProject(payload: ProjectPayload): Promise<ProjectListItem> {
  const res = await httpFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al crear proyecto');
  }
  return res.json();
}

/**
 * ============================================================================
 * Update Project
 * ============================================================================
 *
 * Actualiza parcialmente un proyecto existente.
 *
 * @param id      - Identificador del proyecto a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns El proyecto actualizado.
 *
 * @throws {Error} Si ocurre un error de validacion o una falla general.
 *
 * ============================================================================
 */
export async function updateProject(id: number, payload: Partial<ProjectPayload>): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al actualizar proyecto');
  }
  return res.json();
}

/* =============================================================================
   API: GESTION DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Inactivate Project
 * ============================================================================
 *
 * Inactiva un proyecto mediante soft-delete.
 *
 * No elimina el registro fisicamente para preservar la integridad
 * de los movimientos de nomina y acciones personales asignadas al proyecto.
 *
 * @param id - Identificador del proyecto a inactivar.
 *
 * @returns El proyecto marcado como inactivo.
 *
 * @throws {Error} Si la operacion falla.
 *
 * ============================================================================
 */
export async function inactivateProject(id: number): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}/inactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al inactivar proyecto');
  return res.json();
}

/**
 * ============================================================================
 * Reactivate Project
 * ============================================================================
 *
 * Reactiva un proyecto previamente inactivado.
 *
 * @param id - Identificador del proyecto a reactivar.
 *
 * @returns El proyecto reactivado.
 *
 * @throws {Error} Si la operacion falla.
 *
 * ============================================================================
 */
export async function reactivateProject(id: number): Promise<ProjectListItem> {
  const res = await httpFetch(`/projects/${id}/reactivate`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al reactivar proyecto');
  return res.json();
}

/* =============================================================================
   API: AUDITORIA
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Project Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoria de un proyecto especifico.
 *
 * @param id    - Identificador del proyecto.
 * @param limit - Numero maximo de eventos a retornar. Por defecto `200`.
 *
 * @returns Lista de eventos de auditoria.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchProjectAuditTrail(id: number, limit = 200): Promise<ProjectAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await httpFetch(`/projects/${id}/audit-trail?${qs}`);
  if (!res.ok) {
    const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const msg = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(msg || 'Error al cargar bitacora de proyectos');
  }
  return res.json();
}
