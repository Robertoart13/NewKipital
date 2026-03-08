/* =============================================================================
   MODULE: companies
   =============================================================================

   Capa de acceso a datos para el módulo de Empresas.

   Responsabilidades:
   - Consultar empresas activas e inactivas
   - Obtener el detalle de una empresa específica
   - Crear y actualizar empresas
   - Inactivar y reactivar registros
   - Gestionar el logo de la empresa (subida en dos fases: temp + commit)
   - Obtener el logo de forma autenticada como Blob
   - Consultar bitácora de auditoría

   Decisiones de diseño:
   - Todas las solicitudes HTTP se canalizan mediante `httpFetch`
   - El logo se maneja en dos fases para evitar exponer el token en atributos src
   - La inactivación puede fallar con un error enriquecido cuando hay planillas activas
   - `fetchAllCompaniesForHistory` existe para vistas históricas que necesitan
     todas las empresas sin importar su estado

   ============================================================================= */

import { API_URL } from '../config/api';
import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Company List Item
 * ============================================================================
 *
 * Representa un elemento de la lista de empresas retornado por la API.
 *
 * Incluye datos de identificación, contacto, integración ERP,
 * estado lógico y referencia al logo.
 *
 * ============================================================================
 */
export interface CompanyListItem {
  /** Identificador único de la empresa. */
  id: number;

  /** Nombre comercial de la empresa. */
  nombre: string;

  /** Razón social o nombre legal; opcional. */
  nombreLegal?: string;

  /** Número de cédula jurídica; opcional. */
  cedula?: string;

  /** Actividad económica registrada; puede ser nula. */
  actividadEconomica?: string | null;

  /** Prefijo utilizado para códigos internos; puede ser nulo. */
  prefijo?: string | null;

  /** Identificador externo para integración con ERP; puede ser nulo. */
  idExterno?: string | null;

  /** Dirección exacta de la empresa; puede ser nula. */
  direccionExacta?: string | null;

  /** Teléfono de contacto; puede ser nulo. */
  telefono?: string | null;

  /** Correo electrónico de contacto; puede ser nulo. */
  email?: string | null;

  /** Código postal; puede ser nulo. */
  codigoPostal?: string | null;

  /** Fecha ISO en que fue inactivada la empresa; puede ser nula. */
  fechaInactivacion?: string | null;

  /** URL pública del logo de la empresa; opcional. */
  logoUrl?: string;

  /** Ruta interna del archivo de logo en el servidor; puede ser nula. */
  logoPath?: string | null;

  /**
   * Estado de la empresa.
   * - 1 = activa
   * - 0 o null = inactiva
   */
  estado?: number;
}

/**
 * ============================================================================
 * Company Payload
 * ============================================================================
 *
 * Payload utilizado para crear o actualizar una empresa.
 *
 * Excluye campos controlados por el backend:
 * - id
 * - logoUrl / logoPath
 * - fechas de auditoría
 * - estado
 *
 * ============================================================================
 */
export interface CompanyPayload {
  /** Nombre comercial de la empresa. */
  nombre: string;

  /** Razón social o nombre legal. */
  nombreLegal: string;

  /** Número de cédula jurídica. */
  cedula: string;

  /** Actividad económica; opcional. */
  actividadEconomica?: string;

  /** Prefijo para códigos internos. */
  prefijo: string;

  /** Identificador externo para ERP; opcional. */
  idExterno?: string;

  /** Dirección exacta; opcional. */
  direccionExacta?: string;

  /** Teléfono de contacto; opcional. */
  telefono?: string;

  /** Email de contacto; opcional. */
  email?: string;

  /** Código postal; opcional. */
  codigoPostal?: string;
}

/**
 * ============================================================================
 * Company Logo Temp Payload
 * ============================================================================
 *
 * Respuesta del endpoint de subida temporal de logo (fase 1 del flujo de 2 fases).
 *
 * El archivo queda almacenado temporalmente hasta que se confirma con
 * `commitCompanyLogo`.
 *
 * ============================================================================
 */
export interface CompanyLogoTempPayload {
  /** Nombre del archivo temporal en el servidor. */
  tempFileName: string;

  /** Ruta del archivo temporal en el servidor. */
  tempPath: string;

  /** Tamaño del archivo en bytes. */
  size: number;

  /** Tipo MIME del archivo (ej: image/png). */
  mimeType: string;
}

/**
 * ============================================================================
 * Company Logo Commit Payload
 * ============================================================================
 *
 * Respuesta del endpoint de confirmación del logo (fase 2 del flujo de 2 fases).
 *
 * Una vez confirmado, el logo queda definitivamente asignado a la empresa.
 *
 * ============================================================================
 */
export interface CompanyLogoCommitPayload {
  /** Nombre definitivo del archivo de logo. */
  logoFileName: string;

  /** Ruta definitiva del archivo de logo en el servidor. */
  logoPath: string;

  /** URL pública accesible del logo. */
  logoUrl: string;
}

/**
 * ============================================================================
 * Company Audit Trail Item
 * ============================================================================
 *
 * Representa un evento dentro de la bitácora de auditoría de una empresa.
 *
 * ============================================================================
 */
export interface CompanyAuditTrailItem {
  /** Identificador único del evento de auditoría. */
  id: string;

  /** Módulo que originó el evento. */
  modulo: string;

  /** Acción ejecutada sobre la entidad. */
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
 * @param fallbackMessage - Mensaje genérico de respaldo.
 *
 * @returns Mensaje final listo para ser lanzado como excepción.
 *
 * ============================================================================
 */
async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
  const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(error?.message) ? error?.message.join(', ') : error?.message;
  return message || fallbackMessage;
}

/* =============================================================================
   API: OPERACIONES CRUD
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Companies
 * ============================================================================
 *
 * Obtiene la lista de empresas con filtro opcional por estado.
 *
 * - Por defecto retorna únicamente empresas activas.
 * - Con `showInactive = true` retorna solo inactivas.
 *
 * @param showInactive - Si es `true`, retorna únicamente registros inactivos.
 *
 * @returns Lista de empresas.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchCompanies(showInactive = false): Promise<CompanyListItem[]> {
  const params = new URLSearchParams();

  if (showInactive) {
    params.set('inactiveOnly', 'true');
  }

  const qs = params.toString();
  const res = await httpFetch(`/companies${qs ? `?${qs}` : ''}`);

  if (!res.ok) throw new Error('Error al cargar empresas');

  return res.json();
}

/**
 * ============================================================================
 * Fetch All Companies For History
 * ============================================================================
 *
 * Obtiene todas las empresas sin importar su estado (activas e inactivas).
 *
 * Se utiliza en vistas de historial donde se necesita mostrar registros
 * asociados a empresas que ya fueron inactivadas.
 *
 * @returns Lista completa de empresas.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchAllCompaniesForHistory(): Promise<CompanyListItem[]> {
  const params = new URLSearchParams();

  /** Incluye empresas inactivas en el resultado. */
  params.set('includeInactive', 'true');

  /** Solicita todas las empresas sin paginación. */
  params.set('all', 'true');

  const res = await httpFetch(`/companies?${params.toString()}`);

  if (!res.ok) throw new Error('Error al cargar empresas de historial');

  return res.json();
}

/**
 * ============================================================================
 * Fetch Company
 * ============================================================================
 *
 * Obtiene el detalle completo de una empresa por su identificador.
 *
 * @param id - Identificador único de la empresa.
 *
 * @returns Objeto con el detalle de la empresa.
 *
 * @throws {Error} Si la empresa no existe o la petición falla.
 *
 * ============================================================================
 */
export async function fetchCompany(id: number): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}`);

  if (!res.ok) throw new Error('Error al cargar empresa');

  return res.json();
}

/**
 * ============================================================================
 * Create Company
 * ============================================================================
 *
 * Crea una nueva empresa en el sistema.
 *
 * @param payload - Datos de la nueva empresa.
 *
 * @returns La empresa creada por el servidor.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function createCompany(payload: CompanyPayload): Promise<CompanyListItem> {
  const res = await httpFetch('/companies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al crear empresa');
    throw new Error(message);
  }

  return res.json();
}

/**
 * ============================================================================
 * Update Company
 * ============================================================================
 *
 * Actualiza parcialmente una empresa existente.
 *
 * @param id      - Identificador de la empresa a actualizar.
 * @param payload - Campos a modificar.
 *
 * @returns La empresa actualizada.
 *
 * @throws {Error} Si ocurre un error de validación o una falla general.
 *
 * ============================================================================
 */
export async function updateCompany(id: number, payload: Partial<CompanyPayload>): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al actualizar empresa');
    throw new Error(message);
  }

  return res.json();
}

/* =============================================================================
   API: GESTIÓN DE ESTADO
   ============================================================================= */

/**
 * ============================================================================
 * Inactivate Company
 * ============================================================================
 *
 * Inactiva una empresa mediante soft-delete.
 *
 * Esta operación puede ser bloqueada por el backend si la empresa
 * tiene planillas activas. En ese caso se lanza un error enriquecido
 * con el campo `response.planillas` para que el componente pueda
 * mostrar las planillas bloqueantes al usuario.
 *
 * @param id - Identificador de la empresa a inactivar.
 *
 * @returns La empresa marcada como inactiva.
 *
 * @throws {Error & { response?: { code?: string; planillas?: { id: number }[] } }}
 *   Error enriquecido con las planillas bloqueantes si las hay.
 *
 * ============================================================================
 */
export async function inactivateCompany(id: number): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}/inactivate`, { method: 'PATCH' });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message ?? 'Error al inactivar empresa';

    /** Extiende el Error con el body completo para que el UI acceda a `planillas`. */
    const e = new Error(msg) as Error & {
      response?: { code?: string; planillas?: { id: number }[] };
    };
    e.response = body;
    throw e;
  }

  return res.json();
}

/**
 * ============================================================================
 * Reactivate Company
 * ============================================================================
 *
 * Reactiva una empresa previamente inactivada.
 *
 * @param id - Identificador de la empresa a reactivar.
 *
 * @returns La empresa reactivada.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function reactivateCompany(id: number): Promise<CompanyListItem> {
  const res = await httpFetch(`/companies/${id}/reactivate`, { method: 'PATCH' });

  if (!res.ok) throw new Error('Error al reactivar empresa');

  return res.json();
}

/* =============================================================================
   API: LOGO DE EMPRESA
   ============================================================================= */

/**
 * ============================================================================
 * Get Company Logo URL
 * ============================================================================
 *
 * Construye la URL del logo de la empresa para uso en contextos donde
 * no se requiere autenticación en la petición de imagen.
 *
 * El parámetro `bustCache` agrega un timestamp que fuerza al navegador
 * a recargar la imagen después de un cambio de logo.
 *
 * @param companyId - ID de la empresa.
 * @param bustCache - Si es `true`, agrega timestamp para invalidar caché.
 *
 * @returns URL absoluta al endpoint de logo.
 *
 * ============================================================================
 */
export function getCompanyLogoUrl(companyId: number, bustCache = false): string {
  const suffix = bustCache ? `?t=${Date.now()}` : '';
  return `${API_URL}/companies/${companyId}/logo${suffix}`;
}

/**
 * ============================================================================
 * Upload Company Logo Temp
 * ============================================================================
 *
 * Sube un archivo de logo temporalmente al servidor (fase 1 de 2).
 *
 * El archivo queda en almacenamiento temporal hasta que se confirma
 * con `commitCompanyLogo`. Esto permite validar el archivo antes
 * de asignarlo definitivamente a la empresa.
 *
 * @param file - Archivo de imagen a subir.
 *
 * @returns Información del archivo temporal (nombre, ruta, tamaño, mimeType).
 *
 * @throws {Error} Si la subida falla.
 *
 * ============================================================================
 */
export async function uploadCompanyLogoTemp(file: File): Promise<CompanyLogoTempPayload> {
  const formData = new FormData();

  /** Agrega el archivo bajo la clave esperada por el backend. */
  formData.append('file', file);

  const res = await httpFetch('/companies/logo/temp', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al subir logo temporal');
    throw new Error(message);
  }

  return res.json();
}

/**
 * ============================================================================
 * Commit Company Logo
 * ============================================================================
 *
 * Confirma el logo temporal y lo asigna definitivamente a la empresa (fase 2 de 2).
 *
 * Recibe el nombre del archivo temporal devuelto por `uploadCompanyLogoTemp`
 * y el backend lo mueve a almacenamiento permanente.
 *
 * @param companyId    - ID de la empresa destino.
 * @param tempFileName - Nombre del archivo temporal a confirmar.
 *
 * @returns Datos finales del logo asignado.
 *
 * @throws {Error} Si la operación falla.
 *
 * ============================================================================
 */
export async function commitCompanyLogo(companyId: number, tempFileName: string): Promise<CompanyLogoCommitPayload> {
  const res = await httpFetch(`/companies/${companyId}/logo/commit`, {
    method: 'POST',
    body: JSON.stringify({ tempFileName }),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al confirmar logo');
    throw new Error(message);
  }

  return res.json();
}

/**
 * ============================================================================
 * Fetch Company Logo Blob URL
 * ============================================================================
 *
 * Descarga el logo de la empresa de forma autenticada y genera una
 * URL de objeto local (blob:) para mostrar en la UI.
 *
 * Este enfoque evita exponer el token de autenticación en atributos
 * `src` visibles en el DOM o en logs del navegador.
 *
 * @param companyId - ID de la empresa cuyo logo se desea mostrar.
 *
 * @returns URL de objeto local usable directamente en `<img src>`.
 *
 * @throws {Error} Si la descarga falla.
 *
 * ============================================================================
 */
export async function fetchCompanyLogoBlobUrl(companyId: number): Promise<string> {
  const res = await httpFetch(`/companies/${companyId}/logo`);

  if (!res.ok) {
    throw new Error('Error al cargar logo de empresa');
  }

  /** Convierte la respuesta binaria a un objeto Blob. */
  const blob = await res.blob();

  /** Genera una URL temporal de objeto local a partir del Blob. */
  return URL.createObjectURL(blob);
}

/* =============================================================================
   API: AUDITORÍA
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Company Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de auditoría de una empresa específica.
 *
 * @param companyId - Identificador de la empresa.
 * @param limit     - Número máximo de eventos a retornar. Por defecto `200`.
 *
 * @returns Lista de eventos de auditoría.
 *
 * @throws {Error} Si la petición falla.
 *
 * ============================================================================
 */
export async function fetchCompanyAuditTrail(companyId: number, limit = 200): Promise<CompanyAuditTrailItem[]> {
  const qs = new URLSearchParams({ limit: String(limit) });

  const res = await httpFetch(`/companies/${companyId}/audit-trail?${qs}`);

  if (!res.ok) {
    const message = await parseErrorMessage(res, 'Error al cargar bitacora de empresa');
    throw new Error(message);
  }

  return res.json();
}
