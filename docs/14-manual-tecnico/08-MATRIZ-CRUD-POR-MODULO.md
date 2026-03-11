# 🛠️ Manual Tecnico - Matriz CRUD por Modulo

## 📊 Matriz canonica de operaciones
| Modulo | Create | Read | Update | Delete/Inactivar | Permisos clave | Regla critica |
|---|---|---|---|---|---|---|
| Empresas | Si | Si | Si | Inactivar/Reactivar | `company:*` | Bloquea inactivar con planillas activas |
| Empleados | Si | Si | Si | Inactivar/Reactivar/Liquidar | `employee:*` | Cifrado sensible + bloqueos por planilla/acciones |
| Usuarios | Si | Si | Si | Inactivar/Reactivar/Bloquear | `config:users` | No autoescalado de privilegios |
| Roles | Si | Si | Si | Inactivar/Reactivar | `config:roles` | Cambios impactan permisos efectivos |
| Permisos | Si | Si | Si | Inactivar/Reactivar | `config:permissions` | Validar modulo:accion |
| Asignacion usuario-empresa | Reemplazo | Si | Reemplazo | N/A | `config:users:assign-companies` | Sin empresa no hay operacion |
| Asignacion roles usuario | Reemplazo | Si | Reemplazo | N/A | `config:users:assign-roles` | Exclusion/override altera resultado |
| Cuentas contables | Si | Si | Si | Inactivar/Reactivar | `accounting-account:*` | Integridad con articulos |
| Reglas de distribucion | Si | Si | Si | Inactivar/Reactivar | `config:reglas-distribucion*` | Global no usa depto/puesto; especifica exige depto y evita duplicados |
| Articulos nomina | Si | Si | Si | Inactivar/Reactivar | `payroll-article:*` | Cuenta contable valida |
| Movimientos nomina | Si | Si | Si | Inactivar/Reactivar | `payroll-movement:*` | Monto fijo vs porcentaje |
| Departamentos | Si | Si | Si | Inactivar/Reactivar | `department:*` | No romper referencias activas |
| Puestos | Si | Si | Si | Inactivar/Reactivar | `position:*` | No romper referencias activas |
| Clases | Si | Si | Si | Inactivar/Reactivar | `class:*` | Consistencia de codigo |
| Proyectos | Si | Si | Si | Inactivar/Reactivar | `project:*` | Scope por empresa |
| Feriados | Si | Si | Si | Delete | `payroll-holiday:*` | Fechas validas |
| Planilla | Si | Si | Si segun estado | Inactivar/Reactivar | `payroll:*` | Estado gobierna transiciones |
| Acciones personal | Si | Si | Si | Invalidar | `hr-action-*` | Solo aprobadas consumen planilla |
| Traslado interempresa | Simular/Ejecutar | N/A | N/A | N/A | `payroll:intercompany-transfer` | Requiere compatibilidad destino |

## 🔗 Ver tambien
- [API y contratos](./04-API-CONTRATOS.md)
- [Manual usuario](../13-manual-usuario/00-GUIA-RAPIDA-USUARIO.md)

