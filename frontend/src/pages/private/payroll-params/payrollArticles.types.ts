export type PaneKey =
  | 'empresa'
  | 'nombre'
  | 'tipoArticulo'
  | 'tipoAccion'
  | 'cuentaPrincipal'
  | 'cuentaPasivo'
  | 'estado';

export interface PaneConfig {
  key: PaneKey;
  title: string;
}

export interface PaneOption {
  value: string;
  count: number;
}

export interface PayrollArticleFormValues {
  idEmpresa?: number;
  nombre: string;
  descripcion?: string;
  idTipoAccionPersonal?: number;
  idTipoArticuloNomina?: number;
  idCuentaGasto?: number;
  idCuentaPasivo?: number | null;
  idEmpresaCambio?: number;
  idTipoAccionPersonalCambio?: number;
  idTipoArticuloNominaCambio?: number;
  idCuentaGastoCambio?: number;
  idCuentaPasivoCambio?: number | null;
}

export interface PayrollArticleTypeMeta {
  primaryLabel: string;
  secondaryLabel?: string;
  allowsPasivo: boolean;
  idsReferencia: number[];
}
