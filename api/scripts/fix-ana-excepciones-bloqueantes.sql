-- ============================================================
-- FIX: Ana no ve el menú de Configuración por excepciones DENY
-- ============================================================
-- PROBLEMA: Ana tiene en sys_usuario_permiso DENY activos para
-- config:permissions (19), config:roles (20), config:users (21).
-- El auth elimina esos permisos del conjunto efectivo.
--
-- Rocca (usuario 1): tiene los mismos DENY pero con estado=0 (inactivos)
-- Ana (usuario 2): tiene los DENY con estado=1 (activos) → no ve nada
-- ============================================================

-- Desactivar excepciones DENY de Ana que bloquean el menú config
-- (permisos 19, 20, 21 = config:permissions, config:roles, config:users)
UPDATE sys_usuario_permiso
SET estado_usuario_permiso = 0, modificado_por_usuario_permiso = 1
WHERE id_usuario = 2
  AND id_permiso IN (19, 20, 21)
  AND efecto_usuario_permiso = 'DENY'
  AND estado_usuario_permiso = 1;

-- Verificar: debería mostrar 0 filas activas para Ana con esos permisos
SELECT id_usuario, id_empresa, id_app, id_permiso, efecto_usuario_permiso, estado_usuario_permiso
FROM sys_usuario_permiso
WHERE id_usuario = 2 AND estado_usuario_permiso = 1;
