# KPITAL 360 — Guía de Usuario
### Manual para el equipo de Recursos Humanos
**Versión 1.0 — Febrero 2026**

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Contenido

1. [¿Qué es KPITAL 360?](#1-qué-es-kpital-360)
2. [Acceso al Sistema (Login)](#2-acceso-al-sistema-login)
3. [Cómo navegar el sistema](#3-cómo-navegar-el-sistema)
4. [Módulo: Empleados](#4-módulo-empleados)
5. [Módulo: Acciones de Personal](#5-módulo-acciones-de-personal)
6. [Módulo: Ausencias](#6-módulo-ausencias)
7. [Módulo: Planilla / Nómina](#7-módulo-planilla--nómina)
8. [Módulo: Artículos de Nómina](#8-módulo-artículos-de-nómina)
9. [Módulo: Movimientos de Nómina](#9-módulo-movimientos-de-nómina)
10. [Configuración del Sistema](#10-configuración-del-sistema)
    - [Empresas](#101-empresas)
    - [Departamentos](#102-departamentos)
    - [Puestos](#103-puestos)
    - [Clases de Empleado](#104-clases-de-empleado)
    - [Proyectos](#105-proyectos)
    - [Cuentas Contables](#106-cuentas-contables)
    - [Usuarios](#107-usuarios)
    - [Roles](#108-roles)
    - [Permisos](#109-permisos)
11. [Vacaciones y Saldos](#11-vacaciones-y-saldos)
12. [Historial y Bitácora (Auditoría)](#12-historial-y-bitácora-auditoría)
13. [Permisos por Rol — Referencia Rápida](#13-permisos-por-rol--referencia-rápida)
14. [Preguntas Frecuentes](#14-preguntas-frecuentes)

---

## 1. ¿Qué es KPITAL 360?

KPITAL 360 es el sistema centralizado de gestión de **Recursos Humanos y Planilla** de la organización. Desde aquí usted puede:

- Registrar y administrar empleados
- Gestionar planillas (nóminas) mensuales o quincenales
- Procesar ausencias, vacaciones, incapacidades y licencias
- Llevar el historial completo de cambios de cada colaborador
- Administrar permisos y accesos por usuario

El sistema está diseñado para que **todo quede registrado automáticamente**. No se eliminan datos; en su lugar, todo se inactiva o invalida dejando rastro completo.

> **Importante:** Lo que usted puede ver y hacer en el sistema depende de los permisos que tenga asignados. Si no ve alguna opción del menú, es porque no tiene acceso a esa función. Contacte al administrador del sistema para solicitar acceso.

---

## 2. Acceso al Sistema (Login)

### Cómo ingresar

1. Abra su navegador web (Google Chrome recomendado).
2. Ingrese la dirección del sistema que le proporcionó el administrador.
3. Verá la pantalla de inicio de sesión:

```
┌─────────────────────────────────────┐
│           KPITAL 360                │
│                                     │
│   Correo electrónico:               │
│   [______________________________]  │
│                                     │
│   Contraseña:                       │
│   [______________________________]  │
│                                     │
│         [ Iniciar Sesión ]          │
└─────────────────────────────────────┘
```

4. Escriba su **correo electrónico** y su **contraseña**.
5. Haga clic en **Iniciar Sesión**.

### Primer ingreso

Si es la primera vez que accede, el administrador del sistema le habrá enviado sus credenciales de acceso por correo. Se le pedirá que cambie su contraseña al ingresar por primera vez.

### ¿Olvidé mi contraseña?

Contacte al administrador del sistema para que restablezca su contraseña. No hay opción de recuperación automática por seguridad.

### Cambio de empresa (si administra varias empresas)

Si su usuario tiene acceso a más de una empresa, verá un **selector de empresa** en la parte superior de la pantalla. Haga clic en el nombre de la empresa actual para cambiar a otra.

> Solo verá información de la empresa que tenga seleccionada en ese momento.

---

## 3. Cómo navegar el sistema

### El menú principal

El menú está ubicado en la **barra superior** de la pantalla (no hay barra lateral). Las opciones que vea dependen de sus permisos.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO]  Acciones de Personal ▼  Parámetros de Planilla ▼  Config ▼  │  🔔  👤
└──────────────────────────────────────────────────────────────────────┘
```

| Sección del menú | ¿Para qué sirve? |
|---|---|
| **Acciones de Personal** | Gestionar ingresos, salidas, ausencias, vacaciones, incapacidades, licencias, deducciones y más |
| **Parámetros de Planilla** | Configurar el calendario de planilla, artículos y movimientos de nómina |
| **Configuración** | Administrar empresas, empleados, departamentos, usuarios, roles y permisos |

### El ícono de campana (🔔)

Muestra notificaciones del sistema (acciones pendientes de aprobación, alertas, etc.).

### El ícono de usuario (👤)

Haga clic en su avatar o nombre de usuario en la esquina superior derecha para:
- Ver su perfil
- Cerrar sesión

### Cómo cerrar sesión

Haga clic en su nombre de usuario (parte superior derecha) → seleccione **Cerrar Sesión**.

> **Buena práctica:** Siempre cierre sesión cuando termine de trabajar, especialmente si usa una computadora compartida.

---

## 4. Módulo: Empleados

**¿Dónde está?** Menú → **Configuración** → **Gestión Organizacional** → **Empleados**

### ¿Qué puedo hacer aquí?

Registrar nuevos colaboradores, consultar su información, editarla e inactivarlos cuando corresponda.

### Ver la lista de empleados

Al entrar al módulo verá una tabla con todos los empleados activos. Puede filtrar por:

| Filtro | Descripción |
|---|---|
| **Nombre** | Búsqueda por nombre o apellido |
| **Código** | Código interno del empleado (ej: KPid-5-001) |
| **Estado** | Activo, Inactivo, En Licencia, Desvinculado |
| **Departamento** | Filtrar por área de la empresa |

### Crear un nuevo empleado

1. Haga clic en el botón **"+ Nuevo Empleado"**.
2. Se abrirá un formulario con varias pestañas. Complete cada una:

#### Pestaña 1: Información Personal

| Campo | Descripción | Obligatorio |
|---|---|---|
| Nombre | Primer nombre del colaborador | Sí |
| Apellidos | Apellidos completos | Sí |
| Género | Masculino / Femenino / Otro | Sí |
| Cédula | Número de identificación | Sí |
| Estado Civil | Soltero, Casado, etc. | No |
| Fecha de Nacimiento | Día/Mes/Año | No |

#### Pestaña 2: Contacto

| Campo | Descripción | Obligatorio |
|---|---|---|
| Correo electrónico | Email personal del colaborador | Sí |
| Teléfono | Número de contacto | No |
| Dirección | Domicilio del colaborador | No |

#### Pestaña 3: Información Laboral

| Campo | Descripción | Obligatorio |
|---|---|---|
| Puesto | Cargo que ocupa | Sí |
| Departamento | Área a la que pertenece | Sí |
| Fecha de Ingreso | Día en que inició labores | Sí |
| Supervisor | Quién lo supervisa directamente | No |
| Salario | Monto del salario base | Sí |
| Tipo de Contrato | Permanente, Temporal, etc. | Sí |
| Moneda | Colones / Dólares | Sí |
| Jornada | Completa, Parcial, etc. | Sí |

#### Pestaña 4: Información Financiera

| Campo | Descripción | Obligatorio |
|---|---|---|
| Número de cuenta bancaria | Cuenta para depósito del salario | No |
| Número CCSS | Número de seguro social | No |
| Método de pago | Depósito, Cheque, Efectivo | Sí |

#### Pestaña 5: Acceso Digital

Aquí puede otorgarle acceso al sistema KPITAL al empleado si corresponde, y asignarle un rol.

#### Pestaña 6: Historia Laboral

| Campo | Descripción |
|---|---|
| Días iniciales de vacaciones | Saldo de vacaciones con que inicia |
| Acumulación de cesantía | Si aplica acumulación desde el inicio |

3. Haga clic en **Guardar**.

El sistema asignará automáticamente un código único al empleado.

### Ver o editar un empleado

1. Haga clic sobre el nombre o fila del empleado en la lista.
2. Se abrirá su ficha completa.
3. Si tiene permiso de edición, verá el botón **Editar**. Haga los cambios y guarde.

### Inactivar un empleado

Cuando un colaborador se desvincula de la empresa:

1. Abra la ficha del empleado.
2. Haga clic en **Inactivar** o **Liquidar** según el caso.
3. El sistema pedirá una razón (motivo de salida).
4. Confirme. El empleado quedará en estado **Desvinculado** pero su historial se conserva siempre.

> **Nota:** No es posible eliminar empleados del sistema. Solo se inactivan. Esto es por seguridad y trazabilidad.

### Estados de un empleado

| Estado | Significado |
|---|---|
| **Activo** | Trabajando normalmente |
| **Inactivo** | No está trabajando pero no ha sido desvinculado formalmente |
| **En Licencia** | En permiso temporal (maternidad, médico, etc.) |
| **Desvinculado** | Ya no trabaja en la empresa |

---

## 5. Módulo: Acciones de Personal

**¿Dónde está?** Menú → **Acciones de Personal**

### ¿Qué son las Acciones de Personal?

Son los eventos o solicitudes que afectan al colaborador durante su relación laboral. Pueden ser:

| Tipo de Acción | Ejemplos |
|---|---|
| **Ingresos** | Horas extra, bonificaciones, comisiones |
| **Salarios** | Aumentos de salario |
| **Ausencias** | Vacaciones, incapacidades, permisos sin goce |
| **Deducciones** | Retenciones, descuentos por préstamos |
| **Licencias** | Licencias por maternidad, paternidad, estudio |
| **Incapacidades** | Subsidios por enfermedad o accidente |
| **Entradas** | Contratación de un nuevo colaborador |
| **Salidas** | Despidos o renuncias |

### Ciclo de vida de una Acción de Personal

Toda acción pasa por los siguientes estados:

```
Pendiente Supervisor → Aprobada → Asociada a Planilla → Pagada
                    ↘ Rechazada / Invalidada
```

| Estado | Significado |
|---|---|
| **Pendiente Supervisor** | Creada, esperando aprobación del supervisor |
| **Aprobada** | Supervisor (y/o RRHH) aprobó la acción |
| **Asociada a Planilla** | Vinculada a una planilla abierta, lista para pago |
| **Pagada** | La planilla fue aplicada, la acción fue ejecutada |
| **Invalidada** | Cancelada (no se elimina, queda en historial) |

### Crear una Acción de Personal

1. En el submenú de **Acciones de Personal**, seleccione el tipo de acción.
2. Haga clic en **"+ Nueva Acción"**.
3. Seleccione el empleado.
4. Complete los campos según el tipo de acción.
5. Guarde. La acción queda en estado **Pendiente Supervisor**.

### Aprobar o Rechazar una Acción

Si tiene permiso de aprobación:

1. Localice la acción en la lista (estado: **Pendiente Supervisor**).
2. Haga clic sobre ella para abrirla.
3. Haga clic en **Aprobar** o **Rechazar**.
4. Si rechaza, el sistema pedirá indicar el motivo.

> **Importante:** Solo las acciones **Aprobadas** pueden vincularse a una planilla para ser pagadas.

---

## 6. Módulo: Ausencias

**¿Dónde está?** Menú → **Acciones de Personal** → **Ausencias**

### ¿Qué son las Ausencias?

Son los días que un colaborador no trabaja por alguna razón: vacaciones, incapacidad, permiso sin goce, etc.

### Registrar una Ausencia

1. Haga clic en **"+ Nueva Ausencia"**.
2. Complete el formulario:

| Campo | Descripción | Obligatorio |
|---|---|---|
| Empleado | Seleccione el colaborador | Sí |
| Período de Planilla | A qué planilla aplica esta ausencia | Sí |
| Tipo de Ausencia | Vacaciones, Incapacidad, Permiso, etc. | Sí |
| Fecha(s) | Días que cubre la ausencia | Sí |
| Cantidad de días | Número de días a ausencias | Sí |
| Monto | Si aplica (ej: subsidio de incapacidad) | Depende |
| Observación | Notas adicionales (opcional) | No |

3. Puede agregar **varias líneas** si la ausencia abarca múltiples fechas o tipos diferentes.
4. Guarde. La ausencia queda **Pendiente de Supervisor**.

### Flujo de aprobación de Ausencias

```
Creada → Pendiente Supervisor → Aprobada por Supervisor → Aprobada por RRHH → Pagada
```

| Paso | ¿Quién actúa? |
|---|---|
| Creación | RRHH o el propio colaborador (si tiene acceso) |
| Aprobación del Supervisor | El supervisor directo del colaborador |
| Aprobación RRHH | El área de Recursos Humanos |
| Pago | Se ejecuta automáticamente al aplicar la planilla |

### Ver ausencias existentes

La lista de ausencias muestra filtros por:
- Estado (Pendiente, Aprobada, Pagada, Invalidada)
- Empleado
- Período de planilla

Haga clic en cualquier ausencia para ver su detalle completo.

---

## 7. Módulo: Planilla / Nómina

**¿Dónde está?** Menú → **Parámetros de Planilla** → **Parámetros Iniciales** → **Días de Pago**

### ¿Qué es una Planilla?

Es el período de pago de la empresa. Cada planilla agrupa todos los salarios, deducciones, bonificaciones y pagos que se ejecutan en ese período.

### Estados de una Planilla

Las planillas siguen un flujo **estricto e irreversible**:

```
Abierta → Verificada → Distribución de Costos → Aplicada
        ↘ Inactiva (cancelada en cualquier punto previo a Aplicada)
```

| Estado | ¿Qué significa? | ¿Se puede editar? |
|---|---|---|
| **Abierta** | En proceso, aceptando cambios | Sí |
| **Verificada** | RRHH revisó y aprobó | Solo campos menores |
| **Distribución de Costos** | Costos asignados a centros de costo | No |
| **Aplicada** | Cerrada y pagada | **No — jamás** |
| **Inactiva** | Cancelada antes de aplicarse | No |

> **Muy importante:** Una planilla **Aplicada** no puede modificarse bajo ningún concepto. Es el registro oficial de pago. Cualquier corrección se hace en la siguiente planilla.

### Abrir una nueva Planilla

1. Haga clic en **"+ Nueva Planilla"**.
2. Complete:

| Campo | Descripción |
|---|---|
| Empresa | La empresa a la que pertenece esta planilla |
| Tipo de período | Mensual, Quincenal, Semanal, etc. |
| Fecha de inicio | Primer día del período |
| Fecha de fin | Último día del período |

3. El sistema validará que no exista otra planilla para el mismo período.
4. Guarde. La planilla queda en estado **Abierta**.

### Proceso completo de cierre de planilla

Siga estos pasos **en orden**:

#### Paso 1: Verificar la Planilla
- Revise que todos los empleados estén correctos.
- Confirme las acciones de personal aprobadas y asociadas.
- Haga clic en **Verificar**. Estado cambia a: **Verificada**.

#### Paso 2: Distribución de Costos (si aplica)
- Si su empresa usa centros de costo, asigne los gastos a cada uno.
- Haga clic en confirmar distribución.

#### Paso 3: Procesar
- El sistema genera un resumen (snapshot) con los totales por empleado.
- Revise los montos.
- Haga clic en **Procesar**.

#### Paso 4: Aplicar la Planilla ⚠️
- **Esto es irreversible.**
- Al aplicar, el sistema:
  - Cierra el período definitivamente.
  - Marca todas las acciones de personal asociadas como **Pagadas**.
  - Descuenta los días de vacaciones usados.
  - Genera el registro histórico permanente.
- Haga clic en **Aplicar** y confirme.

### Ver el calendario de planillas

En **Días de Pago** también puede ver una vista de **Calendario** que muestra todos los períodos del año en formato visual para identificar fácilmente los períodos activos, cerrados y futuros.

---

## 8. Módulo: Artículos de Nómina

**¿Dónde está?** Menú → **Parámetros de Planilla** → **Parámetros Iniciales** → **Artículos de Nómina**

### ¿Qué son los Artículos de Nómina?

Son los componentes que forman la planilla de cada empleado. Cada ingreso, deducción o beneficio está definido como un artículo.

### Tipos de Artículos

| Tipo | Descripción | Ejemplo |
|---|---|---|
| **Ingreso** | Dinero que recibe el empleado | Salario base, horas extra, bonificación |
| **Deducción** | Dinero que se descuenta al empleado | Cuota de seguro, embargo judicial |
| **Gasto Empleado** | Beneficio que paga el empleado | Cuota del plan de salud |
| **Aporte Patronal** | Beneficio que paga la empresa | Aporte CCSS patronal |

### Crear un Artículo de Nómina

1. Haga clic en **"+ Nuevo Artículo"**.
2. Complete:

| Campo | Descripción |
|---|---|
| Nombre | Nombre descriptivo del artículo (ej: "Horas Extra 50%") |
| Tipo | Ingreso, Deducción, Gasto Empleado, Aporte Patronal |
| Tipo de Acción de Personal | Con qué tipo de acción se relaciona |
| Cuenta contable asociada | Si maneja contabilidad, la cuenta GL |

3. Guarde.

### Inactivar o reactivar un Artículo

Si un artículo ya no se usa, puede inactivarlo para que no aparezca en nuevas planillas. No se elimina; queda en historial.

---

## 9. Módulo: Movimientos de Nómina

**¿Dónde está?** Menú → **Parámetros de Planilla** → **Parámetros Iniciales** → **Movimientos de Nómina**

### ¿Qué son los Movimientos de Nómina?

Son ajustes **temporales o únicos** que se aplican a uno o más empleados en un período específico. A diferencia de los artículos (que son permanentes), los movimientos son puntuales.

### Ejemplos de uso

- Pagar una bonificación única a un empleado este mes.
- Aplicar un descuento especial por préstamo en un período específico.
- Agregar un ajuste salarial temporal.

### Crear un Movimiento

1. Haga clic en **"+ Nuevo Movimiento"**.
2. Seleccione:
   - Empleado(s) afectados
   - Artículo de nómina que aplica
   - Período de planilla
   - Monto
3. Guarde.

> Los movimientos solo pueden aplicarse si la planilla está en estado **Abierta**. Una vez verificada o aplicada, no se pueden agregar más movimientos.

---

## 10. Configuración del Sistema

**¿Dónde está?** Menú → **Configuración**

Esta sección es para administradores del sistema o personal de RRHH con permisos elevados.

---

### 10.1 Empresas

**¿Dónde está?** Configuración → **Gestión Organizacional** → **Empresas**

Aquí se registran y administran las empresas del grupo. Cada empresa tiene su propia configuración, empleados y planillas.

#### Datos de una Empresa

| Campo | Descripción |
|---|---|
| Nombre | Nombre legal de la empresa |
| Identificación Legal | Cédula jurídica o número fiscal |
| Moneda | Moneda principal de pago |
| Frecuencia de pago | Mensual, Quincenal, Semanal |
| Estado | Activa / Inactiva |

> **Nota:** No se puede inactivar una empresa que tenga planillas abiertas o en proceso. Primero cierre las planillas.

---

### 10.2 Departamentos

**¿Dónde está?** Configuración → **Gestión Organizacional** → **Departamentos**

Los departamentos son las áreas organizativas de la empresa (ej: Finanzas, Operaciones, Tecnología).

- Pueden tener jerarquías (departamento padre e hijo).
- Se asignan a los empleados.
- Se usan para filtrar reportes.

Para crear uno: clic en **"+ Nuevo Departamento"**, escriba el nombre y, si aplica, el departamento padre. Guarde.

---

### 10.3 Puestos

**¿Dónde está?** Configuración → **Gestión Organizacional** → **Puestos**

Los puestos son los cargos o títulos de trabajo (ej: Analista de RRHH, Gerente de Ventas, Asistente Administrativo).

- Se asignan a los empleados al crearlos o editarlos.
- Ayudan a organizar y filtrar el personal.

---

### 10.4 Clases de Empleado

**¿Dónde está?** Configuración → **Gestión Organizacional** → **Clases**

Las clases son categorías de empleados (ej: Permanente, Temporal, Por Proyecto). Se usan principalmente en los cálculos de planilla.

---

### 10.5 Proyectos

**¿Dónde está?** Configuración → **Gestión Organizacional** → **Proyectos**

Si su empresa distribuye costos por proyectos o centros de costo, aquí se registran. Los proyectos permiten asignar gastos de nómina a diferentes áreas o proyectos específicos.

---

### 10.6 Cuentas Contables

**¿Dónde está?** Configuración → **Gestión Organizacional** → **Cuentas Contables**

Son las cuentas del plan contable de la empresa. Se usan para vincular los artículos de nómina con la contabilidad. Solo necesita administrarlas si su empresa integra planilla con contabilidad.

| Tipo de Cuenta | Descripción |
|---|---|
| Ingreso | Cuentas de ingresos al empleado |
| Gasto | Cuentas de gastos de la empresa |
| Pasivo | Cuentas de obligaciones por pagar |

---

### 10.7 Usuarios

**¿Dónde está?** Configuración → **Seguridad** → **Usuarios**

Aquí se administran las cuentas de acceso al sistema de todas las personas que usan KPITAL 360.

#### Ver y buscar usuarios

La lista muestra todos los usuarios registrados. Puede buscar por nombre o correo.

#### Configurar un usuario

Haga clic sobre el usuario. Se abre un panel lateral con pestañas:

**Pestaña: Empresas**
Aquí selecciona a qué empresas tiene acceso este usuario. Solo verá datos de las empresas que tenga asignadas.

**Pestaña: Roles**
Asigne uno o más roles al usuario. Los roles definen qué puede hacer en el sistema.

**Pestaña: Excepciones Globales**
Si necesita bloquear un permiso específico para este usuario (aunque su rol lo permita), se hace aquí. También puede conceder permisos puntuales que su rol no tiene.

> Los cambios de permisos y roles se aplican en la próxima vez que el usuario inicie sesión.

---

### 10.8 Roles

**¿Dónde está?** Configuración → **Seguridad** → **Roles**

Un rol es un conjunto de permisos agrupados. En lugar de asignar permisos uno a uno, se crea un rol (ej: "Coordinador de RRHH") y se le asigna a los usuarios.

#### Roles predefinidos del sistema

| Rol | ¿Quién lo usa? | Nivel de acceso |
|---|---|---|
| **MASTER** | Superadministrador técnico | Acceso total al sistema |
| **ADMIN_SISTEMA** | Administrador del sistema | Gestión de configuración completa |
| **RRHH** | Personal de Recursos Humanos | Empleados, planilla y acciones de personal |

#### Crear un rol personalizado

1. Haga clic en **"+ Nuevo Rol"**.
2. Escriba el nombre del rol (ej: "Supervisor de Área").
3. Seleccione los permisos que tendrá.
4. Guarde y asigne el rol a los usuarios correspondientes.

---

### 10.9 Permisos

**¿Dónde está?** Configuración → **Seguridad** → **Permisos**

Esta sección muestra el catálogo completo de permisos disponibles en el sistema. Cada permiso habilita una acción específica.

El formato de los permisos es: **`módulo:acción`**

Ejemplos:
- `employee:view` → Ver empleados
- `employee:create` → Crear empleados
- `payroll:apply` → Aplicar planillas

No es necesario gestionar permisos individuales si usa roles bien configurados. Solo use esta sección para casos excepcionales.

---

## 11. Vacaciones y Saldos

### ¿Cómo funciona el sistema de vacaciones?

KPITAL 360 lleva un registro automático del **saldo de vacaciones** de cada empleado:

| Evento | Efecto en el saldo |
|---|---|
| Creación del empleado | Se carga el saldo inicial definido al crear |
| Cada mes (aniversario) | Se acredita automáticamente +1 día (o proporcional) |
| Ausencia por vacaciones pagada | Se descuenta del saldo |

### Ver el saldo de vacaciones de un empleado

1. Abra la ficha del empleado (Configuración → Empleados).
2. En la pestaña de **Historia Laboral** o sección de **Vacaciones**, verá:
   - Saldo actual disponible
   - Historial de acumulaciones y consumos

### ¿Puede el saldo quedar en negativo?

Sí. El sistema permite saldo negativo (por ejemplo, si el empleado tomó vacaciones anticipadas). Ese saldo se recuperará con las acumulaciones futuras.

### ¿Qué pasa si se aplica la planilla con una ausencia de vacaciones?

Al **Aplicar** la planilla, el sistema descuenta automáticamente los días de vacaciones de la ausencia del saldo del empleado. No es necesario hacerlo manualmente.

---

## 12. Historial y Bitácora (Auditoría)

### ¿Qué es la Bitácora?

La bitácora es el registro histórico de **todos los cambios** que se han hecho en el sistema. Cada modificación guarda:

| Información registrada | Ejemplo |
|---|---|
| ¿Quién hizo el cambio? | María García |
| ¿Cuándo? | 15/02/2026 a las 10:34 a.m. |
| ¿Qué cambió? | Salario: ₡800,000 → ₡900,000 |
| ¿Por qué? | Aumento anual según política salarial |

### ¿Cómo ver la bitácora?

En la mayoría de las fichas (empleados, planillas, acciones de personal) hay una pestaña o sección llamada **"Bitácora"** o **"Historial"**. Haga clic para ver todos los cambios registrados.

### ¿Se puede borrar la bitácora?

No. La bitácora es **permanente e inmutable**. Ningún usuario puede borrar registros históricos.

---

## 13. Permisos por Rol — Referencia Rápida

La siguiente tabla muestra las acciones típicas y qué rol las puede realizar:

| Acción | Supervisor | RRHH | Administrador | MASTER |
|---|---|---|---|---|
| Ver lista de empleados | ✅ | ✅ | ✅ | ✅ |
| Crear empleados | ❌ | ✅ | ✅ | ✅ |
| Editar empleados | ❌ | ✅ | ✅ | ✅ |
| Inactivar empleados | ❌ | ✅ | ✅ | ✅ |
| Ver acciones de personal | ✅ | ✅ | ✅ | ✅ |
| Crear acciones de personal | ✅ | ✅ | ✅ | ✅ |
| Aprobar acciones de personal | ✅ | ✅ | ✅ | ✅ |
| Ver planillas | ❌ | ✅ | ✅ | ✅ |
| Abrir una planilla | ❌ | ✅ | ✅ | ✅ |
| Verificar planilla | ❌ | ✅ | ✅ | ✅ |
| Aplicar (cerrar) planilla | ❌ | ❌ | ✅ | ✅ |
| Ver ausencias | ✅ | ✅ | ✅ | ✅ |
| Crear ausencias | ✅ | ✅ | ✅ | ✅ |
| Aprobar ausencias | ✅ | ✅ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ | ✅ |
| Gestionar roles | ❌ | ❌ | ✅ | ✅ |
| Gestionar empresas | ❌ | ❌ | ✅ | ✅ |
| Ver bitácora de empleados | ❌ | ✅ | ✅ | ✅ |
| Ver bitácora de planilla | ❌ | ✅ | ✅ | ✅ |
| Gestionar artículos de nómina | ❌ | ✅ | ✅ | ✅ |
| Gestionar movimientos de nómina | ❌ | ✅ | ✅ | ✅ |
| Configurar departamentos y puestos | ❌ | ✅ | ✅ | ✅ |

> ✅ = Puede hacerlo (con el rol correcto) | ❌ = No puede hacerlo con ese rol base

**Nota:** Los permisos pueden personalizarse. Esta tabla muestra configuraciones típicas. Si necesita acceso a una función específica, contacte al administrador del sistema.

---

## 14. Preguntas Frecuentes

### ¿Por qué no veo una opción en el menú?

Si no ve una opción del menú, es porque su usuario no tiene el permiso necesario para esa función. Contacte al administrador del sistema y solicite que le asigne el permiso o rol correspondiente.

---

### ¿Puedo eliminar un empleado del sistema?

No. Los empleados nunca se eliminan. Solo se inactivan o se marcan como desvinculados. Esto es para mantener el historial laboral completo y cumplir con los requisitos legales.

---

### ¿Puedo modificar una planilla ya aplicada?

No. Las planillas aplicadas son **definitivas e inmutables**. Si hubo un error, la corrección se debe hacer en la siguiente planilla mediante una acción de personal (ajuste, bonificación, deducción).

---

### ¿Qué pasa si se aplica una planilla con un error?

Contacte al administrador. La solución es registrar una acción de personal de ajuste en la siguiente planilla (un ingreso para compensar un pago de menos, o una deducción para recuperar un pago de más).

---

### ¿Cómo sé qué planilla está abierta actualmente?

Vaya a **Parámetros de Planilla → Días de Pago**. Las planillas en estado **Abierta** son las que están activas y pueden recibir cambios.

---

### ¿Qué hago si el sistema me muestra un error de "Acceso denegado"?

Significa que intenta realizar una acción para la cual no tiene permiso. Anote qué estaba haciendo y contacte al administrador del sistema para que revise sus permisos.

---

### ¿Con qué frecuencia se acumulan las vacaciones?

Las vacaciones se acumulan automáticamente cada mes, en el día de aniversario del empleado. No necesita hacer nada manualmente; el sistema lo hace solo al aplicar las planillas.

---

### ¿Puedo tener acceso a varias empresas?

Sí. Si el administrador le asigna acceso a varias empresas, podrá cambiar entre ellas con el selector de empresa en la parte superior de la pantalla. Los datos de cada empresa son independientes.

---

### ¿Los cambios de permisos son inmediatos?

No exactamente. Si el administrador modifica sus permisos, deberá **cerrar sesión y volver a entrar** para que los cambios surtan efecto.

---

### ¿Quién puede ver la información de salarios?

Solo los usuarios con el permiso `employee:view` pueden ver la información de empleados. Los salarios y datos sensibles (cédulas, cuentas bancarias) están **cifrados** en el sistema y solo se muestran a quienes tienen el acceso autorizado.

---

*Guía de Usuario — KPITAL 360 | Recursos Humanos*
*Para soporte técnico, contacte al administrador del sistema.*
*Versión 1.0 — Febrero 2026*

---
## Actualizaci?n 2026-03-02 ? Vacaciones sin selecci?n de planilla (ACTUALIZACION-VACACIONES-2026-03-02
UI-PLANILLAS-REMOVIDA-2026-03-02
SOLAPE-PLANILLAS-2026-03-02)
- KPITAL (RRHH): el usuario ya no selecciona planilla en Vacaciones. Selecciona fechas y movimiento; el sistema determina la planilla elegible por cada fecha con base en calendario de n?mina (empresa/empleado/moneda/periodo).
- Validaciones: fines de semana y feriados bloqueados; fechas ya reservadas bloqueadas; saldo disponible; fechas deben pertenecer a un periodo elegible; si una fecha coincide con m?ltiples periodos, se rechaza.
- Consistencia de tipo: todas las fechas deben pertenecer al mismo tipo de planilla. Si no, error.
- Split autom?tico en creaci?n: si las fechas caen en m?s de un periodo del mismo tipo, se crean acciones separadas por periodo. En edici?n, solo se permite un periodo.
- Persistencia: `acc_vacaciones_fechas` y `acc_cuotas_accion` guardan `id_calendario_nomina` por fecha; el header de acci?n puede quedar con `id_calendario_nomina = NULL`.
- TimeWise: acciones de vacaciones se crean en estado Borrador sin planilla. RRHH completa fechas/movimiento en KPITAL; el sistema asigna planilla por fecha.
- Planilla: al cargar una planilla se consumen las fechas cuyo `id_calendario_nomina` coincide con la planilla y estado aprobado. No se requiere que el header tenga planilla.
---
