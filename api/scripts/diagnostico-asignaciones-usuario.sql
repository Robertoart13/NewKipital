-- ============================================================
-- DIAGNÓSTICO: Asignaciones de usuario (empresas y roles)
-- Ejecutar en MySQL para verificar qué se guarda al asignar
-- ============================================================

-- 1. Usuarios
SELECT id_usuario, email_usuario, nombre_usuario, apellido_usuario, estado_usuario
FROM sys_usuarios WHERE estado_usuario = 1;

-- 2. Empresas asignadas (botón "Guardar" en tab Empresas → replaceUserCompanies)
SELECT ue.id_usuario, u.email_usuario,
       ue.id_empresa, e.nombre_empresa, ue.estado_usuario_empresa
FROM sys_usuario_empresa ue
JOIN sys_usuarios u ON u.id_usuario = ue.id_usuario
JOIN sys_empresas e ON e.id_empresa = ue.id_empresa
WHERE ue.estado_usuario_empresa = 1
ORDER BY ue.id_usuario, ue.id_empresa;

-- 3. Roles por empresa (sys_usuario_rol) — asignación por empresa/contexto
SELECT ur.id_usuario, u.email_usuario, ur.id_empresa, ur.id_app, r.codigo_rol, ur.estado_usuario_rol
FROM sys_usuario_rol ur
JOIN sys_usuarios u ON u.id_usuario = ur.id_usuario
JOIN sys_roles r ON r.id_rol = ur.id_rol
WHERE ur.estado_usuario_rol = 1
ORDER BY ur.id_usuario, ur.id_empresa, ur.id_app;

-- 4. Roles globales (sys_usuario_rol_global) — botón "Guardar" en tab Roles → replaceUserGlobalRoles
-- Si esta tabla no existe, la migración AddNetSuiteGlobalRolesExclusions puede no haberse ejecutado
SELECT g.id_usuario, u.email_usuario, a.codigo_app, r.codigo_rol, g.estado_usuario_rol_global
FROM sys_usuario_rol_global g
JOIN sys_usuarios u ON u.id_usuario = g.id_usuario
JOIN sys_apps a ON a.id_app = g.id_app
JOIN sys_roles r ON r.id_rol = g.id_rol
WHERE g.estado_usuario_rol_global = 1
ORDER BY g.id_usuario, a.codigo_app;

-- 5. Permisos del rol MASTER (base para que el menú muestre opciones)
SELECT r.codigo_rol, p.codigo_permiso, p.nombre_permiso
FROM sys_rol_permiso rp
JOIN sys_roles r ON r.id_rol = rp.id_rol
JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
WHERE r.codigo_rol = 'MASTER' AND p.estado_permiso = 1;

-- 6. App asignada al usuario (necesaria para enabledApps)
SELECT ua.id_usuario, u.email_usuario, a.codigo_app, ua.estado_usuario_app
FROM sys_usuario_app ua
JOIN sys_usuarios u ON u.id_usuario = ua.id_usuario
JOIN sys_apps a ON a.id_app = ua.id_app
WHERE ua.estado_usuario_app = 1
ORDER BY ua.id_usuario;
