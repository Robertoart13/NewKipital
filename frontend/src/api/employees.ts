import { httpFetch } from '../interceptors/httpInterceptor';

export interface EmployeeFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  idDepartamento?: number;
  idPuesto?: number;
  estado?: number;
  includeInactive?: boolean;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DepartmentRef {
  id: number;
  nombre: string;
}

export interface PositionRef {
  id: number;
  nombre: string;
}

export interface PayPeriodRef {
  id: number;
  nombre: string;
  dias: number;
}

export interface EmployeeListItem {
  id: number;
  idEmpresa: number;
  codigo: string;
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2?: string | null;
  email: string;
  telefono?: string | null;
  estado: number;
  departamento?: DepartmentRef | null;
  puesto?: PositionRef | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  apellido2?: string | null;
  genero?: string | null;
  estadoCivil?: string | null;
  cantidadHijos?: number;
  telefono?: string | null;
  direccion?: string | null;
  idDepartamento?: number | null;
  idPuesto?: number | null;
  idSupervisor?: number | null;
  supervisor?: { id: number; nombre: string; apellido1: string } | null;
  fechaIngreso: string;
  fechaSalida?: string | null;
  motivoSalida?: string | null;
  tipoContrato?: string | null;
  jornada?: string | null;
  idPeriodoPago?: number | null;
  periodoPago?: PayPeriodRef | null;
  salarioBase?: number | null;
  monedaSalario?: string;
  numeroCcss?: string | null;
  cuentaBanco?: string | null;
  vacacionesAcumuladas?: string | null;
  cesantiaAcumulada?: string | null;
  idUsuario?: number | null;
  fechaCreacion?: string;
  fechaModificacion?: string;
  creadoPor?: number | null;
  modificadoPor?: number | null;
}

export interface CreateEmployeePayload {
  idEmpresa: number;
  codigo: string;
  cedula: string;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  email: string;
  genero?: string;
  estadoCivil?: string;
  cantidadHijos?: number;
  telefono?: string;
  direccion?: string;
  idDepartamento?: number;
  idPuesto?: number;
  idSupervisor?: number;
  fechaIngreso: string;
  tipoContrato?: string;
  jornada?: string;
  idPeriodoPago?: number;
  salarioBase?: number;
  monedaSalario?: string;
  numeroCcss?: string;
  cuentaBanco?: string;
  vacacionesAcumuladas?: string;
  cesantiaAcumulada?: string;
  provisionesAguinaldo?: EmployeeAguinaldoProvisionPayload[];
  crearAccesoTimewise?: boolean;
  crearAccesoKpital?: boolean;
  idRolTimewise?: number;
  idRolKpital?: number;
  passwordInicial?: string;
}

export interface EmployeeAguinaldoProvisionPayload {
  idEmpresa: number;
  montoProvisionado: number;
  fechaInicioLaboral: string;
  fechaFinLaboral?: string;
  registroEmpresa?: string;
  estado?: 1 | 2;
}

export interface UpdateEmployeePayload {
  cedula?: string;
  nombre?: string;
  apellido1?: string;
  apellido2?: string;
  email?: string;
  genero?: string;
  estadoCivil?: string;
  cantidadHijos?: number;
  telefono?: string;
  direccion?: string;
  idDepartamento?: number;
  idPuesto?: number;
  idSupervisor?: number;
  fechaIngreso?: string;
  fechaSalida?: string;
  tipoContrato?: string;
  jornada?: string;
  idPeriodoPago?: number;
  salarioBase?: number;
  monedaSalario?: string;
  numeroCcss?: string;
  cuentaBanco?: string;
}

/**
 * GET /employees/supervisors?idEmpresa=N - Lista empleados elegibles como supervisores (rol Supervisor o Supervisor Global en TimeWise).
 */
export async function fetchSupervisors(companyId: string): Promise<{ id: number; nombre: string; apellido1: string }[]> {
  const res = await httpFetch(`/employees/supervisors?idEmpresa=${companyId}`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * GET /employees[?idEmpresa=N] - Lista empleados con paginación y filtros.
 */
export async function fetchEmployees(
  companyId?: string | null,
  filters?: EmployeeFilters,
): Promise<PaginatedResponse<EmployeeListItem>> {
  const params = new URLSearchParams();
  if (companyId) params.set('idEmpresa', companyId);
  if (filters?.includeInactive) params.set('includeInactive', 'true');
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.idDepartamento) params.set('idDepartamento', String(filters.idDepartamento));
  if (filters?.idPuesto) params.set('idPuesto', String(filters.idPuesto));
  if (filters?.estado !== undefined) params.set('estado', String(filters.estado));
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.order) params.set('order', filters.order);
  const res = await httpFetch(`/employees?${params}`);
  if (!res.ok) throw new Error('Error al cargar empleados');
  return res.json();
}

/**
 * GET /employees/:id - Detalle de empleado con relaciones.
 */
export async function fetchEmployee(id: number): Promise<EmployeeDetail> {
  const res = await httpFetch(`/employees/${id}`);
  if (!res.ok) throw new Error('Error al cargar empleado');
  return res.json();
}

/**
 * POST /employees - Crear empleado.
 */
export async function createEmployee(payload: CreateEmployeePayload): Promise<{
  success: boolean;
  data: { employee: EmployeeDetail; appsAssigned: string[] };
}> {
  const res = await httpFetch('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al crear empleado');
  }
  return res.json();
}

/**
 * PUT /employees/:id - Actualizar empleado.
 */
export async function updateEmployee(
  id: number,
  payload: UpdateEmployeePayload,
): Promise<EmployeeDetail> {
  const res = await httpFetch(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al actualizar empleado');
  }
  return res.json();
}

/**
 * PATCH /employees/:id/inactivate - Inactivar empleado.
 */
export async function inactivateEmployee(id: number, motivo?: string): Promise<EmployeeDetail> {
  const res = await httpFetch(`/employees/${id}/inactivate`, {
    method: 'PATCH',
    body: motivo ? JSON.stringify({ motivo }) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al inactivar empleado');
  }
  return res.json();
}

/**
 * PATCH /employees/:id/liquidar - Liquidar empleado.
 */
export async function liquidateEmployee(
  id: number,
  fechaSalida: string,
  motivo?: string,
): Promise<EmployeeDetail> {
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
 * PATCH /employees/:id/reactivate - Reactivar empleado.
 */
export async function reactivateEmployee(id: number): Promise<EmployeeDetail> {
  const res = await httpFetch(`/employees/${id}/reactivate`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al reactivar empleado');
  }
  return res.json();
}
