/* =============================================================================
   MODULE: catalogs
   =============================================================================

   Capa de acceso a datos para catálogos generales compartidos.

   Responsabilidades:
   - Consultar departamentos disponibles
   - Consultar puestos disponibles
   - Consultar períodos de pago disponibles

   Decisiones de diseño:
   - Todas las solicitudes HTTP se canalizan mediante `httpFetch`
   - Los catálogos retornan estructuras reducidas (id + nombre) para uso en selectores
   - Este módulo no realiza transformación de datos, solo los expone tipados

   ============================================================================= */

import { httpFetch } from '../interceptors/httpInterceptor';

/* =============================================================================
   INTERFACES DE DOMINIO
   ============================================================================= */

/**
 * ============================================================================
 * Catalog Department
 * ============================================================================
 *
 * Representa un departamento del catálogo general.
 *
 * Se utiliza en selectores de empleados y filtros de búsqueda.
 * Contiene únicamente los campos necesarios para presentación.
 *
 * ============================================================================
 */
export interface CatalogDepartment {
  /** Identificador único del departamento. */
  id: number;

  /** Nombre visible del departamento. */
  nombre: string;
}

/**
 * ============================================================================
 * Catalog Position
 * ============================================================================
 *
 * Representa un puesto de trabajo del catálogo general.
 *
 * Se utiliza en selectores de empleados y filtros de búsqueda.
 *
 * ============================================================================
 */
export interface CatalogPosition {
  /** Identificador único del puesto. */
  id: number;

  /** Nombre visible del puesto. */
  nombre: string;
}

/**
 * ============================================================================
 * Catalog Pay Period
 * ============================================================================
 *
 * Representa un período de pago del catálogo.
 *
 * Ejemplos:
 * - Semanal (7 días)
 * - Quincenal (15 días)
 * - Mensual (30 días)
 *
 * ============================================================================
 */
export interface CatalogPayPeriod {
  /** Identificador único del período de pago. */
  id: number;

  /** Nombre descriptivo del período. */
  nombre: string;

  /** Cantidad de días que comprende el período. */
  dias: number;
}

/* =============================================================================
   API: CATÁLOGOS
   ============================================================================= */

/**
 * ============================================================================
 * Fetch Departments
 * ============================================================================
 *
 * Obtiene la lista de departamentos disponibles para uso en catálogos
 * y selectores de la aplicación.
 *
 * @returns Lista de departamentos con id y nombre.
 *
 * @throws {Error} Si el servidor responde con un status no-OK.
 *
 * ============================================================================
 */
export async function fetchDepartments(): Promise<CatalogDepartment[]> {
  /** Ejecuta GET /catalogs/departments para obtener el catálogo. */
  const res = await httpFetch('/catalogs/departments');

  /** Valida que la respuesta haya sido exitosa. */
  if (!res.ok) throw new Error('Error al cargar departamentos');

  /** Retorna la lista de departamentos deserializada. */
  return res.json();
}

/**
 * ============================================================================
 * Fetch Positions
 * ============================================================================
 *
 * Obtiene la lista de puestos disponibles para uso en catálogos
 * y selectores de la aplicación.
 *
 * @returns Lista de puestos con id y nombre.
 *
 * @throws {Error} Si el servidor responde con un status no-OK.
 *
 * ============================================================================
 */
export async function fetchPositions(): Promise<CatalogPosition[]> {
  /** Ejecuta GET /catalogs/positions para obtener el catálogo. */
  const res = await httpFetch('/catalogs/positions');

  /** Valida que la respuesta haya sido exitosa. */
  if (!res.ok) throw new Error('Error al cargar puestos');

  /** Retorna la lista de puestos deserializada. */
  return res.json();
}

/**
 * ============================================================================
 * Fetch Pay Periods
 * ============================================================================
 *
 * Obtiene la lista de períodos de pago disponibles para la configuración
 * de empleados y planillas.
 *
 * @returns Lista de períodos con id, nombre y cantidad de días.
 *
 * @throws {Error} Si el servidor responde con un status no-OK.
 *
 * ============================================================================
 */
export async function fetchPayPeriods(): Promise<CatalogPayPeriod[]> {
  /** Ejecuta GET /catalogs/pay-periods para obtener el catálogo. */
  const res = await httpFetch('/catalogs/pay-periods');

  /** Valida que la respuesta haya sido exitosa. */
  if (!res.ok) throw new Error('Error al cargar periodos de pago');

  /** Retorna la lista de períodos de pago deserializada. */
  return res.json();
}
