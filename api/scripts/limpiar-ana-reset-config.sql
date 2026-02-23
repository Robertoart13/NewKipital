-- ============================================================
-- LIMPIAR TODO de Ana María - dejar solo el usuario
-- Ana: id_usuario = 2, ana.garcia@roccacr.com
-- Ejecutar en MySQL para resetear su configuración y volver a asignar
-- ============================================================

SET @ana_id = 2;

-- 1. Excepciones/overrides por contexto (sys_usuario_permiso)
DELETE FROM sys_usuario_permiso WHERE id_usuario = @ana_id;

-- 2. Denegaciones globales (sys_usuario_permiso_global)
DELETE FROM sys_usuario_permiso_global WHERE id_usuario = @ana_id;

-- 3. Roles por empresa (sys_usuario_rol)
DELETE FROM sys_usuario_rol WHERE id_usuario = @ana_id;

-- 4. Roles globales (sys_usuario_rol_global)
DELETE FROM sys_usuario_rol_global WHERE id_usuario = @ana_id;

-- 5. Exclusión de roles (si existe la tabla)
-- DELETE FROM sys_usuario_rol_exclusion WHERE id_usuario = @ana_id;

-- 6. Empresas asignadas
DELETE FROM sys_usuario_empresa WHERE id_usuario = @ana_id;

-- 7. Apps asignadas
DELETE FROM sys_usuario_app WHERE id_usuario = @ana_id;

-- El usuario en sys_usuarios permanece intacto
SELECT 'Ana limpiada. Configurar de nuevo: Empresas, Roles, Excepciones.' AS mensaje;
