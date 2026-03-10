# Manual de Usuario - Articulos de Nomina

## Para que sirve este modulo
Define conceptos de pago/deduccion que luego se usan en movimientos y calculo de planilla.

## Crear articulo
1. Ir a `Parametros de Planilla > Articulos`.
2. Click en `Crear articulo`.
3. Completar campos.
4. Guardar.

## Campos y uso
| Campo | Para que sirve | Obligatorio |
|---|---|---|
| `idEmpresa` | Empresa propietaria | Si |
| `nombre` | Nombre del articulo de nomina | Si |
| `descripcion` | Detalle funcional | No |
| `idTipoAccionPersonal` | Tipo de accion asociado | Si |
| `idTipoArticuloNomina` | Clasificacion del articulo | Si |
| `idCuentaGasto` | Cuenta contable de gasto | Si |
| `idCuentaPasivo` | Cuenta de pasivo cuando aplica | Segun tipo |

## Reglas operativas
- El articulo debe tener cuentas validas para contabilizacion.
- Si inactiva un articulo, deje de usarlo en nuevos movimientos.

## Permisos
- Ver: `payroll-article:view`
- Crear: `payroll-article:create`
- Editar: `payroll-article:edit`
- Inactivar/Reactivar: `payroll-article:inactivate`, `payroll-article:reactivate`

## Ver tambien
- [Cuentas contables](./04-CUENTAS-CONTABLES.md)
- [Movimientos de nomina](./12-MOVIMIENTOS-NOMINA.md)
