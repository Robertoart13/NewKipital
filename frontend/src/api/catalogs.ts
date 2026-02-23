import { httpFetch } from '../interceptors/httpInterceptor';
export interface CatalogDepartment {
  id: number;
  nombre: string;
}

export interface CatalogPosition {
  id: number;
  nombre: string;
}

export interface CatalogPayPeriod {
  id: number;
  nombre: string;
  dias: number;
}

export async function fetchDepartments(): Promise<CatalogDepartment[]> {
  const res = await httpFetch('/catalogs/departments');
  if (!res.ok) throw new Error('Error al cargar departamentos');
  return res.json();
}

export async function fetchPositions(): Promise<CatalogPosition[]> {
  const res = await httpFetch('/catalogs/positions');
  if (!res.ok) throw new Error('Error al cargar puestos');
  return res.json();
}

export async function fetchPayPeriods(): Promise<CatalogPayPeriod[]> {
  const res = await httpFetch('/catalogs/pay-periods');
  if (!res.ok) throw new Error('Error al cargar periodos de pago');
  return res.json();
}
