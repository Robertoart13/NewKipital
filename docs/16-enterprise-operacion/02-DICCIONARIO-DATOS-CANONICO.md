# Diccionario de Datos Canonico

## Objetivo
Definir campos clave, tipo, sensibilidad y reglas de uso.

## Tablas clave
### sys_empresas
| Campo | Tipo | Sensible | Regla |
|---|---|---|---|
| id | int | No | PK |
| nombre_empresa | varchar | No | Obligatorio |
| identificacion_fiscal | varchar | No | Unico por empresa |
| estado_activo | tinyint | No | 1 activo / 0 inactivo |

### sys_empleados
| Campo | Tipo | Sensible | Regla |
|---|---|---|---|
| id | int | No | PK |
| codigo_empleado | varchar | No | Unico por empresa |
| nombre_completo | varchar | Si | Obligatorio |
| correo | varchar | Si | Validacion formato |
| salario_base | decimal | Si | > 0 |
| id_empresa | int | No | FK obligatoria |
| estado_activo | tinyint | No | 1 activo / 0 inactivo |

### nom_calendarios_nomina
| Campo | Tipo | Sensible | Regla |
|---|---|---|---|
| id_calendario_nomina | int | No | PK |
| id_empresa | int | No | FK |
| tipo_planilla | varchar | No | Regular/Aguinaldo/etc |
| estado_planilla | varchar | No | ABIERTA/EN_PROCESO/VERIFICADA/APLICADA/INACTIVA |
| fecha_inicio_periodo | date | No | Obligatorio |
| fecha_fin_periodo | date | No | Obligatorio |

## Clasificacion de datos
- PII: nombre, correo, salario, identificaciones personales.
- No PII: códigos de catálogo, estados, IDs técnicos.
