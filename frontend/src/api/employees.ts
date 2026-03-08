/* =============================================================================
   MODULE: employees
   =============================================================================

   Capa de acceso a datos para el modulo de Empleados.

   Responsabilidades:
   - Listar empleados con paginacion y filtros
   - Obtener detalle de empleado
   - Crear, actualizar, inactivar, liquidar y reactivar empleados
   - Consultar supervisores elegibles
   - Consultar bitacora de auditoria

   Decisiones de diseno:
   - Todas las solicitudes HTTP se canalizan mediante httpFetch
   - Prioridad de filtros: companyIds (multiempresa) > companyId (individual)
   - Errores de validacion del backend se propagan via message

   ========================================================================== */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Employee Filters
 * ============================================================================
 *
 * Filtros opcionales para listar empleados.
 *
 * Prioridad: companyIds (multiempresa) > companyId (individual).
 *
 * ============================================================================
 */
export interface EmployeeFilters {
  /** Pagina solicitada. */
  page?: number;

  /** Cantidad de items por pagina. */
  pageSize?: number;

  /** Busqueda por codigo, cedula, nombre, email. */
  search?: string;

  /** Filtro por ID de departamento. */
  idDepartamento?: number;

  /** Filtro por ID de puesto. */
  idPuesto?: number;

  /** Filtro por estado (1 activo, 0 inactivo). */
  estado?: number;

  /** Incluir empleados inactivos en el resultado. */
  includeInactive?: boolean;

  /** Campo de ordenamiento. */
  sort?: string;

  /** Direccion ASC o DESC. */
  order?: 'ASC' | 'DESC';

  /** IDs de empresas para consulta multiempresa. */
  companyIds?: number[];
}

/**
 * ============================================================================
 * Paginated Response
 * ============================================================================
 *
 * Respuesta paginada generica de la API.
 *
 * ============================================================================
 */
export interface PaginatedResponse<T> {
  /** Lista de registros en la pagina actual. */
  data: T[];

  /** Total de registros que coinciden con los filtros. */
  total: number;

  /** Pagina actual (base 1). */
  page: number;

  /** Cantidad de items por pagina. */
  pageSize: number;
}

/**
 * Referencia liviana a un departamento.
 */
export interface DepartmentRef {
  /** ID del departamento. */
  id: number;

  /** Nombre del departamento. */
  nombre: string;
}

/**
 * Referencia liviana a un puesto.
 */
export interface PositionRef {
  /** ID del puesto. */
  id: number;

  /** Nombre del puesto. */
  nombre: string;
}

/**
 * Referencia liviana a un periodo de pago.
 */
export interface PayPeriodRef {
  /** ID del periodo. */
  id: number;

  /** Nombre descriptivo. */
  nombre: string;

  /** Cantidad de dias del periodo. */
  dias: number;
}

/**
 * ============================================================================
 * Employee List Item
 * ============================================================================
 *
 * Elemento de lista de empleados retornado por la API.
 *
 * ============================================================================
 */
export interface EmployeeListItem {
  /** Identificador del empleado. */
  id: number;

  /** ID de la empresa asociada. */
  idEmpresa: number;

  /** ID del periodo de pago; nulo si no aplica. */
  idPeriodoPago?: number | null;

  /** Codigo de moneda del salario; nulo si no aplica. */
  monedaSalario?: string | null;

  /** Codigo interno del empleado. */
  codigo: string;

  /** Cedula de identidad. */
  cedula: string;

  /** Nombre. */
  nombre: string;

  /** Primer apellido. */
  apellido1: string;

  /** Segundo apellido; opcional. */
  apellido2?: string | null;

  /** Correo electronico. */
  email: string;

  /** Telefono; opcional. */
  telefono?: string | null;

  /** Estado: 1 activo, 0 inactivo. */
  estado: number;

  /** Referencia al departamento; nula si no asignado. */
  departamento?: DepartmentRef | null;

  /** Referencia al puesto; nula si no asignado. */
  puesto?: PositionRef | null;
}

/**
 * ============================================================================
 * Employee Detail
 * ============================================================================
 *
 * Detalle completo de empleado con relaciones y datos extendidos.
 *
 * ============================================================================
 */
export interface EmployeeDetail extends EmployeeListItem {
  /** Segundo apellido; opcional. */
  apellido2?: string | null;

  /** Genero; opcional. */
  genero?: string | null;

  /** Estado civil; opcional. */
  estadoCivil?: string | null;

  /** Cantidad de hijos. */
  cantidadHijos?: number;

  /** Telefono; opcional. */
  telefono?: string | null;

  /** Direccion; opcional. */
  direccion?: string | null;

  /** ID del departamento; nulo si no asignado. */
  idDepartamento?: number | null;

  /** ID del puesto; nulo si no asignado. */
  idPuesto?: number | null;

  /** ID del supervisor; nulo si no aplica. */
  idSupervisor?: number | null;

  /** Referencia al supervisor; nula si no aplica. */
  supervisor?: { id: number; nombre: string; apellido1: string } | null;

  /** Fecha de ingreso (ISO). */
  fechaIngreso: string;

  /** Fecha de salida; nula si sigue activo. */
  fechaSalida?: string | null;

  /** Motivo de salida; nulo si no aplica. */
  motivoSalida?: string | null;

  /** Tipo de contrato; opcional. */
  tipoContrato?: string | null;

  /** Jornada laboral; opcional. */
  jornada?: string | null;

  /** ID del periodo de pago; nulo si no aplica. */
  idPeriodoPago?: number | null;

  /** Referencia al periodo de pago; nula si no aplica. */
  periodoPago?: PayPeriodRef | null;

  /** Salario base; nulo si no definido. */
  salarioBase?: number | null;

  /** Codigo de moneda del salario. */
  monedaSalario?: string;

  /** Numero CCSS; opcional. */
  numeroCcss?: string | null;

  /** Cuenta bancaria; opcional. */
  cuentaBanco?: string | null;

  /** Provision vacaciones acumuladas; opcional. */
  vacacionesAcumuladas?: string | null;

  /** Provision cesantia acumulada; opcional. */
  cesantiaAcumulada?: string | null;

  /** ID del usuario asociado en TimeWise/Kpital; nulo si no tiene acceso. */
  idUsuario?: number | null;

  /** Fecha de creacion (ISO). */
  fechaCreacion?: string;

  /** Fecha de ultima modificacion (ISO). */
  fechaModificacion?: string;

  /** ID del usuario que creo el registro; nulo si no aplica. */
  creadoPor?: number | null;

  /** ID del usuario que modifico; nulo si no aplica. */
  modificadoPor?: number | null;
}

/**
 * ============================================================================
 * Create Employee Payload
 * ============================================================================
 *
 * Payload para crear un empleado.
 *
 * El backend controla id, fechas de auditoria y flags de estado.
 *
 * ============================================================================
 */
export interface CreateEmployeePayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** Codigo interno del empleado. */
  codigo: string;

  /** Cedula de identidad. */
  cedula: string;

  /** Nombre. */
  nombre: string;

  /** Primer apellido. */
  apellido1: string;

  /** Segundo apellido; opcional. */
  apellido2?: string;

  /** Correo electronico. */
  email: string;

  /** Genero; opcional. */
  genero?: string;

  /** Estado civil; opcional. */
  estadoCivil?: string;

  /** Cantidad de hijos; opcional. */
  cantidadHijos?: number;

  /** Telefono; opcional. */
  telefono?: string;

  /** Direccion; opcional. */
  direccion?: string;

  /** ID del departamento; opcional. */
  idDepartamento?: number;

  /** ID del puesto; opcional. */
  idPuesto?: number;

  /** ID del supervisor; opcional. */
  idSupervisor?: number;

  /** Fecha de ingreso (ISO). */
  fechaIngreso: string;

  /** Tipo de contrato; opcional. */
  tipoContrato?: string;

  /** Jornada laboral; opcional. */
  jornada?: string;

  /** ID del periodo de pago; opcional. */
  idPeriodoPago?: number;

  /** Salario base; opcional. */
  salarioBase?: number;

  /** Codigo moneda; opcional. */
  monedaSalario?: string;

  /** Numero CCSS; opcional. */
  numeroCcss?: string;

  /** Cuenta bancaria; opcional. */
  cuentaBanco?: string;

  /** Provision vacaciones; opcional. */
  vacacionesAcumuladas?: string;

  /** Provision cesantia; opcional. */
  cesantiaAcumulada?: string;

  /** Provisiones de aguinaldo por empresa; opcional. */
  provisionesAguinaldo?: EmployeeAguinaldoProvisionPayload[];

  /** Crear acceso en TimeWise; opcional. */
  crearAccesoTimewise?: boolean;

  /** Crear acceso en Kpital; opcional. */
  crearAccesoKpital?: boolean;

  /** ID rol TimeWise; opcional. */
  idRolTimewise?: number;

  /** ID rol Kpital; opcional. */
  idRolKpital?: number;

  /** Password inicial; opcional. */
  passwordInicial?: string;
}

/**
 * Provision de aguinaldo por empresa para empleados multiempresa.
 */
export interface EmployeeAguinaldoProvisionPayload {
  /** ID de la empresa. */
  idEmpresa: number;

  /** Monto provisionado. */
  montoProvisionado: number;

  /** Fecha inicio laboral (ISO). */
  fechaInicioLaboral: string;

  /** Fecha fin laboral; opcional. */
  fechaFinLaboral?: string;

  /** Registro empresa; opcional. */
  registroEmpresa?: string;

  /** Estado: 1 activo, 2 inactivo; opcional. */
  estado?: 1 | 2;
}

/**
 * ============================================================================
 * Update Employee Payload
 * ============================================================================
 *
 * Campos opcionales para actualizar un empleado.
 *
 * Solo se envian los campos modificados.
 *
 * ============================================================================
 */
export interface UpdateEmployeePayload {
  /** Cedula; opcional. */
  cedula?: string;

  /** Nombre; opcional. */
  nombre?: string;

  /** Primer apellido; opcional. */
  apellido1?: string;

  /** Segundo apellido; opcional. */
  apellido2?: string;

  /** Email; opcional. */
  email?: string;

  /** Genero; opcional. */
  genero?: string;

  /** Estado civil; opcional. */
  estadoCivil?: string;

  /** Cantidad hijos; opcional. */
  cantidadHijos?: number;

  /** Telefono; opcional. */
  telefono?: string;

  /** Direccion; opcional. */
  direccion?: string;

  /** ID departamento; opcional. */
  idDepartamento?: number;

  /** ID puesto; opcional. */
  idPuesto?: number;

  /** ID supervisor; opcional. */
  idSupervisor?: number;

  /** Fecha ingreso; opcional. */
  fechaIngreso?: string;

  /** Fecha salida; opcional. */
  fechaSalida?: string;

  /** Motivo salida; opcional. */
  motivoSalida?: string;

  /** Tipo contrato; opcional. */
  tipoContrato?: string;

  /** Jornada; opcional. */
  jornada?: string;

  /** ID periodo pago; opcional. */
  idPeriodoPago?: number;

  /** Salario base; opcional. */
  salarioBase?: number;

  /** Moneda salario; opcional. */
  monedaSalario?: string;

  /** Numero CCSS; opcional. */
  numeroCcss?: string;

  /** Cuenta banco; opcional. */
  cuentaBanco?: string;

  /** Vacaciones acumuladas; opcional. */
  vacacionesAcumuladas?: string;

  /** Cesantia acumulada; opcional. */
  cesantiaAcumulada?: string;
}

/**
 * Cambio individual dentro de un evento de auditoria.
 */
export interface EmployeeAuditTrailChange {
  /** Nombre del campo afectado. */
  campo: string;

  /** Valor anterior serializado. */
  antes: string;

  /** Valor posterior serializado. */
  despues: string;
}

/**
 * ============================================================================
 * Employee Audit Trail Item
 * ============================================================================
 *
 * Elemento del historial de auditoria del empleado.
 *
 * ============================================================================
 */
export interface EmployeeAuditTrailItem {
  /** ID del evento de auditoria. */
  id: string;

  /** Modulo que origino el evento. */
  modulo: string;

  /** Accion ejecutada. */
  accion: string;

  /** Entidad afectada. */
  entidad: string;

  /** ID de la entidad; nulo si no aplica. */
  entidadId?: string | null;

  /** ID del usuario actor; nulo si no aplica. */
  actorUserId?: number | null;

  /** Nombre del actor; nulo si no aplica. */
  actorNombre?: string | null;

  /** Email del actor; nulo si no aplica. */
  actorEmail?: string | null;

  /** Descripcion textual del evento. */
  descripcion: string;

  /** Fecha de creacion (ISO); nula si no aplica. */
  fechaCreacion?: string | null;

  /** Metadata libre; nula si no aplica. */
  metadata?: Record<string, unknown> | null;

  /** Lista de cambios realizados; vacia en creacion. */
  cambios?: EmployeeAuditTrailChange[];
}

/* =============================================================================
   API: OPERACIONES
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Supervisors
 * ============================================================================
 *
 * Lista empleados elegibles como supervisores (rol Supervisor, Supervisor Global
 * o Master en TimeWise). Incluye todas las empresas a las que el usuario tiene
 * acceso.
 *
 * @returns Lista de supervisores o array vacio si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchSupervisors(): Promise<{ id: number; nombre: string; apellido1: string }[]> {
  /** Ejecuta la solicitud al endpoint de supervisores. */
  const res = await httpFetch('/employees/supervisors');

  /** Retorna array vacio si falla; el UI no bloquea por esto. */
  if (!res.ok) return [];

  return res.json();
}

/**
 * ============================================================================
 * Fetch Employees
 * ============================================================================
 *
 * Lista empleados con paginacion y filtros.
 *
 * Prioridad de filtros:
 * - companyIds para consulta multiempresa
 * - companyId para consulta individual
 *
 * @param companyId - ID de empresa individual (opcional).
 * @param filters - Filtros opcionales (pagina, busqueda, departamento, etc.).
 *
 * @returns Lista paginada de empleados.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchEmployees(
  companyId?: string | null,
  filters?: EmployeeFilters,
): Promise<PaginatedResponse<EmployeeListItem>> {
  /** Inicializa el contenedor de query params. */
  const params = new URLSearchParams();

  /** Prioridad: companyIds (multiempresa) > companyId (individual). */
  if (filters?.companyIds?.length) {
    params.set('idEmpresas', filters.companyIds.join(','));
  } else if (companyId) {
    params.set('idEmpresa', companyId);
  }

  /** Aplica filtros opcionales. */
  if (filters?.includeInactive) params.set('includeInactive', 'true');
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.idDepartamento) params.set('idDepartamento', String(filters.idDepartamento));
  if (filters?.idPuesto) params.set('idPuesto', String(filters.idPuesto));
  if (filters?.estado !== undefined) params.set('estado', String(filters.estado));
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.order) params.set('order', filters.order);

  /** Ejecuta la solicitud. */
  const res = await httpFetch(`/employees?${params}`);

  if (!res.ok) throw new Error('Error al cargar empleados');
  return res.json();
}

/**
 * ============================================================================
 * Fetch Employee
 * ============================================================================
 *
 * Obtiene el detalle de un empleado con relaciones.
 *
 * @param id - ID del empleado.
 *
 * @returns Detalle completo del empleado.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchEmployee(id: number): Promise<EmployeeDetail> {
  /** Ejecuta la solicitud al detalle del empleado. */
  const res = await httpFetch(`/employees/${id}`);

  if (!res.ok) throw new Error('Error al cargar empleado');
  return res.json();
}

/**
 * ============================================================================
 * Create Employee
 * ============================================================================
 *
 * Crea un nuevo empleado.
 *
 * @param payload - Datos del empleado a crear.
 *
 * @returns Empleado creado y apps asignadas.
 *
 * @throws {Error} Si la peticion falla (incluye validaciones del backend).
 *
 * ============================================================================
 */
export async function createEmployee(payload: CreateEmployeePayload): Promise<{
  success: boolean;
  data?: { employee: EmployeeDetail; appsAssigned: string[] };
  error?: string;
}> {
  /** Ejecuta POST con el payload del empleado. */
  const res = await httpFetch('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  /** Extrae mensaje de validacion del backend si falla. */
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const errorMessage = Array.isArray(err.message)
      ? err.message.join('\n')
      : err.message || 'Error al crear empleado';
    throw new Error(errorMessage);
  }
  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { employee: EmployeeDetail; appsAssigned: string[] }; error?: string }
    | null;
  if (body?.success === false) {
    throw new Error(body.error || 'No se pudo crear empleado');
  }
  return body ?? { success: true };
}

/**
 * ============================================================================
 * Update Employee
 * ============================================================================
 *
 * Actualiza los datos de un empleado.
 *
 * @param id - ID del empleado.
 * @param payload - Campos a actualizar.
 *
 * @returns Empleado actualizado.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function updateEmployee(id: number, payload: UpdateEmployeePayload): Promise<EmployeeDetail> {
  /** Ejecuta PUT con los campos a actualizar. */
  const res = await httpFetch(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  /** Extrae mensaje de validacion si falla. */
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const errorMessage = Array.isArray(err.message)
      ? err.message.join('\n')
      : err.message || 'Error al actualizar empleado';
    throw new Error(errorMessage);
  }
  return res.json();
}

/**
 * ============================================================================
 * Inactivate Employee
 * ============================================================================
 *
 * Inactiva un empleado. El error puede incluir planillas o acciones bloqueantes.
 *
 * @param id - ID del empleado.
 * @param motivo - Motivo de inactivacion (opcional).
 *
 * @returns Empleado inactivado.
 *
 * @throws {Error} Si la peticion falla. La propiedad response puede contener
 *                 code, planillas o acciones para diagnostico.
 *
 * ============================================================================
 */
export async function inactivateEmployee(id: number, motivo?: string): Promise<EmployeeDetail> {
  /** Ejecuta PATCH con motivo opcional. */
  const res = await httpFetch(`/employees/${id}/inactivate`, {
    method: 'PATCH',
    body: motivo ? JSON.stringify({ motivo }) : undefined,
  });

  /** Enriquece el error con planillas/acciones bloqueantes para el UI. */
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || 'Error al inactivar empleado';
    const e = new Error(msg) as Error & {
      response?: { code?: string; planillas?: unknown[]; acciones?: unknown[] };
    };
    e.response = body;
    throw e;
  }
  return res.json();
}

/**
 * ============================================================================
 * Liquidate Employee
 * ============================================================================
 *
 * Liquida un empleado con fecha de salida.
 *
 * @param id - ID del empleado.
 * @param fechaSalida - Fecha de salida.
 * @param motivo - Motivo opcional.
 *
 * @returns Empleado liquidado.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function liquidateEmployee(id: number, fechaSalida: string, motivo?: string): Promise<EmployeeDetail> {
  /** Ejecuta PATCH con fecha de salida y motivo opcional. */
  const res = await httpFetch(`/employees/${id}/liquidar`, {
    method: 'PATCH',
    body: JSON.stringify({ fechaSalida, motivo }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al liquidar empleado');
  }
  return res.json();
}

/**
 * ============================================================================
 * Reactivate Employee
 * ============================================================================
 *
 * Reactiva un empleado previamente inactivado.
 *
 * @param id - ID del empleado.
 *
 * @returns Empleado reactivado.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function reactivateEmployee(id: number): Promise<EmployeeDetail> {
  /** Ejecuta PATCH para reactivar. */
  const res = await httpFetch(`/employees/${id}/reactivate`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al reactivar empleado');
  }
  return res.json();
}

/**
 * ============================================================================
 * Fetch Employee Audit Trail
 * ============================================================================
 *
 * Obtiene el historial de cambios del empleado.
 *
 * @param id - ID del empleado.
 * @param limit - Limite de registros (default 200).
 *
 * @returns Lista de eventos de auditoria.
 *
 * @throws {Error} Si la peticion falla.
 *
 * ============================================================================
 */
export async function fetchEmployeeAuditTrail(id: number, limit = 200): Promise<EmployeeAuditTrailItem[]> {
  /** Construye query con limite de registros. */
  const params = new URLSearchParams();
  params.set('limit', String(limit));

  /** Ejecuta la solicitud al endpoint de bitacora. */
  const res = await httpFetch(`/employees/${id}/audit-trail?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al cargar bitacora del empleado');
  }
  return res.json();
}
