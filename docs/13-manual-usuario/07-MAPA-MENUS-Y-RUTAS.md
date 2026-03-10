# Manual de Usuario - Mapa de Menus y Rutas

## Objetivo
Permitir que cualquier usuario encuentre rapidamente donde ejecutar cada proceso.

## Mapa principal
| Area | Menu | Ruta funcional | Para que sirve |
|---|---|---|---|
| Acceso | Login | Inicio de sesion | Entrar al sistema |
| Contexto | Seleccion de empresa | Cambio de empresa activa | Definir en que empresa trabajar |
| Configuracion | Empresas | Configuracion > Empresas | Crear/editar/inactivar empresas |
| Configuracion | Cuentas contables | Configuracion > Cuentas contables | Gestionar catalogo contable |
| Parametros de planilla | Articulos de nomina | Parametros de Planilla > Articulos de nomina | Configurar conceptos de pago/deduccion |
| Gestion personas | Empleados | Empleados | Crear y administrar empleados |
| Acciones de personal | Ausencias | Acciones de personal > Ausencias | Gestionar ausencias |
| Acciones de personal | Bonificaciones | Acciones de personal > Bonificaciones | Gestionar bonificaciones |
| Acciones de personal | Horas extra | Acciones de personal > Horas extra | Gestionar horas extra |
| Acciones de personal | Descuentos | Acciones de personal > Descuentos | Gestionar descuentos |
| Gestion planilla | Generar/Cargar planilla | Gestion Planilla | Preparar planilla por periodo |
| Gestion planilla | Verificar/Aplicar planilla | Gestion Planilla | Cerrar planilla en estado final |

## Guia rapida por objetivo
- Crear empresa: [Empresas](./01-EMPRESAS.md)
- Crear cuenta contable: [Cuentas contables](./04-CUENTAS-CONTABLES.md)
- Crear articulo de nomina: [Articulos de nomina](./03-ARTICULOS-NOMINA.md)
- Crear empleado: [Empleados](./02-EMPLEADOS.md)
- Ejecutar planilla: [Planilla operativa](./05-PLANILLA-OPERATIVA.md)
- Aplicar accion de personal: [Acciones de personal](./06-ACCIONES-PERSONAL-OPERATIVO.md)

## Flujo de navegacion recomendado
```mermaid
flowchart LR
  A[Login] --> B[Seleccion empresa]
  B --> C[Configuracion base]
  C --> D[Operacion RRHH]
  D --> E[Acciones de personal]
  E --> F[Planilla]
```

## Ver tambien
- [Guia rapida de usuario](./00-GUIA-RAPIDA-USUARIO.md)
- [Planilla operativa](./05-PLANILLA-OPERATIVA.md)
- [Indice maestro](../00-INDICE-CONSOLIDACION.md)
