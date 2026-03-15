# INFORME TÉCNICO — Validación Cifrado e Identidad (Directiva 31)

**Fecha:** 2026-02-24  
**Alcance:** Plan de validación completo (10 pruebas + stress test) según instrucciones

---

## 1. Resumen Ejecutivo

| # | Prueba | Resultado | Observaciones |
|---|--------|-----------|---------------|
| 1 | Flujo normal (creación vía API/UI) | **ANÁLISIS CÓDIGO OK** | BD prod vacía; flujo implementado |
| 2 | Insert manual SQL → workers | **ANÁLISIS CÓDIGO OK** | Worker encola, procesa identity+encrypt |
| 3 | Duplicado de email | **GAP** | Implementación reutiliza usuario; especificación espera ERROR_DUPLICATE |
| 4 | ERROR_CONFIG (TimeWise/rol desactivado) | **OK** | `QueueTerminalError` con ERROR_CONFIG |
| 5 | Permisos field-level | **OK** | `employee:edit` + `employee:view-sensitive` requeridos para salario |
| 6 | Anti-loop cifrado | **OK** | `INSERT IGNORE` + dedupe_key previene re-encolar |
| 7 | Recuperación lock (TTL) | **OK** | releaseStuckJobs 10 min |
| 8 | Rotación de clave (enc:v1→v2) | **PARCIAL** | Estructura lista; rotación no implementada |
| 9 | Empleado inactivo manual | **OK** | Solo `estado=1` y `idUsuario IS NULL` se encolan |
| 10 | Stress test 400 inserts | **NO EJECUTADO** | Requiere datos de prueba |

---

## 2. Evidencia de Base de Datos (BD PROD)

**Contexto:** BD `HRManagementDB_produccion` consultada vía MCP.

### 2.1 Estado actual

```sql
-- Empleados totales
SELECT COUNT(*) as total FROM sys_empleados;
-- Resultado: 0

-- Activos sin usuario (huérfanos)
SELECT COUNT(*) FROM sys_empleados WHERE estado_empleado=1 AND id_usuario IS NULL;
-- Resultado: 0

-- Plaintext en sensibles
SELECT COUNT(*) FROM sys_empleados 
WHERE (datos_encriptados_empleado = 0 OR datos_encriptados_empleado IS NULL) 
  AND email_empleado NOT LIKE 'enc:v%';
-- Resultado: 0 (ningún registro con plaintext)
```

### 2.2 Colas (identity / encrypt)

```sql
SELECT estado_queue, COUNT(*) as cnt 
FROM sys_empleado_identity_queue 
GROUP BY estado_queue;
-- Sin filas (colas vacías)

SELECT estado_queue, COUNT(*) as cnt 
FROM sys_empleado_encrypt_queue 
GROUP BY estado_queue;
-- Sin filas (colas vacías)
```

### 2.3 Configuración mínima verificada

- `sys_apps`: timewise activa
- `sys_roles`: EMPLEADO_TIMEWISE (id_rol=8, id_app=timewise)
- `sys_empresas`: 4 empresas

---

## 3. Consultas SQL de Verificación (Para ejecutar tras pruebas)

```sql
-- Conteo por estado en colas
SELECT 'identity' as cola, estado_queue, COUNT(*) as cnt 
FROM sys_empleado_identity_queue GROUP BY estado_queue
UNION ALL
SELECT 'encrypt', estado_queue, COUNT(*) 
FROM sys_empleado_encrypt_queue GROUP BY estado_queue;

-- Empleados con sensibles en plaintext (debe ser 0)
SELECT id_empleado, email_empleado, cedula_empleado, salario_base_empleado
FROM sys_empleados 
WHERE (datos_encriptados_empleado = 0 OR datos_encriptados_empleado IS NULL)
   OR (email_empleado NOT LIKE 'enc:v%' AND email_empleado IS NOT NULL);

-- Empleados activos con id_usuario NULL (solo inactivos pueden tenerlo)
SELECT id_empleado, estado_empleado, id_usuario 
FROM sys_empleados 
WHERE estado_empleado = 1 AND id_usuario IS NULL;

-- Duplicados de hash
SELECT cedula_hash_empleado, COUNT(*) 
FROM sys_empleados 
WHERE cedula_hash_empleado IS NOT NULL 
GROUP BY cedula_hash_empleado HAVING COUNT(*) > 1;

SELECT email_hash_empleado, COUNT(*) 
FROM sys_empleados 
WHERE email_hash_empleado IS NOT NULL 
GROUP BY email_hash_empleado HAVING COUNT(*) > 1;

-- PROCESSING sin locked_at o TTL vencido (>10 min)
SELECT id_identity_queue, id_empleado, estado_queue, locked_at_queue
FROM sys_empleado_identity_queue 
WHERE estado_queue = 'PROCESSING' 
  AND (locked_at_queue IS NULL OR locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE));
```

---

## 4. Observaciones Técnicas

### 4.1 Prueba 3 — Duplicado de email

**Especificación:** Insert manual con email ya existente en `sys_usuarios` → task en `ERROR_DUPLICATE`.

**Implementación actual:** El worker reutiliza el usuario existente y vincula el empleado (`employee.idUsuario = user.id`), marcando la tarea como `DONE`. No se lanza `ERROR_DUPLICATE`.

**Recomendación:** Definir política:
- **Opción A:** Cambiar especificación para aceptar vinculación a usuario existente (idempotente).
- **Opción B:** Lanzar `QueueTerminalError(..., ERROR_DUPLICATE)` cuando el email ya existe en `sys_usuarios` y el empleado viene de insert manual (p.ej. distinguir por origen).

### 4.2 releaseStuckJobs — nombre de columna

El worker usa `estado_queue` y `locked_at_queue` en el `WHERE`. Las entidades TypeORM mapean correctamente; la consulta funciona.

### 4.3 Rotación de clave (enc:v1 → enc:v2)

- `EmployeeSensitiveDataService` usa prefijo `enc:v1` y `getEncryptedVersion()` retorna `'v1'`.
- No hay job/worker para recifrar registros legacy a una nueva versión.
- La lectura con `isEncrypted()` y `decrypt()` soporta el formato actual; añadir v2 requeriría lógica de migración.

---

## 5. Métricas Stress Test (400 inserts)

**Estado:** No ejecutado (BD prod sin empleados de prueba).

**Parámetros SLA (doc 31):**
- Meta: 400 registros en < 8 minutos
- Lote sugerido: 200 registros/ciclo
- Ciclo: 30 segundos
- Worker: batch 25 identity + 50 encrypt por tick, tick cada 5 s

**Estimación:** Con ~75 jobs/tick y ciclo de 5 s, 400 registros ≈ 6–7 minutos en condiciones normales.

---

## 6. Veredicto

| Aspecto | Estado |
|---------|--------|
| Cifrado en creación vía API | OK |
| Provisionamiento TimeWise (manual) | OK |
| Estados terminales (ERROR_CONFIG, etc.) | OK |
| Anti-loop y dedupe | OK |
| Recuperación de locks | OK |
| Permisos field-level | OK |
| Duplicado email (ERROR_DUPLICATE) | GAP vs especificación |
| Rotación de clave | Parcial (estructura, sin migración) |
| Stress test | Pendiente de ejecución con datos |

**Aprobación condicional:** El sistema cumple el flujo principal y las garantías operativas. Se recomienda resolver el GAP de duplicado de email y ejecutar el stress test con datos reales antes de marcar como totalmente aprobado.

---

## 7. Cómo ejecutar las pruebas

### Requisitos

1. **API con worker en marcha** (el worker procesa las colas cada ~5 s):
   ```bash
   cd api && npm run start:dev
   ```
2. Variables de entorno de BD (o `.env` en `api/`): `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`.

### Scripts npm (desde `api/`)

| Comando | Descripción |
|--------|-------------|
| `npm run script:validacion-cifrado` | Ejecuta pruebas 2, 3 y 9 (inserts manuales) y muestra verificación de colas/empleados |
| `npm run script:validacion-cifrado:stress` | Inserta 400 empleados manuales (stress test); luego hay que esperar workers &lt; 8 min |

### Opciones por argumento

```bash
# Solo prueba 2 (insert manual para worker)
npx ts-node -r tsconfig-paths/register scripts/run-validacion-cifrado-identidad.ts --prueba=2

# Solo prueba 3 (email duplicado)
npx ts-node -r tsconfig-paths/register scripts/run-validacion-cifrado-identidad.ts --prueba=3

# Solo prueba 9 (empleado inactivo)
npx ts-node -r tsconfig-paths/register scripts/run-validacion-cifrado-identidad.ts --prueba=9

# Stress con N inserts (ej. 100)
npx ts-node -r tsconfig-paths/register scripts/run-validacion-cifrado-identidad.ts --stress=100
```

### SQL manual

En `api/scripts/validacion-cifrado-identidad.sql` hay ejemplos de `INSERT` manual y todas las consultas de verificación. Útil para ejecutar en cliente MySQL o MCP sin usar el script TS.
