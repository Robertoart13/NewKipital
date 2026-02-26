# Articulos de Nomina — Guia Operativa (Enterprise)

**Documento:** 39
**Ultima actualizacion:** 2026-02-26
**Proposito:** Guia completa para implementar y validar el modulo Articulos de Nomina. Incluye reglas, validaciones, UX, BD, permisos, endpoints y pendientes.

---

## 1. Alcance

Modulo en **Parametros de Planilla** para gestionar Articulos de Nomina por empresa. Debe seguir la misma UX y logica que Empresas/Empleados/Clases/Proyectos/Cuentas Contables.

Incluye:
- Listar con filtros y multi-empresa.
- Crear.
- Editar.
- Inactivar.
- Reactivar.
- Bitacora (audit trail).

---

## 2. Permisos (obligatorios)

- `payroll-article:view` (listar/ver).
- `payroll-article:create`.
- `payroll-article:edit`.
- `payroll-article:inactivate`.
- `payroll-article:reactivate`.
- `payroll-article:audit` (bitacora).

Regla: la vista, menu y acciones deben ocultarse si no existe el permiso (misma logica que Empleados/Empresas).

---

## 3. Campos

**No existe campo codigo.** Solo se usan estos:

- Empresa (obligatorio).
- Nombre Articulo (obligatorio).
- Tipo Accion Personal (obligatorio).
- Tipo Articulo de Nomina (obligatorio).
- Cuenta Gasto (obligatoria).
- Cuenta Pasivo (opcional, solo para Aporte Patronal).
- Descripcion (opcional, default `--` si viene vacia).

---

## 4. Catalogos y Tablas

### 4.1. nom_tipo_articulo_nomina (crear si no existe)
Seed obligatorio:
- `Ingreso` (id=1)
- `Deduccion` (id=2)
- `Gasto Empleado` (id=9)
- `Aporte Patronal` (id=10)

### 4.2. nom_tipos_accion_personal (existente)
Usar tabla existente.

### 4.3. erp_cuentas_contables (existente)
Usar tabla existente.

---

## 5. Reglas de Negocio

### 5.1. Regla de empresa
- Crear: solo empresas activas.
- Editar: si la empresa actual esta inactiva, se muestra en solo lectura con badge **Inactivo** y se habilita selector para cambiar a empresa activa (estilo Netsuite/Oracle).

### 5.2. Regla de tipo articulo
- Crear: solo tipos activos.
- Editar: si el tipo esta inactivo, se muestra en solo lectura con badge **Inactivo** y se habilita selector para cambiar a activo.

### 5.3. Regla de tipo accion personal
- Crear: solo tipos activos.
- Editar: si el tipo esta inactivo, se muestra en solo lectura con badge **Inactivo** y se habilita selector para cambiar a activo.

### 5.4. Cuentas contables (filtro por tipo)
Filtro por `id_tipo_erp` segun tipo de articulo:

- Ingreso -> [18, 19, 17]
- Deduccion -> [12, 13, 14]
- Gasto Empleado -> [18, 19, 12]
- Aporte Patronal -> [18, 19, 13]

### 5.5. Etiquetas dinamicas de cuenta
- Ingreso: **Cuenta Gasto**
- Deduccion: **Cuenta Pasivo**
- Gasto Empleado: **Cuenta Costo**
- Aporte Patronal: **Cuenta Gasto** + **Cuenta Pasivo (opcional)**

### 5.6. Regla Aporte Patronal
- `Cuenta Gasto` obligatoria.
- `Cuenta Pasivo` opcional.

### 5.7. Descripcion default
- Si no se envia, guardar `--`.

---

## 6. UX / Frontend

### 6.1. Listado
- UX identico a Empresas/Empleados/Cuentas Contables.
- Filtros por:
  - Empresa
  - Nombre
  - Tipo Articulo
  - Tipo Accion
  - Cuenta Principal
  - Cuenta Pasivo
  - Estado
- Multi-empresa (igual que Cuentas Contables).

### 6.2. Crear
- Solo opciones activas en todos los selects.
- Cuentas contables no se cargan hasta que se selecciona empresa.
- Cuentas filtradas por empresa + tipo de articulo.

### 6.3. Editar
- Regla Netsuite/Oracle:
  - Si empresa/tipo/cuenta/accion esta inactiva, se muestra solo lectura con badge y un selector para cambiar a activo.
- Preload obligatorio al abrir modal (igual que Cuentas Contables).

### 6.4. Bitacora
- Solo visible si existe permiso `payroll-article:audit`.
- Solo se carga al abrir la pestaña Bitacora (lazy load).

---

## 7. API / Backend

Endpoints requeridos:
- `GET /payroll-articles`
- `POST /payroll-articles`
- `PUT /payroll-articles/:id`
- `PATCH /payroll-articles/:id/inactivate`
- `PATCH /payroll-articles/:id/reactivate`
- `GET /payroll-articles/:id/audit-trail`
- `GET /payroll-articles/types`
- `GET /payroll-articles/personal-action-types`
- `GET /payroll-articles/accounts?idEmpresa=&idTipoArticuloNomina=`

Reglas de backend:
- Validar empresa activa.
- Validar tipo articulo activo.
- Validar tipo accion activo.
- Validar cuenta contable por empresa + id_tipo_erp permitido.
- No permitir cuenta pasivo si el tipo no la permite.

---

## 8. Base de Datos

### 8.1. Tablas nuevas
- `nom_tipo_articulo_nomina`
- `nom_articulos_nomina`

### 8.2. Relaciones
- `nom_articulos_nomina.id_empresa` -> `sys_empresas.id_empresa`
- `nom_articulos_nomina.id_tipo_articulo_nomina` -> `nom_tipo_articulo_nomina.id_tipo_articulo_nomina`
- `nom_articulos_nomina.id_tipo_accion_personal` -> `nom_tipos_accion_personal.id_tipo_accion_personal`
- `nom_articulos_nomina.id_cuenta_gasto` -> `erp_cuentas_contables.id_cuenta_contable`
- `nom_articulos_nomina.id_cuenta_pasivo` -> `erp_cuentas_contables.id_cuenta_contable`

---

## 9. Pendientes actuales (estado del repo)

1. Crear vista `PayrollArticlesManagementPage.tsx` (frontend).
2. Registrar export en `frontend/src/pages/private/index.ts`.
3. Agregar ruta `/payroll-params/articulos` en `frontend/src/router/AppRouter.tsx`.
4. Aplicar migracion y seed en base `hr_pro`.
5. Ejecutar pruebas y actualizar `docs/Test/TEST-EXECUTION-REPORT.md`.

---

## 10. Pruebas requeridas

### 10.1. Creacion
- Ingreso con Cuenta Gasto valida.
- Deduccion con Cuenta Pasivo.
- Gasto Empleado con Cuenta Costo.
- Aporte Patronal con Cuenta Gasto y Pasivo opcional.

### 10.2. Validaciones
- Intentar usar cuenta de otra empresa (debe bloquear).
- Intentar usar cuenta con `id_tipo_erp` no permitido (debe bloquear).
- Intentar usar cuenta inactiva (debe bloquear).
- Intentar usar pasivo en tipo que no aplica (debe bloquear).

### 10.3. Edicion
- Editar articulo con empresa inactiva y cambiar a activa.
- Editar articulo con tipo inactivo y cambiar a activo.
- Editar articulo con cuenta inactiva y cambiar a activa.

### 10.4. Bitacora
- Verifica que solo cargue al abrir tab.
- Validar registro en bitacora por crear/editar/inactivar/reactivar.

---

## 11. Documentacion y reporte

- Actualizar `docs/09-EstadoActualProyecto.md` con resumen del modulo.
- Actualizar `docs/Test/TEST-EXECUTION-REPORT.md` con fase y evidencia.

---

## 12. Estilo de implementacion

- Seguir naming y layout de modulos existentes (Empresas/Empleados/Cuentas Contables).
- No agregar validaciones diferentes a las ya establecidas.
- No introducir campos nuevos ni cambiar reglas.

---

## 13. Checklist rapido

- [ ] Vista creada y exportada.
- [ ] Ruta agregada.
- [ ] Permisos creados y asignados.
- [ ] Migracion aplicada en hr_pro.
- [ ] CRUD funcionando con validaciones.
- [ ] Bitacora funcionando.
- [ ] Tests ejecutados y documentados.

