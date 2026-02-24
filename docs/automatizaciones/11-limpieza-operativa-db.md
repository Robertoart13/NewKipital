# 11 - Limpieza Operativa de Base de Datos

## Objetivo
Estandarizar el comando de "limpiar base" para pruebas, sin volver a especificar tablas cada vez.

Este runbook define:
- Que se conserva siempre.
- Que se limpia siempre.
- Orden seguro de limpieza.
- Script SQL oficial reutilizable.

## Politica oficial de limpieza
Cuando se solicite "limpiar base para pruebas":

### Conservar (NO borrar)
**Catálogos únicos:** Departamento, Puesto y Periodo de Pago son catálogos de referencia; **no se borran** en limpieza porque son únicos y son necesarios para empleados y nómina.

- `sys_apps`
- `sys_empresas`
- `sys_permisos`
- `sys_roles`
- `sys_rol_permiso`
- `org_departamentos`
- `org_puestos`
- `nom_periodos_pago`
- `migrations`

### Usuarios
- Mantener solo `sys_usuarios.id_usuario IN (1,2)`.
- Eliminar usuarios distintos a `1,2` y sus relaciones:
  - `sys_usuario_app`
  - `sys_usuario_empresa`
  - `sys_usuario_rol`
  - `sys_usuario_permiso`
  - `sys_usuario_permiso_global`
  - `sys_usuario_rol_exclusion`
  - `sys_usuario_rol_global`

### Limpiar (borrar datos operativos)
- `acc_cuotas_accion`
- `acc_acciones_personal`
- `sys_empleado_provision_aguinaldo`
- `sys_empleado_identity_queue`
- `sys_empleado_encrypt_queue`
- `sys_empleados`
- `nom_calendarios_nomina`
- `sys_notificacion_usuarios`
- `sys_notificaciones`
- `sys_domain_events`
- `sys_refresh_sessions`
- `sys_auditoria_acciones`

## Orden seguro de ejecucion
1. Borrar tablas hijas operativas (acciones/cuotas/provisiones/colas/notificaciones detalle).
2. Borrar tablas maestras operativas (`sys_empleados`, nomina, notificaciones, eventos, sesiones, auditoria).
3. Limpiar relaciones de usuarios (excepto IDs 1 y 2).
4. Borrar usuarios fuera de IDs 1 y 2.
5. Validar conteos finales.

## Script SQL oficial
```sql
-- 1) Operativo RRHH/colas
DELETE FROM acc_cuotas_accion;
DELETE FROM acc_acciones_personal;
DELETE FROM sys_empleado_provision_aguinaldo;
DELETE FROM sys_empleado_identity_queue;
DELETE FROM sys_empleado_encrypt_queue;
DELETE FROM sys_empleados;

-- 2) Nomina operativa (nom_periodos_pago NO se borra: catálogo único, ver "Conservar")
DELETE FROM nom_calendarios_nomina;

-- 3) Notificaciones, eventos, sesiones, auditoria
DELETE FROM sys_notificacion_usuarios;
DELETE FROM sys_notificaciones;
DELETE FROM sys_domain_events;
DELETE FROM sys_refresh_sessions;
DELETE FROM sys_auditoria_acciones;

-- 4) Relaciones de usuarios (solo conservar users 1 y 2)
DELETE FROM sys_usuario_permiso WHERE id_usuario NOT IN (1,2);
DELETE FROM sys_usuario_permiso_global WHERE id_usuario NOT IN (1,2);
DELETE FROM sys_usuario_rol_exclusion WHERE id_usuario NOT IN (1,2);
DELETE FROM sys_usuario_rol_global WHERE id_usuario NOT IN (1,2);
DELETE FROM sys_usuario_rol WHERE id_usuario NOT IN (1,2);
DELETE FROM sys_usuario_app WHERE id_usuario NOT IN (1,2);
DELETE FROM sys_usuario_empresa WHERE id_usuario NOT IN (1,2);

-- 5) Usuarios
DELETE FROM sys_usuarios WHERE id_usuario NOT IN (1,2);
```

## Validacion post-limpieza
```sql
SELECT id_usuario, email_usuario FROM sys_usuarios ORDER BY id_usuario;

SELECT COUNT(*) AS empleados FROM sys_empleados;
SELECT COUNT(*) AS identity_queue FROM sys_empleado_identity_queue;
SELECT COUNT(*) AS encrypt_queue FROM sys_empleado_encrypt_queue;
SELECT COUNT(*) AS provisiones FROM sys_empleado_provision_aguinaldo;
SELECT COUNT(*) AS periodos_pago FROM nom_periodos_pago;  -- debe conservarse (catálogo único)
SELECT COUNT(*) AS notificaciones FROM sys_notificaciones;
SELECT COUNT(*) AS sesiones FROM sys_refresh_sessions;
SELECT COUNT(*) AS auditoria FROM sys_auditoria_acciones;

SELECT COUNT(*) AS users_fuera_12 FROM sys_usuarios WHERE id_usuario NOT IN (1,2);
SELECT COUNT(*) AS usuario_app_fuera_12 FROM sys_usuario_app WHERE id_usuario NOT IN (1,2);
SELECT COUNT(*) AS usuario_empresa_fuera_12 FROM sys_usuario_empresa WHERE id_usuario NOT IN (1,2);
SELECT COUNT(*) AS usuario_rol_fuera_12 FROM sys_usuario_rol WHERE id_usuario NOT IN (1,2);

-- Catalogos que deben permanecer (departamento, puesto, periodo de pago: únicos, no se borran)
SELECT COUNT(*) AS apps FROM sys_apps;
SELECT COUNT(*) AS empresas FROM sys_empresas;
SELECT COUNT(*) AS permisos FROM sys_permisos;
SELECT COUNT(*) AS roles FROM sys_roles;
SELECT COUNT(*) AS rol_permiso FROM sys_rol_permiso;
SELECT COUNT(*) AS departamentos FROM org_departamentos;
SELECT COUNT(*) AS puestos FROM org_puestos;
SELECT COUNT(*) AS periodos_pago FROM nom_periodos_pago;
```

## Regla operativa para futuras solicitudes
Si el usuario pide "limpiar base" o "dejar limpio para pruebas", aplicar automaticamente este runbook, salvo que el usuario indique una excepcion explicita.
