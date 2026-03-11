# Catalogo de Campos y Formularios - KPITAL 360

Version: 1.0  
Fecha: 2026-03-11  
Uso: anexo oficial del [Manual de Usuario Enterprise](./14-MANUAL-USUARIO-ENTERPRISE-KPITAL360.md)

## Reglas de lectura
- `Obligatorio`: campo requerido para guardar.
- `Editable`: si se puede modificar luego de guardar.
- `Bloqueo`: condicion por la que el campo se bloquea.

## 1. Formulario Empresas
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Nombre empresa | Identificador principal de la empresa | Si | Si | Debe ser unico por tenant |
| Identificacion fiscal | Identificador legal/fiscal | Si | No | Se bloquea para trazabilidad legal |
| Moneda por defecto | Moneda base de operaciones | Si | Si | Impacta articulos y planilla |
| Estado | Activa/Inactiva | Si | Si | Inactiva no opera procesos nuevos |
| Logo | Imagen institucional | No | Si | Solo visual |

## 2. Formulario Empleados
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Codigo empleado | Codigo unico interno | Si | No | Se fija al crear |
| Nombre completo | Nombre legal del empleado | Si | Si | |
| Identificacion | Documento oficial | Si | No | Se bloquea por cumplimiento |
| Fecha ingreso | Inicio de relacion laboral | Si | Si | Afecta dias prorrateados |
| Salario base | Salario mensual base | Si | Si | Se restringe segun estado de planilla aplicada |
| Tipo salario | Mensual/Quincenal/Por hora | Si | Si | Define calculo de periodo |
| Empresa | Empresa asociada | Si | Si | |
| Departamento | Unidad organizacional | Si | Si | |
| Puesto | Cargo del empleado | Si | Si | |
| Clase | Clasificacion interna | No | Si | |
| Proyecto | Proyecto asociado | No | Si | |
| Estado laboral | Activo/Despedido/Renuncia/etc. | Si | Si | Controla elegibilidad en planilla |

## 3. Formulario Usuarios
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Correo | Usuario de acceso | Si | No | Llave de autenticacion |
| Nombre | Nombre visible | Si | Si | |
| Rol | Perfil funcional del usuario | Si | Si | Define permisos |
| Estado | Activo/Inactivo | Si | Si | Inactivo sin acceso |
| Empresa(s) asignada(s) | Ambito de datos autorizado | Si | Si | Sin empresa no opera |

## 4. Formulario Roles y Permisos
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Nombre de rol | Nombre funcional del rol | Si | Si | Debe ser unico |
| Permisos por modulo | Acciones permitidas (ver/crear/editar/aprobar/aplicar) | Si | Si | Cambios requieren gobierno |
| Estado | Activo/Inactivo | Si | Si | |

## 5. Formulario Calendario de Nomina
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Empresa | Empresa del calendario | Si | Si | |
| Tipo periodo | Semanal/Quincenal/Mensual | Si | Si | Define dias base |
| Fecha inicio | Inicio de periodo | Si | Si | |
| Fecha fin | Cierre de periodo | Si | Si | Debe ser >= inicio |
| Estado periodo | Abierto/Cerrado/Aplicado | Si | Si | Cerrado no admite cambios |

## 6. Formulario Articulos de Nomina
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Codigo articulo | Codigo de articulo | Si | No | Unico |
| Nombre articulo | Nombre funcional | Si | Si | |
| Categoria | Ingreso/Deduccion/Carga/Impuesto | Si | Si | Define signo (+/-) |
| Formula | Regla de calculo asociada | Si | Si | Validada por negocio |
| Cuenta contable | Cuenta asociada | Si | Si | Requerida para contabilidad |
| Estado | Activo/Inactivo | Si | Si | |

## 7. Formulario Movimientos de Nomina
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Tipo movimiento | Definicion del movimiento | Si | Si | |
| Articulo asociado | Articulo que impacta calculo | Si | Si | |
| Metodo calculo | Monto, porcentaje, dias, horas | Si | Si | |
| Vigencia | Rango de fechas | Si | Si | Fuera de vigencia no aplica |
| Estado | Activo/Inactivo | Si | Si | |

## 8. Formulario Acciones de Personal (operativo)
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Empleado | Empleado objetivo | Si | No | Debe pertenecer a empresa activa |
| Tipo accion | Ausencia, licencia, incapacidad, horas extra, etc. | Si | No | Define formula |
| Movimiento | Regla de movimiento asociada | Si | Si | |
| Fecha inicio | Inicio de accion | Si | Si | |
| Fecha fin | Fin de accion | Si | Si | |
| Cantidad | Dias/Horas/Unidades | Segun tipo | Si | |
| Monto | Monto monetario | Segun tipo | Si | Calculado o manual segun configuracion |
| Remunerada | Si/No | Segun tipo | Si | Afecta dias y devengado |
| Estado | Pendiente/Aprobada/Invalidada/etc. | Si | No (por flujo) | Cambia por aprobacion/invalidacion |

## 9. Formulario Cargar Planilla Regular
| Campo | Descripcion | Obligatorio | Editable | Bloqueo / Nota |
|---|---|---|---|---|
| Empresa | Empresa de la planilla | Si | No (durante sesion) | |
| Planilla seleccionada | Planilla objetivo | Si | Si (antes de cargar) | |
| Filtros | Busqueda de empleados | No | Si | |
| Incluir en planilla (check) | Marca empleado para totales y apply | Si (para aplicar) | Si | Persistente por planilla |
| Verificado | Cierre de revision de empleado | No | Si | Marcado+verificado activa candado duro |

## 10. Campos de calculo en tabla de planilla
| Campo | Descripcion | Fuente de calculo |
|---|---|---|
| Salario Base | Salario mensual del empleado | Ficha empleado |
| Salario Quincenal Bruto | Base proporcional por dias/periodo | Regla periodo (dias/30) |
| Devengado | Bruto total del periodo | Base + acciones aprobadas de ingreso |
| Cargas Sociales | Deducciones legales | Porcentajes legales sobre base definida |
| Impuesto Renta | Deduccion fiscal | Tramos + creditos fiscales |
| Monto Neto | Pago final | Devengado - (cargas + renta + deducciones) |
| Dias | Dias computados del periodo | Periodo - restas por acciones no remuneradas |

## 11. Restricciones criticas de negocio
- Solo acciones `APPROVED` impactan calculo final.
- Solo empleados marcados entran a totales y apply.
- Empleado `marcado + verificado` queda bloqueado para crear/aprobar/invalidar acciones en esa planilla.
- Planilla `APLICADA` no permite edicion operativa.

## 12. Referencias
- [Manual de Usuario Enterprise](./14-MANUAL-USUARIO-ENTERPRISE-KPITAL360.md)
- [Planilla Operativa](./05-PLANILLA-OPERATIVA.md)
- [Acciones de Personal Operativo](./06-ACCIONES-PERSONAL-OPERATIVO.md)
