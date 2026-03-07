# KPITAL 360  Gua de Usuario
### Manual para el equipo de Recursos Humanos
**Versin 1.0  Febrero 2026**

---

- UI: se elimin? la secci?n "Planillas en las que entrar?a" en el modal de vacaciones. La asignaci?n es interna.


- Solape de planillas: si una fecha coincide con m?ltiples planillas ABIERTAS/EN_PROCESO, **no se bloquea** la selecci?n. Se asigna autom?ticamente por prioridad: estado ABIERTA > EN_PROCESO; si empatan, menor fecha de inicio; si empatan, menor ID.
- Se muestra advertencia en UI cuando hay fechas solapadas.

## Contenido

1. [Qu es KPITAL 360?](#1-qu-es-kpital-360)
2. [Acceso al Sistema (Login)](#2-acceso-al-sistema-login)
3. [Cmo navegar el sistema](#3-cmo-navegar-el-sistema)
4. [Mdulo: Empleados](#4-mdulo-empleados)
5. [Mdulo: Acciones de Personal](#5-mdulo-acciones-de-personal)
6. [Mdulo: Ausencias](#6-mdulo-ausencias)
7. [Mdulo: Planilla / Nmina](#7-mdulo-planilla--nmina)
8. [Mdulo: Artculos de Nmina](#8-mdulo-artculos-de-nmina)
9. [Mdulo: Movimientos de Nmina](#9-mdulo-movimientos-de-nmina)
10. [Configuracin del Sistema](#10-configuracin-del-sistema)
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
12. [Historial y Bitcora (Auditora)](#12-historial-y-bitcora-auditora)
13. [Permisos por Rol  Referencia Rpida](#13-permisos-por-rol--referencia-rpida)
14. [Preguntas Frecuentes](#14-preguntas-frecuentes)

---

## 1. Qu es KPITAL 360?

KPITAL 360 es el sistema centralizado de gestin de **Recursos Humanos y Planilla** de la organizacin. Desde aqu usted puede:

- Registrar y administrar empleados
- Gestionar planillas (nminas) mensuales o quincenales
- Procesar ausencias, vacaciones, incapacidades y licencias
- Llevar el historial completo de cambios de cada colaborador
- Administrar permisos y accesos por usuario

El sistema est diseado para que **todo quede registrado automticamente**. No se eliminan datos; en su lugar, todo se inactiva o invalida dejando rastro completo.

> **Importante:** Lo que usted puede ver y hacer en el sistema depende de los permisos que tenga asignados. Si no ve alguna opcin del men, es porque no tiene acceso a esa funcin. Contacte al administrador del sistema para solicitar acceso.

---

## 2. Acceso al Sistema (Login)

### Cmo ingresar

1. Abra su navegador web (Google Chrome recomendado).
2. Ingrese la direccin del sistema que le proporcion el administrador.
3. Ver la pantalla de inicio de sesin:

```

           KPITAL 360                
                                     
   Correo electrnico:               
   [______________________________]  
                                     
   Contrasea:                       
   [______________________________]  
                                     
         [ Iniciar Sesin ]          

```

4. Escriba su **correo electrnico** y su **contrasea**.
5. Haga clic en **Iniciar Sesin**.

### Primer ingreso

Si es la primera vez que accede, el administrador del sistema le habr enviado sus credenciales de acceso por correo. Se le pedir que cambie su contrasea al ingresar por primera vez.

### Olvid mi contrasea?

Contacte al administrador del sistema para que restablezca su contrasea. No hay opcin de recuperacin automtica por seguridad.

### Cambio de empresa (si administra varias empresas)

Si su usuario tiene acceso a ms de una empresa, ver un **selector de empresa** en la parte superior de la pantalla. Haga clic en el nombre de la empresa actual para cambiar a otra.

> Solo ver informacin de la empresa que tenga seleccionada en ese momento.

---

## 3. Cmo navegar el sistema

### El men principal

El men est ubicado en la **barra superior** de la pantalla (no hay barra lateral). Las opciones que vea dependen de sus permisos.

```

  [LOGO]  Acciones de Personal   Parmetros de Planilla   Config       

```

| Seccin del men | Para qu sirve? |
|---|---|
| **Acciones de Personal** | Gestionar ingresos, salidas, ausencias, vacaciones, incapacidades, licencias, deducciones y ms |
| **Parmetros de Planilla** | Configurar el calendario de planilla, artculos y movimientos de nmina |
| **Configuracin** | Administrar empresas, empleados, departamentos, usuarios, roles y permisos |

### El cono de campana ()

Muestra notificaciones del sistema (acciones pendientes de aprobacin, alertas, etc.).

### El cono de usuario ()

Haga clic en su avatar o nombre de usuario en la esquina superior derecha para:
- Ver su perfil
- Cerrar sesin

### Cmo cerrar sesin

Haga clic en su nombre de usuario (parte superior derecha)  seleccione **Cerrar Sesin**.

> **Buena prctica:** Siempre cierre sesin cuando termine de trabajar, especialmente si usa una computadora compartida.

---

## 4. Mdulo: Empleados

**Dnde est?** Men  **Configuracin**  **Gestin Organizacional**  **Empleados**

### Qu puedo hacer aqu?

Registrar nuevos colaboradores, consultar su informacin, editarla e inactivarlos cuando corresponda.

### Ver la lista de empleados

Al entrar al mdulo ver una tabla con todos los empleados activos. Puede filtrar por:

| Filtro | Descripcin |
|---|---|
| **Nombre** | Bsqueda por nombre o apellido |
| **Cdigo** | Cdigo interno del empleado (ej: KPid-5-001) |
| **Estado** | Activo, Inactivo, En Licencia, Desvinculado |
| **Departamento** | Filtrar por rea de la empresa |

### Crear un nuevo empleado

1. Haga clic en el botn **"+ Nuevo Empleado"**.
2. Se abrir un formulario con varias pestaas. Complete cada una:

#### Pestaa 1: Informacin Personal

| Campo | Descripcin | Obligatorio |
|---|---|---|
| Nombre | Primer nombre del colaborador | S |
| Apellidos | Apellidos completos | S |
| Gnero | Masculino / Femenino / Otro | S |
| Cdula | Nmero de identificacin | S |
| Estado Civil | Soltero, Casado, etc. | No |
| Fecha de Nacimiento | Da/Mes/Ao | No |

#### Pestaa 2: Contacto

| Campo | Descripcin | Obligatorio |
|---|---|---|
| Correo electrnico | Email personal del colaborador | S |
| Telfono | Nmero de contacto | No |
| Direccin | Domicilio del colaborador | No |

#### Pestaa 3: Informacin Laboral

| Campo | Descripcin | Obligatorio |
|---|---|---|
| Puesto | Cargo que ocupa | S |
| Departamento | rea a la que pertenece | S |
| Fecha de Ingreso | Da en que inici labores | S |
| Supervisor | Quin lo supervisa directamente | No |
| Salario | Monto del salario base | S |
| Tipo de Contrato | Permanente, Temporal, etc. | S |
| Moneda | Colones / Dlares | S |
| Jornada | Completa, Parcial, etc. | S |

#### Pestaa 4: Informacin Financiera

| Campo | Descripcin | Obligatorio |
|---|---|---|
| Nmero de cuenta bancaria | Cuenta para depsito del salario | No |
| Nmero CCSS | Nmero de seguro social | No |
| Mtodo de pago | Depsito, Cheque, Efectivo | S |

#### Pestaa 5: Acceso Digital

Aqu puede otorgarle acceso al sistema KPITAL al empleado si corresponde, y asignarle un rol.

#### Pestaa 6: Historia Laboral

| Campo | Descripcin |
|---|---|
| Das iniciales de vacaciones | Saldo de vacaciones con que inicia |
| Acumulacin de cesanta | Si aplica acumulacin desde el inicio |

3. Haga clic en **Guardar**.

El sistema asignar automticamente un cdigo nico al empleado.

### Ver o editar un empleado

1. Haga clic sobre el nombre o fila del empleado en la lista.
2. Se abrir su ficha completa.
3. Si tiene permiso de edicin, ver el botn **Editar**. Haga los cambios y guarde.

### Inactivar un empleado

Cuando un colaborador se desvincula de la empresa:

1. Abra la ficha del empleado.
2. Haga clic en **Inactivar** o **Liquidar** segn el caso.
3. El sistema pedir una razn (motivo de salida).
4. Confirme. El empleado quedar en estado **Desvinculado** pero su historial se conserva siempre.

> **Nota:** No es posible eliminar empleados del sistema. Solo se inactivan. Esto es por seguridad y trazabilidad.

### Estados de un empleado

| Estado | Significado |
|---|---|
| **Activo** | Trabajando normalmente |
| **Inactivo** | No est trabajando pero no ha sido desvinculado formalmente |
| **En Licencia** | En permiso temporal (maternidad, mdico, etc.) |
| **Desvinculado** | Ya no trabaja en la empresa |

---

## 5. Mdulo: Acciones de Personal

**Dnde est?** Men  **Acciones de Personal**

### Qu son las Acciones de Personal?

Son los eventos o solicitudes que afectan al colaborador durante su relacin laboral. Pueden ser:

| Tipo de Accin | Ejemplos |
|---|---|
| **Ingresos** | Horas extra, bonificaciones, comisiones |
| **Salarios** | Aumentos de salario |
| **Ausencias** | Vacaciones, incapacidades, permisos sin goce |
| **Deducciones** | Retenciones, descuentos por prstamos |
| **Licencias** | Licencias por maternidad, paternidad, estudio |
| **Incapacidades** | Subsidios por enfermedad o accidente |
| **Entradas** | Contratacin de un nuevo colaborador |
| **Salidas** | Despidos o renuncias |

### Ciclo de vida de una Accin de Personal

Toda accin pasa por los siguientes estados:

```
Pendiente Supervisor  Aprobada  Asociada a Planilla  Pagada
                     Rechazada / Invalidada
```

| Estado | Significado |
|---|---|
| **Pendiente Supervisor** | Creada, esperando aprobacin del supervisor |
| **Aprobada** | Supervisor (y/o RRHH) aprob la accin |
| **Asociada a Planilla** | Vinculada a una planilla abierta, lista para pago |
| **Pagada** | La planilla fue aplicada, la accin fue ejecutada |
| **Invalidada** | Cancelada (no se elimina, queda en historial) |

### Crear una Accin de Personal

1. En el submen de **Acciones de Personal**, seleccione el tipo de accin.
2. Haga clic en **"+ Nueva Accin"**.
3. Seleccione el empleado.
4. Complete los campos segn el tipo de accin.
5. Guarde. La accin queda en estado **Pendiente Supervisor**.

### Aprobar o Rechazar una Accin

Si tiene permiso de aprobacin:

1. Localice la accin en la lista (estado: **Pendiente Supervisor**).
2. Haga clic sobre ella para abrirla.
3. Haga clic en **Aprobar** o **Rechazar**.
4. Si rechaza, el sistema pedir indicar el motivo.

> **Importante:** Solo las acciones **Aprobadas** pueden vincularse a una planilla para ser pagadas.

---

## 6. Mdulo: Ausencias

**Dnde est?** Men  **Acciones de Personal**  **Ausencias**

### Qu son las Ausencias?

Son los das que un colaborador no trabaja por alguna razn: vacaciones, incapacidad, permiso sin goce, etc.

### Registrar una Ausencia

1. Haga clic en **"+ Nueva Ausencia"**.
2. Complete el formulario:

| Campo | Descripcin | Obligatorio |
|---|---|---|
| Empleado | Seleccione el colaborador | S |
| Perodo de Planilla | A qu planilla aplica esta ausencia | S |
| Tipo de Ausencia | Vacaciones, Incapacidad, Permiso, etc. | S |
| Fecha(s) | Das que cubre la ausencia | S |
| Cantidad de das | Nmero de das a ausencias | S |
| Monto | Si aplica (ej: subsidio de incapacidad) | Depende |
| Observacin | Notas adicionales (opcional) | No |

3. Puede agregar **varias lneas** si la ausencia abarca mltiples fechas o tipos diferentes.
4. Guarde. La ausencia queda **Pendiente de Supervisor**.

### Flujo de aprobacin de Ausencias

```
Creada  Pendiente Supervisor  Aprobada por Supervisor  Aprobada por RRHH  Pagada
```

| Paso | Quin acta? |
|---|---|
| Creacin | RRHH o el propio colaborador (si tiene acceso) |
| Aprobacin del Supervisor | El supervisor directo del colaborador |
| Aprobacin RRHH | El rea de Recursos Humanos |
| Pago | Se ejecuta automticamente al aplicar la planilla |

### Ver ausencias existentes

La lista de ausencias muestra filtros por:
- Estado (Pendiente, Aprobada, Pagada, Invalidada)
- Empleado
- Perodo de planilla

Haga clic en cualquier ausencia para ver su detalle completo.

---

## 7. Mdulo: Planilla / Nmina

**Dnde est?** Men  **Parmetros de Planilla**  **Parmetros Iniciales**  **Das de Pago**

### Qu es una Planilla?

Es el perodo de pago de la empresa. Cada planilla agrupa todos los salarios, deducciones, bonificaciones y pagos que se ejecutan en ese perodo.

### Estados de una Planilla

Las planillas siguen un flujo **estricto e irreversible**:

```
Abierta  Verificada  Distribucin de Costos  Aplicada
         Inactiva (cancelada en cualquier punto previo a Aplicada)
```

| Estado | Qu significa? | Se puede editar? |
|---|---|---|
| **Abierta** | En proceso, aceptando cambios | S |
| **Verificada** | RRHH revis y aprob | Solo campos menores |
| **Distribucin de Costos** | Costos asignados a centros de costo | No |
| **Aplicada** | Cerrada y pagada | **No  jams** |
| **Inactiva** | Cancelada antes de aplicarse | No |

> **Muy importante:** Una planilla **Aplicada** no puede modificarse bajo ningn concepto. Es el registro oficial de pago. Cualquier correccin se hace en la siguiente planilla.

### Abrir una nueva Planilla

1. Haga clic en **"+ Nueva Planilla"**.
2. Complete:

| Campo | Descripcin |
|---|---|
| Empresa | La empresa a la que pertenece esta planilla |
| Tipo de perodo | Mensual, Quincenal, Semanal, etc. |
| Fecha de inicio | Primer da del perodo |
| Fecha de fin | ltimo da del perodo |

3. El sistema validar que no exista otra planilla para el mismo perodo.
4. Guarde. La planilla queda en estado **Abierta**.

### Proceso completo de cierre de planilla

Siga estos pasos **en orden**:

#### Paso 1: Verificar la Planilla
- Revise que todos los empleados estn correctos.
- Confirme las acciones de personal aprobadas y asociadas.
- Haga clic en **Verificar**. Estado cambia a: **Verificada**.

#### Paso 2: Distribucin de Costos (si aplica)
- Si su empresa usa centros de costo, asigne los gastos a cada uno.
- Haga clic en confirmar distribucin.

#### Paso 3: Procesar
- El sistema genera un resumen (snapshot) con los totales por empleado.
- Revise los montos.
- Haga clic en **Procesar**.

#### Paso 4: Aplicar la Planilla 
- **Esto es irreversible.**
- Al aplicar, el sistema:
  - Cierra el perodo definitivamente.
  - Marca todas las acciones de personal asociadas como **Pagadas**.
  - Descuenta los das de vacaciones usados.
  - Genera el registro histrico permanente.
- Haga clic en **Aplicar** y confirme.

### Ver el calendario de planillas

En **Das de Pago** tambin puede ver una vista de **Calendario** que muestra todos los perodos del ao en formato visual para identificar fcilmente los perodos activos, cerrados y futuros.

---

## 8. Mdulo: Artculos de Nmina

**Dnde est?** Men  **Parmetros de Planilla**  **Parmetros Iniciales**  **Artculos de Nmina**

### Qu son los Artculos de Nmina?

Son los componentes que forman la planilla de cada empleado. Cada ingreso, deduccin o beneficio est definido como un artculo.

### Tipos de Artculos

| Tipo | Descripcin | Ejemplo |
|---|---|---|
| **Ingreso** | Dinero que recibe el empleado | Salario base, horas extra, bonificacin |
| **Deduccin** | Dinero que se descuenta al empleado | Cuota de seguro, embargo judicial |
| **Gasto Empleado** | Beneficio que paga el empleado | Cuota del plan de salud |
| **Aporte Patronal** | Beneficio que paga la empresa | Aporte CCSS patronal |

### Crear un Artculo de Nmina

1. Haga clic en **"+ Nuevo Artculo"**.
2. Complete:

| Campo | Descripcin |
|---|---|
| Nombre | Nombre descriptivo del artculo (ej: "Horas Extra 50%") |
| Tipo | Ingreso, Deduccin, Gasto Empleado, Aporte Patronal |
| Tipo de Accin de Personal | Con qu tipo de accin se relaciona |
| Cuenta contable asociada | Si maneja contabilidad, la cuenta GL |

3. Guarde.

### Inactivar o reactivar un Artculo

Si un artculo ya no se usa, puede inactivarlo para que no aparezca en nuevas planillas. No se elimina; queda en historial.

---

## 9. Mdulo: Movimientos de Nmina

**Dnde est?** Men  **Parmetros de Planilla**  **Parmetros Iniciales**  **Movimientos de Nmina**

### Qu son los Movimientos de Nmina?

Son ajustes **temporales o nicos** que se aplican a uno o ms empleados en un perodo especfico. A diferencia de los artculos (que son permanentes), los movimientos son puntuales.

### Ejemplos de uso

- Pagar una bonificacin nica a un empleado este mes.
- Aplicar un descuento especial por prstamo en un perodo especfico.
- Agregar un ajuste salarial temporal.

### Crear un Movimiento

1. Haga clic en **"+ Nuevo Movimiento"**.
2. Seleccione:
   - Empleado(s) afectados
   - Artculo de nmina que aplica
   - Perodo de planilla
   - Monto
3. Guarde.

> Los movimientos solo pueden aplicarse si la planilla est en estado **Abierta**. Una vez verificada o aplicada, no se pueden agregar ms movimientos.

---

## 10. Configuracin del Sistema

**Dnde est?** Men  **Configuracin**

Esta seccin es para administradores del sistema o personal de RRHH con permisos elevados.

---

### 10.1 Empresas

**Dnde est?** Configuracin  **Gestin Organizacional**  **Empresas**

Aqu se registran y administran las empresas del grupo. Cada empresa tiene su propia configuracin, empleados y planillas.

#### Datos de una Empresa

| Campo | Descripcin |
|---|---|
| Nombre | Nombre legal de la empresa |
| Identificacin Legal | Cdula jurdica o nmero fiscal |
| Moneda | Moneda principal de pago |
| Frecuencia de pago | Mensual, Quincenal, Semanal |
| Estado | Activa / Inactiva |

> **Nota:** No se puede inactivar una empresa que tenga planillas abiertas o en proceso. Primero cierre las planillas.

---

### 10.2 Departamentos

**Dnde est?** Configuracin  **Gestin Organizacional**  **Departamentos**

Los departamentos son las reas organizativas de la empresa (ej: Finanzas, Operaciones, Tecnologa).

- Pueden tener jerarquas (departamento padre e hijo).
- Se asignan a los empleados.
- Se usan para filtrar reportes.

Para crear uno: clic en **"+ Nuevo Departamento"**, escriba el nombre y, si aplica, el departamento padre. Guarde.

---

### 10.3 Puestos

**Dnde est?** Configuracin  **Gestin Organizacional**  **Puestos**

Los puestos son los cargos o ttulos de trabajo (ej: Analista de RRHH, Gerente de Ventas, Asistente Administrativo).

- Se asignan a los empleados al crearlos o editarlos.
- Ayudan a organizar y filtrar el personal.

---

### 10.4 Clases de Empleado

**Dnde est?** Configuracin  **Gestin Organizacional**  **Clases**

Las clases son categoras de empleados (ej: Permanente, Temporal, Por Proyecto). Se usan principalmente en los clculos de planilla.

---

### 10.5 Proyectos

**Dnde est?** Configuracin  **Gestin Organizacional**  **Proyectos**

Si su empresa distribuye costos por proyectos o centros de costo, aqu se registran. Los proyectos permiten asignar gastos de nmina a diferentes reas o proyectos especficos.

---

### 10.6 Cuentas Contables

**Dnde est?** Configuracin  **Gestin Organizacional**  **Cuentas Contables**

Son las cuentas del plan contable de la empresa. Se usan para vincular los artculos de nmina con la contabilidad. Solo necesita administrarlas si su empresa integra planilla con contabilidad.

| Tipo de Cuenta | Descripcin |
|---|---|
| Ingreso | Cuentas de ingresos al empleado |
| Gasto | Cuentas de gastos de la empresa |
| Pasivo | Cuentas de obligaciones por pagar |

---

### 10.7 Usuarios

**Dnde est?** Configuracin  **Seguridad**  **Usuarios**

Aqu se administran las cuentas de acceso al sistema de todas las personas que usan KPITAL 360.

#### Ver y buscar usuarios

La lista muestra todos los usuarios registrados. Puede buscar por nombre o correo.

#### Configurar un usuario

Haga clic sobre el usuario. Se abre un panel lateral con pestaas:

**Pestaa: Empresas**
Aqu selecciona a qu empresas tiene acceso este usuario. Solo ver datos de las empresas que tenga asignadas.

**Pestaa: Roles**
Asigne uno o ms roles al usuario. Los roles definen qu puede hacer en el sistema.

**Pestaa: Excepciones Globales**
Si necesita bloquear un permiso especfico para este usuario (aunque su rol lo permita), se hace aqu. Tambin puede conceder permisos puntuales que su rol no tiene.

> Los cambios de permisos y roles se aplican en la prxima vez que el usuario inicie sesin.

---

### 10.8 Roles

**Dnde est?** Configuracin  **Seguridad**  **Roles**

Un rol es un conjunto de permisos agrupados. En lugar de asignar permisos uno a uno, se crea un rol (ej: "Coordinador de RRHH") y se le asigna a los usuarios.

#### Roles predefinidos del sistema

| Rol | Quin lo usa? | Nivel de acceso |
|---|---|---|
| **MASTER** | Superadministrador tcnico | Acceso total al sistema |
| **ADMIN_SISTEMA** | Administrador del sistema | Gestin de configuracin completa |
| **RRHH** | Personal de Recursos Humanos | Empleados, planilla y acciones de personal |

#### Crear un rol personalizado

1. Haga clic en **"+ Nuevo Rol"**.
2. Escriba el nombre del rol (ej: "Supervisor de rea").
3. Seleccione los permisos que tendr.
4. Guarde y asigne el rol a los usuarios correspondientes.

---

### 10.9 Permisos

**Dnde est?** Configuracin  **Seguridad**  **Permisos**

Esta seccin muestra el catlogo completo de permisos disponibles en el sistema. Cada permiso habilita una accin especfica.

El formato de los permisos es: **`mdulo:accin`**

Ejemplos:
- `employee:view`  Ver empleados
- `employee:create`  Crear empleados
- `payroll:apply`  Aplicar planillas

No es necesario gestionar permisos individuales si usa roles bien configurados. Solo use esta seccin para casos excepcionales.

---

## 11. Vacaciones y Saldos

### Cmo funciona el sistema de vacaciones?

KPITAL 360 lleva un registro automtico del **saldo de vacaciones** de cada empleado:

| Evento | Efecto en el saldo |
|---|---|
| Creacin del empleado | Se carga el saldo inicial definido al crear |
| Cada mes (aniversario) | Se acredita automticamente +1 da (o proporcional) |
| Ausencia por vacaciones pagada | Se descuenta del saldo |

### Ver el saldo de vacaciones de un empleado

1. Abra la ficha del empleado (Configuracin  Empleados).
2. En la pestaa de **Historia Laboral** o seccin de **Vacaciones**, ver:
   - Saldo actual disponible
   - Historial de acumulaciones y consumos

### Puede el saldo quedar en negativo?

S. El sistema permite saldo negativo (por ejemplo, si el empleado tom vacaciones anticipadas). Ese saldo se recuperar con las acumulaciones futuras.

### Qu pasa si se aplica la planilla con una ausencia de vacaciones?

Al **Aplicar** la planilla, el sistema descuenta automticamente los das de vacaciones de la ausencia del saldo del empleado. No es necesario hacerlo manualmente.

---

## 12. Historial y Bitcora (Auditora)

### Qu es la Bitcora?

La bitcora es el registro histrico de **todos los cambios** que se han hecho en el sistema. Cada modificacin guarda:

| Informacin registrada | Ejemplo |
|---|---|
| Quin hizo el cambio? | Mara Garca |
| Cundo? | 15/02/2026 a las 10:34 a.m. |
| Qu cambi? | Salario: 800,000  900,000 |
| Por qu? | Aumento anual segn poltica salarial |

### Cmo ver la bitcora?

En la mayora de las fichas (empleados, planillas, acciones de personal) hay una pestaa o seccin llamada **"Bitcora"** o **"Historial"**. Haga clic para ver todos los cambios registrados.

### Se puede borrar la bitcora?

No. La bitcora es **permanente e inmutable**. Ningn usuario puede borrar registros histricos.

---

## 13. Permisos por Rol  Referencia Rpida

La siguiente tabla muestra las acciones tpicas y qu rol las puede realizar:

| Accin | Supervisor | RRHH | Administrador | MASTER |
|---|---|---|---|---|
| Ver lista de empleados |  |  |  |  |
| Crear empleados |  |  |  |  |
| Editar empleados |  |  |  |  |
| Inactivar empleados |  |  |  |  |
| Ver acciones de personal |  |  |  |  |
| Crear acciones de personal |  |  |  |  |
| Aprobar acciones de personal |  |  |  |  |
| Ver planillas |  |  |  |  |
| Abrir una planilla |  |  |  |  |
| Verificar planilla |  |  |  |  |
| Aplicar (cerrar) planilla |  |  |  |  |
| Ver ausencias |  |  |  |  |
| Crear ausencias |  |  |  |  |
| Aprobar ausencias |  |  |  |  |
| Gestionar usuarios |  |  |  |  |
| Gestionar roles |  |  |  |  |
| Gestionar empresas |  |  |  |  |
| Ver bitcora de empleados |  |  |  |  |
| Ver bitcora de planilla |  |  |  |  |
| Gestionar artculos de nmina |  |  |  |  |
| Gestionar movimientos de nmina |  |  |  |  |
| Configurar departamentos y puestos |  |  |  |  |

>  = Puede hacerlo (con el rol correcto) |  = No puede hacerlo con ese rol base

**Nota:** Los permisos pueden personalizarse. Esta tabla muestra configuraciones tpicas. Si necesita acceso a una funcin especfica, contacte al administrador del sistema.

---

## 14. Preguntas Frecuentes

### Por qu no veo una opcin en el men?

Si no ve una opcin del men, es porque su usuario no tiene el permiso necesario para esa funcin. Contacte al administrador del sistema y solicite que le asigne el permiso o rol correspondiente.

---

### Puedo eliminar un empleado del sistema?

No. Los empleados nunca se eliminan. Solo se inactivan o se marcan como desvinculados. Esto es para mantener el historial laboral completo y cumplir con los requisitos legales.

---

### Puedo modificar una planilla ya aplicada?

No. Las planillas aplicadas son **definitivas e inmutables**. Si hubo un error, la correccin se debe hacer en la siguiente planilla mediante una accin de personal (ajuste, bonificacin, deduccin).

---

### Qu pasa si se aplica una planilla con un error?

Contacte al administrador. La solucin es registrar una accin de personal de ajuste en la siguiente planilla (un ingreso para compensar un pago de menos, o una deduccin para recuperar un pago de ms).

---

### Cmo s qu planilla est abierta actualmente?

Vaya a **Parmetros de Planilla  Das de Pago**. Las planillas en estado **Abierta** son las que estn activas y pueden recibir cambios.

---

### Qu hago si el sistema me muestra un error de "Acceso denegado"?

Significa que intenta realizar una accin para la cual no tiene permiso. Anote qu estaba haciendo y contacte al administrador del sistema para que revise sus permisos.

---

### Con qu frecuencia se acumulan las vacaciones?

Las vacaciones se acumulan automticamente cada mes, en el da de aniversario del empleado. No necesita hacer nada manualmente; el sistema lo hace solo al aplicar las planillas.

---

### Puedo tener acceso a varias empresas?

S. Si el administrador le asigna acceso a varias empresas, podr cambiar entre ellas con el selector de empresa en la parte superior de la pantalla. Los datos de cada empresa son independientes.

---

### Los cambios de permisos son inmediatos?

No exactamente. Si el administrador modifica sus permisos, deber **cerrar sesin y volver a entrar** para que los cambios surtan efecto.

---

### Quin puede ver la informacin de salarios?

Solo los usuarios con el permiso `employee:view` pueden ver la informacin de empleados. Los salarios y datos sensibles (cdulas, cuentas bancarias) estn **cifrados** en el sistema y solo se muestran a quienes tienen el acceso autorizado.

---

*Gua de Usuario  KPITAL 360 | Recursos Humanos*
*Para soporte tcnico, contacte al administrador del sistema.*
*Versin 1.0  Febrero 2026*

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
