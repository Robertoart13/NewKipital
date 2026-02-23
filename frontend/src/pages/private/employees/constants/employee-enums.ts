/**
 * ENUMs locales para formulario de empleado (doc 19).
 * Valores fijos — no vienen del backend.
 */
export const GENERO_OPTIONS = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Femenino', label: 'Femenino' },
  { value: 'Otro', label: 'Otro' },
] as const;

export const ESTADO_CIVIL_OPTIONS = [
  { value: 'Soltero', label: 'Soltero' },
  { value: 'Casado', label: 'Casado' },
  { value: 'Divorciado', label: 'Divorciado' },
  { value: 'Viudo', label: 'Viudo' },
  { value: 'Unión Libre', label: 'Unión Libre' },
] as const;

export const TIPO_CONTRATO_OPTIONS = [
  { value: 'Indefinido', label: 'Indefinido' },
  { value: 'Plazo Fijo', label: 'Plazo Fijo' },
  { value: 'Por Servicios Profesionales', label: 'Por Servicios Profesionales' },
] as const;

export const JORNADA_OPTIONS = [
  { value: 'Tiempo Completo', label: 'Tiempo Completo' },
  { value: 'Medio Tiempo', label: 'Medio Tiempo' },
  { value: 'Por Horas', label: 'Por Horas' },
] as const;

export const MONEDA_OPTIONS = [
  { value: 'CRC', label: 'CRC' },
  { value: 'USD', label: 'USD' },
] as const;

export const TIENE_CONYUGE_OPTIONS = [
  { value: 'Si', label: 'Sí' },
  { value: 'No', label: 'No' },
] as const;
