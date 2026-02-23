-- Script de diagnóstico: verifica por qué un usuario no ve sus roles/permisos al refrescar
-- Sustituir USER_EMAIL por el email del usuario (ej: 'ana.garcia@empresa.com')
-- Sustituir APP_CODE por la app (ej: 'kpital')

SET @user_email = 'ana.garcia@empresa.com';  -- CAMBIAR
SET @app_codigo = 'kpital';

-- 1. Usuario
SELECT id_usuario, email_usuario, nombre_usuario, apellido_usuario, estado_usuario
FROM sys_usuarios WHERE email_usuario = @user_email;

-- 2. Empresas asignadas (CRÍTICO: sin empresas, roles globales NO aplican)
SELECT ue.id_usuario, ue.id_empresa, e.nombre_empresa, ue.estado_usuario_empresa
FROM sys_usuario_empresa ue
JOIN sys_empresas e ON e.id_empresa = ue.id_empresa
WHERE ue.id_usuario = (SELECT id_usuario FROM sys_usuarios WHERE email_usuario = @user_email);

-- 3. App KPITAL
SELECT id_app, codigo_app, nombre_app FROM sys_apps WHERE codigo_app = @app_codigo;

-- 4. Roles globales (deben existir para que apliquen)
SELECT g.id_usuario_rol_global, g.id_usuario, g.id_app, g.id_rol, r.codigo_rol, r.nombre_rol, g.estado_usuario_rol_global
FROM sys_usuario_rol_global g
JOIN sys_roles r ON r.id_rol = g.id_rol
WHERE g.id_usuario = (SELECT id_usuario FROM sys_usuarios WHERE email_usuario = @user_email)
  AND g.id_app = (SELECT id_app FROM sys_apps WHERE codigo_app = @app_codigo);

-- 5. Denegaciones globales (permisos bloqueados)
SELECT g.id_usuario, p.codigo_permiso, p.nombre_permiso
FROM sys_usuario_permiso_global g
JOIN sys_permisos p ON p.id_permiso = g.id_permiso
WHERE g.id_usuario = (SELECT id_usuario FROM sys_usuarios WHERE email_usuario = @user_email)
  AND g.id_app = (SELECT id_app FROM sys_apps WHERE codigo_app = @app_codigo)
  AND g.estado_usuario_permiso_global = 1;

-- 6. App asignada al usuario (CRÍTICO: sin esto, enabledApps=[], pantalla "Sin acceso a esta aplicación")
SELECT ua.id_usuario, ua.id_app, a.codigo_app, ua.estado_usuario_app
FROM sys_usuario_app ua
JOIN sys_apps a ON a.id_app = ua.id_app
WHERE ua.id_usuario = (SELECT id_usuario FROM sys_usuarios WHERE email_usuario = @user_email);

-- 7. Permisos del rol Master Administrator (si el rol no tiene permisos, basePermissions=[])
SELECT r.id_rol, r.codigo_rol, r.nombre_rol, p.codigo_permiso
FROM sys_roles r
JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
WHERE (r.codigo_rol = 'MASTER' OR r.nombre_rol LIKE '%Master%')
  AND r.estado_rol = 1;

-- Para asignar KPITAL a un usuario si falta (ejecutar si query 6 está vacío):
-- INSERT IGNORE INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
-- SELECT u.id_usuario, (SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital' LIMIT 1), 1, NOW()
-- FROM sys_usuarios u WHERE u.email_usuario = @user_email;

-- RESUMEN: Para que el menú muestre opciones:
-- 1. sys_usuario_app: usuario debe tener KPITAL asignado (enabledApps)
-- 2. sys_usuario_empresa: al menos 1 empresa con estado=1
-- 3. sys_usuario_rol_global: rol Master Administrator asignado
-- 4. sys_rol_permiso: el rol MASTER debe tener permisos asignados (Configuración > Roles)
