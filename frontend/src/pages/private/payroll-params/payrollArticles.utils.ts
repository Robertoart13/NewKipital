import type { PaneKey } from './payrollArticles.types';
import type { AccountingAccountOption, PayrollArticleListItem } from '../../../api/payrollArticles';

/**
 * @param account - Cuenta contable a formatear.
 * @returns Etiqueta legible con nombre y codigo si existe.
 */
export function formatAccountLabel(account?: AccountingAccountOption | null): string {
  if (!account) return '';
  const name = account.nombre?.trim();
  const code = account.codigo?.trim();
  if (name && code) return `${name} (${code})`;
  return name || code || '';
}

/**
 * @param row - Articulo de nomina.
 * @param key - Clave del filtro.
 * @param companies - Empresas visibles.
 * @param tipoArticuloMap - Mapa de tipos de articulo.
 * @param tipoAccionMap - Mapa de tipos de accion.
 * @param accountLabelMap - Mapa de cuentas por id.
 * @returns Valor de la fila para filtros.
 */
export function getPaneValue(
  row: PayrollArticleListItem,
  key: PaneKey,
  companies: Array<{ id: number; nombre: string }>,
  tipoArticuloMap: Map<number, string>,
  tipoAccionMap: Map<number, string>,
  accountLabelMap: Map<number, string>,
): string {
  const resolveAccountLabel = (value: number | string | null | undefined): string => {
    const accountId = Number(value);
    if (!Number.isFinite(accountId) || accountId <= 0) return '';
    return accountLabelMap.get(accountId) ?? `Cuenta #${accountId}`;
  };

  if (key === 'empresa') {
    const company = companies.find((c) => c.id === row.idEmpresa);
    return company?.nombre ?? `Empresa #${row.idEmpresa}`;
  }
  if (key === 'nombre') return row.nombre ?? '';
  if (key === 'tipoArticulo')
    return tipoArticuloMap.get(row.idTipoArticuloNomina) ?? `Tipo #${row.idTipoArticuloNomina}`;
  if (key === 'tipoAccion') return tipoAccionMap.get(row.idTipoAccionPersonal) ?? `Accion #${row.idTipoAccionPersonal}`;
  if (key === 'cuentaPrincipal') return resolveAccountLabel(row.idCuentaGasto);
  if (key === 'cuentaPasivo') {
    return row.idCuentaPasivo ? resolveAccountLabel(row.idCuentaPasivo) : '(vacio)';
  }
  return row.esInactivo === 0 ? 'Inactivo' : 'Activo';
}
