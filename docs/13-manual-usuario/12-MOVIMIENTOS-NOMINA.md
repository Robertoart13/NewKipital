# 📘 Manual de Usuario - Movimientos de Nomina

## 🎯 Para que sirve este modulo
Define movimientos calculables por articulo y contexto para consumo en planilla.

## 🎯 Crear movimiento
1. Ir a `Parametros de Planilla > Movimientos`.
2. Click en `Crear movimiento`.
3. Completar campos.
4. Guardar.

## 📊 Campos y uso
| 📊 Campo | Para que sirve |
|---|---|
| `idEmpresa` | Empresa del movimiento |
| `nombre` | Nombre operativo |
| `idArticuloNomina` | Articulo que consumira el calculo |
| `idTipoAccionPersonal` | Tipo de accion relacionada |
| `idClase` | Segmentacion por clase |
| `idProyecto` | Segmentacion por proyecto |
| `esMontoFijo` | Define si el valor es fijo o porcentual |
| `montoFijo` | Monto cuando aplica fijo |
| `porcentaje` | Porcentaje cuando aplica porcentual |
| `formulaAyuda` | Nota tecnica de formula |

## 🎯 Regla clave de calculo
- Si es monto fijo, el porcentaje debe quedar en 0.
- Si es porcentaje, el monto fijo debe quedar en 0.

## 🎯 Permisos
- Ver: `payroll-movement:view`
- Crear: `payroll-movement:create`
- Editar: `payroll-movement:edit`
- Inactivar/Reactivar: `payroll-movement:inactivate`, `payroll-movement:reactivate`

## 🔗 Ver tambien
- [Articulos de nomina](./03-ARTICULOS-NOMINA.md)
- [Planilla operativa](./05-PLANILLA-OPERATIVA.md)


