import type { PaneConfig, PayrollArticleTypeMeta } from './payrollArticles.types';

export const PAYROLL_ARTICLE_TYPE_META: Record<number, PayrollArticleTypeMeta> = {
  1: { primaryLabel: 'Cuenta Gasto', allowsPasivo: false, idsReferencia: [18, 19, 17] },
  2: { primaryLabel: 'Cuenta Pasivo', allowsPasivo: false, idsReferencia: [12, 13, 14] },
  9: { primaryLabel: 'Cuenta Costo', allowsPasivo: false, idsReferencia: [18, 19, 12] },
  10: { primaryLabel: 'Cuenta Gasto', secondaryLabel: 'Cuenta Pasivo (opcional)', allowsPasivo: true, idsReferencia: [18, 19, 13] },
};

export const PANE_CONFIG: PaneConfig[] = [
  { key: 'empresa', title: 'Empresa' },
  { key: 'nombre', title: 'Nombre Articulo' },
  { key: 'tipoArticulo', title: 'Tipo Articulo' },
  { key: 'tipoAccion', title: 'Tipo Accion' },
  { key: 'cuentaPrincipal', title: 'Cuenta Principal' },
  { key: 'cuentaPasivo', title: 'Cuenta Pasivo' },
  { key: 'estado', title: 'Estado' },
];
