-- Seed idempotente de articulo y movimientos para pruebas UX de Licencias y Permisos
-- Empresa objetivo: id_empresa = 1 (Rocca Master Company)
-- Tipo de accion personal: 23 (LIC)

INSERT INTO nom_articulos_nomina (
  id_empresa,
  nombre_articulo_nomina,
  descripcion_articulo_nomina,
  id_tipo_accion_personal,
  id_tipo_articulo_nomina,
  id_cuenta_gasto,
  id_cuenta_pasivo,
  es_inactivo
)
SELECT
  1,
  'QA Articulo Nomina Licencias UX',
  'Articulo de prueba para UX Licencias y Permisos',
  23,
  1,
  1,
  NULL,
  0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM nom_articulos_nomina
  WHERE id_empresa = 1
    AND nombre_articulo_nomina = 'QA Articulo Nomina Licencias UX'
    AND id_tipo_accion_personal = 23
);

INSERT INTO nom_movimientos_nomina (
  id_empresa_movimiento_nomina,
  nombre_movimiento_nomina,
  id_articulo_nomina_movimiento_nomina,
  id_tipo_accion_personal_movimiento_nomina,
  id_clase_movimiento_nomina,
  id_proyecto_movimiento_nomina,
  descripcion_movimiento_nomina,
  es_monto_fijo_movimiento_nomina,
  monto_fijo_movimiento_nomina,
  porcentaje_movimiento_nomina,
  formula_ayuda_movimiento_nomina,
  es_inactivo_movimiento_nomina
)
SELECT
  1,
  'QA Licencia Monto Fijo 30000',
  a.id_articulo_nomina,
  23,
  NULL,
  NULL,
  'Movimiento de prueba UX (monto fijo)',
  1,
  '30000',
  '0',
  'Monto fijo: 30000 x cantidad',
  0
FROM nom_articulos_nomina a
WHERE a.id_empresa = 1
  AND a.nombre_articulo_nomina = 'QA Articulo Nomina Licencias UX'
  AND NOT EXISTS (
    SELECT 1
    FROM nom_movimientos_nomina m
    WHERE m.id_empresa_movimiento_nomina = 1
      AND m.nombre_movimiento_nomina = 'QA Licencia Monto Fijo 30000'
      AND m.id_tipo_accion_personal_movimiento_nomina = 23
  )
LIMIT 1;

INSERT INTO nom_movimientos_nomina (
  id_empresa_movimiento_nomina,
  nombre_movimiento_nomina,
  id_articulo_nomina_movimiento_nomina,
  id_tipo_accion_personal_movimiento_nomina,
  id_clase_movimiento_nomina,
  id_proyecto_movimiento_nomina,
  descripcion_movimiento_nomina,
  es_monto_fijo_movimiento_nomina,
  monto_fijo_movimiento_nomina,
  porcentaje_movimiento_nomina,
  formula_ayuda_movimiento_nomina,
  es_inactivo_movimiento_nomina
)
SELECT
  1,
  'QA Licencia Porcentaje 12.5',
  a.id_articulo_nomina,
  23,
  NULL,
  NULL,
  'Movimiento de prueba UX (porcentaje)',
  0,
  '0',
  '12.5',
  'Salario base ajustado por periodo x 12.5% x cantidad',
  0
FROM nom_articulos_nomina a
WHERE a.id_empresa = 1
  AND a.nombre_articulo_nomina = 'QA Articulo Nomina Licencias UX'
  AND NOT EXISTS (
    SELECT 1
    FROM nom_movimientos_nomina m
    WHERE m.id_empresa_movimiento_nomina = 1
      AND m.nombre_movimiento_nomina = 'QA Licencia Porcentaje 12.5'
      AND m.id_tipo_accion_personal_movimiento_nomina = 23
  )
LIMIT 1;

INSERT INTO nom_movimientos_nomina (
  id_empresa_movimiento_nomina,
  nombre_movimiento_nomina,
  id_articulo_nomina_movimiento_nomina,
  id_tipo_accion_personal_movimiento_nomina,
  id_clase_movimiento_nomina,
  id_proyecto_movimiento_nomina,
  descripcion_movimiento_nomina,
  es_monto_fijo_movimiento_nomina,
  monto_fijo_movimiento_nomina,
  porcentaje_movimiento_nomina,
  formula_ayuda_movimiento_nomina,
  es_inactivo_movimiento_nomina
)
SELECT
  1,
  'QA Licencia Movimiento Inactivo',
  a.id_articulo_nomina,
  23,
  NULL,
  NULL,
  'Movimiento inactivo para validar UX',
  1,
  '15000',
  '0',
  'Movimiento inactivo de control',
  1
FROM nom_articulos_nomina a
WHERE a.id_empresa = 1
  AND a.nombre_articulo_nomina = 'QA Articulo Nomina Licencias UX'
  AND NOT EXISTS (
    SELECT 1
    FROM nom_movimientos_nomina m
    WHERE m.id_empresa_movimiento_nomina = 1
      AND m.nombre_movimiento_nomina = 'QA Licencia Movimiento Inactivo'
      AND m.id_tipo_accion_personal_movimiento_nomina = 23
  )
LIMIT 1;
