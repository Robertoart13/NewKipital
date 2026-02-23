-- Permiso TimeWise: Crear distribución de costo
-- Ejecutar en BD de producción para agregar el permiso de ejemplo.
-- Formato: module:action (timewise:distribucion-costo-create)

INSERT INTO sys_permisos (
  codigo_permiso,
  nombre_permiso,
  descripcion_permiso,
  modulo_permiso,
  estado_permiso,
  fecha_creacion_permiso
) VALUES (
  'timewise:distribucion-costo-create',
  'Crear distribución de costo',
  'Permite crear y configurar la distribución de costos en TimeWise. Este permiso aplica solo cuando el usuario opera en la aplicación TimeWise.',
  'timewise',
  1,
  NOW()
);
