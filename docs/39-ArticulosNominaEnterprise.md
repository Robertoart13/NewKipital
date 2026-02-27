# Articulos de Nomina — Guia Operativa (Enterprise)

**Documento:** 39
**Ultima actualizacion:** 2026-02-27
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
- `config:payroll-articles:audit` (bitacora).

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
`Tipo Articulo Nomina` usa un catalogo fijo en frontend (`idsReferencia`) y ese arreglo se envia al API para filtrar cuentas por empresa.

Filtro por `id_tipo_erp` segun `idsReferencia`:

- Ingreso -> [18, 19, 17]
- Deduccion -> [12, 13, 14]
- Gasto Empleado -> [18, 19, 12]
- Aporte Patronal -> [18, 19, 13]

Flujo actual:
- Frontend selecciona tipo (1, 2, 9, 10).
- Frontend resuelve `idsReferencia` desde `PAYROLL_ARTICLE_TYPE_META`.
- Frontend llama `GET /payroll-articles/accounts?idEmpresa=...&idsReferencia=...`.
- Backend filtra `erp_cuentas_contables.id_tipo_erp IN (idsReferencia)`.

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
- Cuentas filtradas por empresa + `idsReferencia` del tipo de articulo.

### 6.3. Editar
- Regla Netsuite/Oracle:
  - Si empresa/tipo/cuenta/accion esta inactiva, se muestra solo lectura con badge y un selector para cambiar a activo.
- Preload obligatorio al abrir modal (igual que Cuentas Contables).

### 6.4. Bitacora
- Solo visible si existe permiso `config:payroll-articles:audit`.
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
- `GET /payroll-articles/accounts?idEmpresa=&idsReferencia=18,19,17`

Reglas de backend:
- Validar empresa activa.
- Validar tipo articulo activo.
- Validar tipo accion activo.
- Validar cuenta contable por empresa + `id_tipo_erp` permitido para el tipo seleccionado.
- No permitir cuenta pasivo si el tipo no la permite.

### 7.1. Actualizacion de permisos sin refresh (tiempo real)
- Seguridad y UX enterprise para rutas protegidas de Articulos de Nomina:
  - Backend emite SSE `permissions.changed` a usuarios afectados cuando cambian roles/permisos.
  - Frontend se conecta a `GET /api/auth/permissions-stream` usando `API_URL` absoluta del backend.
  - Frontend refresca permisos con `refreshAuthz=true` y actualiza Redux sin recargar pagina.
  - Frontend incluye respaldo con polling de `GET /auth/authz-token` (aprox. 2.5s) para detectar cambios aun si SSE se corta.
  - `PermissionGuard` reevalua en vivo.
- Caso esperado:
  - Si un usuario pierde `payroll-article:view` mientras esta en `/payroll-params/articulos`, la vista cambia automaticamente a:
    - `Acceso denegado`
    - `No tiene el permiso requerido para: payroll-article:view`
- Troubleshooting conocido:
  - Error `GET http://localhost:5173/api/auth/permissions-stream 404` indica que SSE se esta llamando con ruta relativa.
  - Debe usarse `new EventSource(\`${API_URL}/auth/permissions-stream\`, { withCredentials: true })`.

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

## 9. Estado actual (implementado)

1. Vista `PayrollArticlesManagementPage.tsx` implementada.
2. Modal de crear/editar implementado con preload y reglas de inactivos.
3. Carga de cuentas implementada por `idsReferencia`.
4. Endpoint de cuentas actualizado para recibir `idsReferencia`.
5. Bitacora habilitada por permiso `config:payroll-articles:audit`.

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

- [x] Vista creada y exportada.
- [x] Ruta agregada.
- [x] Permisos creados y asignados.
- [x] CRUD funcionando con validaciones.
- [x] Bitacora funcionando.
- [ ] Tests ejecutados y documentados.

---

## 14. Movimientos de Nomina (nuevo modulo)

### 14.1. Alcance
- Ruta: `/payroll-params/movimientos`.
- CRUD completo: listar, crear, editar, inactivar, reactivar.
- Bitacora por registro (lazy load en tab de bitacora).
- Filtro por empresa (multiempresa en listado).
- UX alineada al patron de Articulos/Empleados: header, seccion filtros colapsable, tabla y modal con tabs.

### 14.2. Permisos
- `payroll-movement:view`
- `payroll-movement:create`
- `payroll-movement:edit`
- `payroll-movement:inactivate`
- `payroll-movement:reactivate`
- `config:payroll-movements:audit`

Regla: sin permiso no se muestra menu/acciones/vista, igual que en modulos existentes.

### 14.3. Tabla y campos (BD)
Tabla: `nom_movimientos_nomina`

Columnas:
- `id_movimiento_nomina` (PK)
- `id_empresa_movimiento_nomina` (FK -> `sys_empresas.id_empresa`)
- `nombre_movimiento_nomina`
- `id_articulo_nomina_movimiento_nomina` (FK -> `nom_articulos_nomina.id_articulo_nomina`)
- `id_tipo_accion_personal_movimiento_nomina` (FK -> `nom_tipos_accion_personal.id_tipo_accion_personal`)
- `id_clase_movimiento_nomina` (FK nullable -> `org_clases.id_clase`)
- `id_proyecto_movimiento_nomina` (FK nullable -> `org_proyectos.id_proyecto`)
- `descripcion_movimiento_nomina`
- `es_monto_fijo_movimiento_nomina` (tinyint 1/0)
- `monto_fijo_movimiento_nomina` (varchar, guarda exactamente lo que escribe el usuario)
- `porcentaje_movimiento_nomina` (varchar, guarda exactamente lo que escribe el usuario)
- `formula_ayuda_movimiento_nomina`
- `es_inactivo_movimiento_nomina`
- `fecha_creacion_movimiento_nomina`
- `fecha_modificacion_movimiento_nomina`

### 14.4. Reglas de negocio
- Flujo de formulario:
  - Primero empresa.
  - Luego articulo de nomina (se carga por empresa; bloqueado sin empresa).
  - Al elegir articulo, se autocompleta tipo accion personal desde el articulo.
  - Clase y proyecto son opcionales.
- Validaciones:
  - Monto y porcentaje no pueden ser negativos.
  - Si `es_monto_fijo_movimiento_nomina=1`:
    - `porcentaje_movimiento_nomina` debe ser `0`.
  - Si `es_monto_fijo_movimiento_nomina=0`:
    - `monto_fijo_movimiento_nomina` debe ser `0`.
  - El valor decimal se guarda textual (varchar), sin redondeos forzados.
- Integridad:
  - Articulo debe pertenecer a la empresa seleccionada.
  - Tipo accion debe coincidir con el tipo accion del articulo.
  - Proyecto debe pertenecer a la empresa seleccionada.
  - No permitir seleccionar registros inactivos en crear (y en editar aplicar patron de reemplazo cuando corresponda).

### 14.5. Endpoints
- `GET /payroll-movements`
- `GET /payroll-movements/:id`
- `POST /payroll-movements`
- `PUT /payroll-movements/:id`
- `PATCH /payroll-movements/:id/inactivate`
- `PATCH /payroll-movements/:id/reactivate`
- `GET /payroll-movements/:id/audit-trail`
- `GET /payroll-movements/articles?idEmpresa=...`
- `GET /payroll-movements/personal-action-types`
- `GET /payroll-movements/classes`
- `GET /payroll-movements/projects?idEmpresa=...`

### 14.6. Estado actual
- Backend implementado (modulo, servicio, controlador, DTOs, entidad).
- Frontend implementado (API client, ruta, pagina, filtros, modal, bitacora).
- Permisos creados y asignados a rol `MASTER`.
- UX de guardado ajustada:
  - En Editar/Crear Movimiento, el boton de guardar no depende de navegar por todas las pestañas.
  - El boton se habilita por permiso (`create`/`edit`) y la validacion se ejecuta al enviar.
  - Si falta un campo requerido, el formulario muestra error y cambia automaticamente a la pestaña correspondiente.
- Nota operativa de migraciones:
  - El archivo de migracion existe en codigo.
  - En `hr_pro` se aplico SQL idempotente directo por desalineacion historica de migraciones legacy.

