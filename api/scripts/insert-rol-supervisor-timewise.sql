-- Crear rol Supervisor TimeWise
-- Ejecutar con charset UTF-8: mysql ... --default-character-set=utf8mb4

SET NAMES utf8mb4;

INSERT INTO sys_roles (
  codigo_rol,
  nombre_rol,
  descripcion_rol,
  estado_rol,
  fecha_creacion_rol,
  fecha_modificacion_rol,
  creado_por_rol,
  modificado_por_rol
) VALUES (
  'SUPERVISOR_TIMEWISE',
  'Supervisor TimeWise',
  'Supervisor en TimeWise. Gestiona empleados y asistencia en el contexto de la aplicación TimeWise.',
  1,
  NOW(),
  NOW(),
  1,
  1
);
