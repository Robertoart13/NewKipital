# 📘 Manual de Usuario - Cuentas Contables

## 🎯 Para que sirve este modulo
Gestiona catalogo contable que consumen articulos y movimientos de nomina.

## 🎯 Crear cuenta contable
1. Ir a `Configuracion > Cuentas contables`.
2. Click en `Crear cuenta`.
3. Completar campos.
4. Guardar.

## 📊 Campos y uso
| 📊 Campo | Para que sirve | 📊 Obligatorio |
|---|---|---|
| `idEmpresa` | Empresa dueña de la cuenta | Si |
| `nombre` | Nombre contable | Si |
| `descripcion` | Detalle funcional | No |
| `codigo` | Codigo unico de cuenta | Si |
| `idExternoNetsuite` | Referencia NetSuite | No |
| `codigoExterno` | Referencia externa adicional | No |
| `idTipoErp` | Tipo de cuenta ERP | Si |
| `idTipoAccionPersonal` | Relacion operativa con accion personal | Si |

## 🎯 Reglas operativas
- Evite duplicar codigos en la misma empresa.
- No inactivar cuentas que siguen asociadas a articulos activos sin plan de reemplazo.

## 🎯 Permisos
- Ver: `accounting-account:view`
- Crear: `accounting-account:create`
- Editar: `accounting-account:edit`
- Inactivar/Reactivar: `accounting-account:inactivate`, `accounting-account:reactivate`

## 🔗 Ver tambien
- [Articulos de nomina](./03-ARTICULOS-NOMINA.md)
- [Movimientos de nomina](./12-MOVIMIENTOS-NOMINA.md)


