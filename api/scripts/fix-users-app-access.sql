-- Asigna app KPITAL a usuarios que tienen empresas pero no tienen ninguna app activa.
-- Resuelve "Sin acceso a esta aplicación" / menú vacío al refrescar perfil.
-- Ejecutar: mysql -u usuario -p nombre_bd < fix-users-app-access.sql

SET @kpital_id = (SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital' AND estado_app = 1 LIMIT 1);

INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
SELECT DISTINCT ue.id_usuario, @kpital_id, 1, NOW()
FROM sys_usuario_empresa ue
WHERE ue.estado_usuario_empresa = 1
  AND @kpital_id IS NOT NULL
ON DUPLICATE KEY UPDATE estado_usuario_app = 1;
