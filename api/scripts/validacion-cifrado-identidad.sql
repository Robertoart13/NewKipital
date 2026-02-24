-- =============================================================================
-- Validación Directiva 31: inserts manuales y consultas de verificación
-- Ejecutar contra la BD (ej. mysql client o MCP). Ajustar id_empresa si hace falta.
-- =============================================================================

-- Obtener un id_empresa válido
-- SELECT id_empresa FROM sys_empresas WHERE estado_empresa = 1 LIMIT 1;

-- -----------------------------------------------------------------------------
-- Prueba 2: Insert manual (worker debe crear usuario + cifrar)
-- Sustituir :id_empresa, :codigo, :cedula, :email por valores únicos
-- -----------------------------------------------------------------------------
/*
INSERT INTO sys_empleados (
  id_empresa, codigo_empleado, cedula_empleado, nombre_empleado, apellido1_empleado,
  email_empleado, fecha_ingreso_empleado, estado_empleado, id_usuario,
  datos_encriptados_empleado, moneda_salario_empleado
) VALUES (
  1, 'MANUAL-001', '901234567', 'Manual', 'Insert',
  'manual.insert@test.local', CURDATE(), 1, NULL, 0, 'CRC'
);
*/

-- -----------------------------------------------------------------------------
-- Prueba 9: Empleado inactivo (no debe crearse usuario)
-- -----------------------------------------------------------------------------
/*
INSERT INTO sys_empleados (
  id_empresa, codigo_empleado, cedula_empleado, nombre_empleado, apellido1_empleado,
  email_empleado, fecha_ingreso_empleado, estado_empleado, id_usuario,
  datos_encriptados_empleado, moneda_salario_empleado
) VALUES (
  1, 'INACT-001', '809876543', 'Inactivo', 'Prueba',
  'inactivo@test.local', CURDATE(), 0, NULL, 0, 'CRC'
);
*/

-- =============================================================================
-- CONSULTAS DE VERIFICACIÓN (ejecutar tras dejar correr workers)
-- =============================================================================

-- Conteo por estado en colas
SELECT 'identity' AS cola, estado_queue, COUNT(*) AS cnt
FROM sys_empleado_identity_queue
GROUP BY estado_queue
UNION ALL
SELECT 'encrypt', estado_queue, COUNT(*)
FROM sys_empleado_encrypt_queue
GROUP BY estado_queue;

-- Empleados activos con datos en plaintext (debe ser 0)
SELECT id_empleado, email_empleado, cedula_empleado, datos_encriptados_empleado
FROM sys_empleados
WHERE estado_empleado = 1
  AND (datos_encriptados_empleado = 0 OR datos_encriptados_empleado IS NULL);

-- Empleados activos sin id_usuario (huérfanos; idealmente 0)
SELECT id_empleado, estado_empleado, id_usuario, email_empleado
FROM sys_empleados
WHERE estado_empleado = 1 AND id_usuario IS NULL;

-- Duplicados de hash (debe estar vacío)
SELECT cedula_hash_empleado, COUNT(*) AS cnt
FROM sys_empleados
WHERE cedula_hash_empleado IS NOT NULL
GROUP BY cedula_hash_empleado
HAVING COUNT(*) > 1;

SELECT email_hash_empleado, COUNT(*) AS cnt
FROM sys_empleados
WHERE email_hash_empleado IS NOT NULL
GROUP BY email_hash_empleado
HAVING COUNT(*) > 1;

-- Jobs PROCESSING con lock vencido (>10 min)
SELECT id_identity_queue, id_empleado, estado_queue, locked_at_queue
FROM sys_empleado_identity_queue
WHERE estado_queue = 'PROCESSING'
  AND (locked_at_queue IS NULL OR locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE));

SELECT id_encrypt_queue, id_empleado, estado_queue, locked_at_queue
FROM sys_empleado_encrypt_queue
WHERE estado_queue = 'PROCESSING'
  AND (locked_at_queue IS NULL OR locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE));
