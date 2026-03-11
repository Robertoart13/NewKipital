# 🛠️ Manual Tecnico - Datos y Base de Datos

## 🎯 Entidades nucleares
- `sys_usuarios`: identidad de acceso
- `sys_usuario_empresa`: alcance por empresa
- `sys_roles`, `sys_permisos`, tablas puente de autorizacion
- `sys_empresas`: entidad legal/operativa
- `sys_empleados`: base RRHH (datos sensibles cifrados)
- `nom_calendarios_nomina`: planillas
- `nomina_resultados`, snapshots e inputs de calculo
- `nom_acciones_personal` y tablas por tipo
- `config_reglas_distribucion`: cabecera de reglas contables por empresa/scope
- `config_reglas_distribucion_detalle`: lineas por tipo de accion personal y cuenta contable

## 🎯 Integridad y reglas
- Unicidad por negocio (codigo empleado por empresa, cedula/email en empleados, prefijo/cedula en empresas).
- Inactivacion logica para mantener historial.
- Auditoria de cambios en tablas criticas mediante outbox.
- `config_reglas_distribucion_detalle` bloquea duplicado por tipo de accion dentro de la misma regla (`UNIQUE id_regla_distribucion + id_tipo_accion_personal`).
- `config_reglas_distribucion` expone `public_id_regla_distribucion` para navegacion segura en frontend.
- `config_reglas_distribucion` valida unicidad funcional de regla activa por scope:
  - Global por empresa: una activa por empresa.
  - Especifica por empresa+departamento+puesto (puesto puede ser `NULL`).

## 🎯 Cifrado y hash en empleados
- Campos sensibles se almacenan cifrados.
- `emailHash` y `cedulaHash` permiten validar duplicados y busqueda controlada.

## 🎯 Eventos y trazabilidad
- Eventos de dominio para cambios clave (apertura/verificacion/aplicacion de planilla, cambios de empleado).
- Auditoria con payload before/after para reconstruccion de cambios.

## 🔗 Ver tambien
- [Diccionario de datos canonico](../16-enterprise-operacion/02-DICCIONARIO-DATOS-CANONICO.md)
- [Backend API y BD consolidado](../06-backend-api-db/BACKEND-API-DB-CONSOLIDADO.md)


