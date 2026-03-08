/* =============================================================================
   MODULE: payrollArticles
   =============================================================================

   Capa de acceso a datos para el módulo de Artículos de Nómina.

   Responsabilidades:
   - Consultar artículos de nómina activos e inactivos
   - Obtener el detalle de un artículo específico
   - Crear y actualizar artículos
   - Inactivar y reactivar registros
   - Consultar catálogos auxiliares (tipos de artículo, tipos de acción personal,
     cuentas contables elegibles)
   - Consultar bitácora de auditoría

   Decisiones de diseño:
   - Todas las solicitudes HTTP se canalizan mediante `httpFetch`
   - Los artículos de nómina son la configuración base que vincula
     acciones personales con cuentas contables
   - `fetchPayrollArticleAccounts` recibe `idsReferencia` e `idsCuenta` para
     filtrar cuentas elegibles sin cargar el catálogo completo

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Payroll Article List Item
 * ============================================================================
 *
 * Representa un elemento de la lista de artículos de nómina retornado por la API.
 *
 * Un artículo de nómina vincula un tipo de acción personal con las cuentas
 * contables correspondientes (gasto y pasivo).
 *
 * ============================================================================
 */
export interface PayrollArticleListItem {
  /** Identificador único del artículo de nómina. */
  id: number;

  /** Identificador de la empresa propietaria. */
  idEmpresa: number;

  /** Nombre descriptivo del artículo. */
  nombre: string;

  /** Descripción ampliada; puede ser nula. */
  descripcion?: string | null;

  /** FK hacia el catálogo de tipos de acción personal. */
  idTipoAccionPersonal: number;

  /** FK hacia el catálogo de tipos de artículo de nómina. */
  idTipoArticuloNomina: number;

  /** FK hacia la cuenta contable de gasto asociada. */
  idCuentaGasto: number;

  /** FK hacia la cuenta contable de pasivo asociada; puede ser nula. */
  idCuentaPasivo?: number | null;

  /**
   * Estado lógico del registro.
   * - 0 = activo
   * - 1 = inactivo
   */
  esInactivo: number;

  /** Fecha de creación asignada por el servidor en formato ISO 8601. */
  fechaCreacion?: string;

  /** Fecha de última modificación asignada por el servidor en formato ISO 8601. */
  fechaModificacion?: string;
}

/**
 * ============================================================================
 * Payroll Article Payload
 * ============================================================================
 *
 * Payload utilizado para crear o actualizar un artículo de nómina.
 *
 * Excluye campos controlados por el backend:
 * - id, esInactivo, fechas de auditoría
 *
 * ============================================================================
 */
export interface PayrollArticlePayload {
  /** Identificador de la empresa. */
  idEmpresa: number;

  /** Nombre del artículo. */
  nombre: string;

  /** Descripción ampliada opcional. */
  descripcion?: string;

  /** FK tipo de acción personal. */
  idTipoAccionPersonal: number;

  /** FK tipo de artículo de nómina. */
  idTipoArticuloNomina: number;

  /** FK cuenta contable de gasto. */
  idCuentaGasto: number;

  /** FK cuenta contable de pasivo; opcional. */
  idCuentaPasivo?: number | null;
}

/**
 * ============================================================================
 * Payroll Article Type
 * ============================================================================
 *
 * Catálogo de tipos de artículo de nómina disponibles para el selector
 * `idTipoArticuloNomina`.
 *
 * ============================================================================
 */
export interface PayrollArticleType {
  /** Identificador único del tipo. */
  id: number;

  /** Nombre del tipo. */
  nombre: string;

  /** Descripción opcional. */
  descripcion?: string | null;

  /**
   * Estado del catálogo.
   * - 0 = activo
   * - 1 = inactivo
   */
  esInactivo: number;
}

/**
 * ============================================================================
 * Personal Action Type
 * ============================================================================
 *
 * Catálogo de tipos de acción personal disponibles para el selector
 * `idTipoAccionPersonal` en artículos de nómina.
 *
 * ============================================================================
 */
export interface PersonalActionType {
  /** Identificador único del tipo de acción personal. */
  id: number;

  /** Código corto del tipo. */
  codigo: string;

  /** Nombre descriptivo del tipo. */
  nombre: string;

  /**
   * Estado del catálogo.
   * - 1 = activo
   */
  estado: number;
}

/**
 * ============================================================================
 * Accounting Account Option
 * ============================================================================
 *
 * Representa una cuenta contable disponible para asignar como cuenta de
 * gasto o pasivo en un artículo de nómina.
 *
 * ============================================================================
 */
export interface AccountingAccountOption {
  /** Identificador único de la cuenta contable. */
  id: number;

  /** Identificador de la empresa propietaria. */
  idEmpresa: number;

  /** Nombre de la cuenta contable. */
  nombre: string;

  /** Código interno de la cuenta. */
  codigo: string;

  /** FK hacia el tipo ERP de la cuenta. */
  idTipoErp: number;

  /**
   * Estado lógico de la cuenta.
   * - 0 = activa
   * - 1 = inactiva
   */
  esInactivo: number;
}

/**
 * ============================================================================
 * Payroll Article Audit Trail Item
 * ============================================================================
 *
 * Representa un evento dentro de la bitácora de auditoría de un artículo
 * de nómina.
 *
 * ============================================================================
 */
export interface PayrollArticleAuditTrailItem {
  /** Identificador único del evento de auditoría. */
  id: string;

  /** Módulo que originó el evento. */
  modulo: string;

  /** Acción ejecutada. */
  accion: string;

  /** Nombre lógico de la entidad afectada. */
  entidad: string;

  /** Identificador de la entidad afectada; puede ser nulo. */
  entidadId: string | null;

  /** ID del usuario actor. */
  actorUserId: number | null;

  /** Nombre del usuario actor. */
  actorNombre: string | null;

  /** Email del usuario actor. */
  actorEmail: string | null;

  /** Resumen textual del evento. */
  descripcion: string;

  /** Fecha de creación del evento en formato ISO 8601. */
  fechaCreacion: string | null;

  /** Metadata libre asociada al evento. */
  metadata: Record<string, unknown> | null;

  /**
   * Lista de cambios realizados.
   * En eventos de creación puede venir vacía.
   */
  cambios: Array<{ campo: string; antes: string; despues: string }>;
}

/* =============================================================================
   FUNCIONES AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Parse Error Message
 * ============================================================================
 *
 * Normaliza el mensaje de error retornado por la API.
 *
 * @param res             - Respuesta HTTP fallida.
 * @param fallbackMessage - Mensaje de respaldo.
 *
 * @returns Mensaje listo para lanzar como excepción.
 *
 * ============================================================================
 */
async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
  return message || fallbackMessage;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Articles
 * ============================================================================
 *
 * Obtiene la lista de artículos de nómina con filtros opcionales.
 *
 * Prioridad de filtros:
 * 1. `idEmpresas` para consulta multiempresa
 * 2. `idEmpresa` para consulta individual
 *
 * @param idEmpresa    - ID de una empresa individual.
 * @param showInactive - Si es `true`, retorna solo registros inactivos.
 * @param idEmpresas   - Lista de IDs para consulta multiempresa.
 *
 * @returns Lista de artículos de nómina.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchPayrollArticles(
  idEmpresa?: number,
  showInactive = false,
  idEmpresas?: number[],
): Promise<PayrollArticleListItem[]> {
  const params = new URLSearchParams();

  /** `idEmpresas` tiene prioridad sobre `idEmpresa` al representar una intención multiempresa. */
  if (idEmpresas && idEmpresas.length > 0) {
    params.set('idEmpresas', idEmpresas.join(','));
  } else if (idEmpresa) {
    params.set('idEmpresa', String(idEmpresa));
  }

  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }

  const qs = params.toString();
  const res = await httpFetch(`/payroll-articles${qs ? `?${qs}` : ''}`);

  if (!res.ok) throw new Error('Error al cargar articulos de nomina');

  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll Article
 * ============================================================================
 *
 * Obtiene el detalle completo de un artículo de nómina por su identificador.
 *
 * @param id - Identificador único del artículo.
 *
 * @returns Objeto con el detalle del artículo.
 *
 * @throws {Error} Si el artículo no existe o la petición falla.
 *
 * ============================================================================
 */
export async function fetchPayrollArticle(id: number): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}`);

  if (!res.ok) throw new Error('Error al cargar articulo de nomina');

  return res.json();
}

/**
 * ============================================================================
 * Create Payroll Article
 * ============================================================================
 *
 * Crea un nuevo artículo de nómina.
 *
 * @param payload - Datos del nuevo artículo.
 *
 * @returns El artículo creado por el servidor.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function createPayrollArticle(payload: PayrollArticlePayload): Promise<PayrollArticleListItem> {
  const res = await httpFetch('/payroll-articles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al crear articulo de nomina');
    throw new Error(message);
  }

  return res.json();
}

/**
 * ============================================================================
 * Update Payroll Article
 * ============================================================================
 *
 * Actualiza parcialmente un artículo de nómina existente.
 *
 * @param id      - Identificador del artículo a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns El artículo actualizado.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function updatePayrollArticle(
  id: number,
  payload: Partial<PayrollArticlePayload>,
): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al actualizar articulo de nomina');
    throw new Error(message);
  }

  return res.json();
}

/* =============================================================================
   API: GESTIÓN DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Inactivate Payroll Article
 * ============================================================================
 *
 * Inactiva un artículo de nómina mediante soft-delete.
 *
 * @param id - Identificador del artículo a inactivar.
 *
 * @returns El artículo marcado como inactivo.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function inactivatePayrollArticle(id: number): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}/inactivate`, { method: 'PATCH' });

  if (!res.ok) throw new Error('Error al inactivar articulo de nomina');

  return res.json();
}

/**
 * ============================================================================
 * Reactivate Payroll Article
 * ============================================================================
 *
 * Reactiva un artículo de nómina previamente inactivado.
 *
 * @param id - Identificador del artículo a reactivar.
 *
 * @returns El artículo reactivado.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function reactivatePayrollArticle(id: number): Promise<PayrollArticleListItem> {
  const res = await httpFetch(`/payroll-articles/${id}/reactivate`, { method: 'PATCH' });

  if (!res.ok) throw new Error('Error al reactivar articulo de nomina');

  return res.json();
}

/* =============================================================================
   API: CATÁLOGOS AUXILIARES
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Article Types
 * ============================================================================
 *
 * Obtiene el catálogo de tipos de artículo de nómina para el selector
 * `idTipoArticuloNomina`.
 *
 * @returns Lista de tipos de artículo.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchPayrollArticleTypes(): Promise<PayrollArticleType[]> {
  const res = await httpFetch('/payroll-articles/types');

  if (!res.ok) throw new Error('Error al cargar tipos de articulo de nomina');

  return res.json();
}

/**
 * ============================================================================
 * Fetch Personal Action Types
 * ============================================================================
 *
 * Obtiene el catálogo de tipos de acción personal para el selector
 * `idTipoAccionPersonal` en artículos de nómina.
 *
 * @returns Lista de tipos de acción personal.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchPersonalActionTypes(): Promise<PersonalActionType[]> {
  const res = await httpFetch('/payroll-articles/personal-action-types');

  if (!res.ok) throw new Error('Error al cargar tipos de acción personal');

  return res.json();
}

/**
 * ============================================================================
 * Fetch Payroll Article Accounts
 * ============================================================================
 *
 * Obtiene las cuentas contables elegibles para asignar como cuenta de
 * gasto o pasivo en un artículo de nómina.
 *
 * Los parámetros `idsReferencia` e `idsCuenta` permiten filtrar solo las
 * cuentas relevantes sin cargar el catálogo completo de la empresa.
 *
 * @param idEmpresa       - ID de la empresa.
 * @param idsReferencia   - IDs de cuentas de referencia para filtrar por tipo ERP.
 * @param includeInactive - Si es `true`, incluye cuentas inactivas.
 * @param idsCuenta       - IDs de cuentas a incluir forzosamente (ej: las ya asignadas).
 *
 * @returns Lista de cuentas contables elegibles.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchPayrollArticleAccounts(
  idEmpresa: number,
  idsReferencia: number[],
  includeInactive = false,
  idsCuenta: number[] = [],
): Promise<AccountingAccountOption[]> {
  const params = new URLSearchParams({ idEmpresa: String(idEmpresa) });

  if (idsReferencia.length > 0) {
    params.set('idsReferencia', idsReferencia.join(','));
  }

  /** Incluye IDs de cuentas ya asignadas para que aparezcan aunque sean inactivas. */
  if (idsCuenta.length > 0) {
    params.set('idsCuenta', idsCuenta.join(','));
  }

  if (includeInactive) {
    params.set('includeInactive', 'true');
  }

  const res = await httpFetch(`/payroll-articles/accounts?${params.toString()}`);

  if (!res.ok) throw new Error('Error al cargar cuentas contables');

  return res.json();
}

/* =============================================================================
   API: AUDITORÍA
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Payroll Article Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoría de un artículo de nómina específico.
 *
 * @param id    - Identificador del artículo.
 * @param limit - Número máximo de eventos. Por defecto `200`.
 *
 * @returns Lista de eventos de auditoría.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchPayrollArticleAuditTrail(id: number, limit = 200): Promise<PayrollArticleAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });

  const res = await httpFetch(`/payroll-articles/${id}/audit-trail?${qs}`);

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al cargar bitacora de articulos de nomina');
    throw new Error(message);
  }

  return res.json();
}
