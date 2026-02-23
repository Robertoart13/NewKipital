-- =============================================================================
-- Reset a permisos esenciales (ejecutar en HRManagementDB_produccion)
-- Elimina todos los roles y permisos. Crea solo config:permissions, config:roles, config:users
-- Rol MASTER con esos 3 permisos. Asigna a roberto@kpital360.com
--
-- Si sys_usuario_rol_global, sys_usuario_rol_exclusion o sys_usuario_permiso
-- no existen, comente las líneas correspondientes.
-- =============================================================================

SET @now = NOW();

-- 1. Limpiar (orden por FKs)
-- Si estas tablas no existen, comente las líneas:
DELETE FROM sys_usuario_rol_global;
DELETE FROM sys_usuario_rol_exclusion;
DELETE FROM sys_usuario_permiso;
DELETE FROM sys_usuario_rol WHERE 1=1;
DELETE FROM sys_usuario_rol WHERE 1=1;
DELETE FROM sys_rol_permiso WHERE 1=1;
DELETE FROM sys_roles WHERE 1=1;
DELETE FROM sys_permisos WHERE 1=1;

-- 2. Permisos esenciales
INSERT INTO sys_permisos (codigo_permiso, nombre_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso)
VALUES
  ('config:permissions', 'Gestionar permisos', 'config', 1, @now),
  ('config:roles', 'Gestionar roles', 'config', 1, @now),
  ('config:users', 'Gestionar usuarios', 'config', 1, @now);

-- 3. Rol MASTER
INSERT INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol)
VALUES ('MASTER', 'Master Administrator', 'Permisos esenciales para configurar el sistema desde cero', 1, @now, @now, 1, 1);

-- 4. Asignar permisos al rol MASTER
INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
SELECT r.id_rol, p.id_permiso, @now
FROM sys_roles r
CROSS JOIN sys_permisos p
WHERE r.codigo_rol = 'MASTER' AND p.estado_permiso = 1;

-- 5. Asignar rol MASTER al usuario roberto@kpital360.com en todas sus empresas y apps
INSERT INTO sys_usuario_rol (
  id_usuario, id_rol, id_empresa, id_app,
  estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol,
  creado_por_usuario_rol, modificado_por_usuario_rol
)
SELECT
  u.id_usuario,
  r.id_rol,
  ue.id_empresa,
  a.id_app,
  1, @now, @now,
  u.id_usuario, u.id_usuario
FROM sys_usuarios u
CROSS JOIN sys_roles r
INNER JOIN sys_usuario_empresa ue ON ue.id_usuario = u.id_usuario AND ue.estado_usuario_empresa = 1
CROSS JOIN sys_apps a
WHERE u.email_usuario = 'roberto@kpital360.com'
  AND u.estado_usuario = 1
  AND r.codigo_rol = 'MASTER'
  AND a.estado_app = 1;
