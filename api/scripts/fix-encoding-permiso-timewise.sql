-- Corregir encoding: distribuciÃ³n -> distribución
-- Ejecutar con charset UTF-8: mysql ... --default-character-set=utf8mb4

SET NAMES utf8mb4;

UPDATE sys_permisos 
SET 
    nombre_permiso = 'Crear distribución de costo',
    descripcion_permiso = 'Permite crear y configurar la distribución de costos en TimeWise. Este permiso aplica solo cuando el usuario opera en la aplicación TimeWise.'
WHERE codigo_permiso = 'timewise:distribucion-costo-create';
