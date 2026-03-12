# 🛠️ Manual Tecnico - Modulo Reglas de Distribucion

## 🎯 Objetivo del modulo
Configurar como se mapea cada tipo de accion personal a una cuenta contable por empresa.

El modulo soporta dos ambitos:
- Regla global: aplica a toda la empresa.
- Regla especifica: aplica por departamento y opcionalmente por puesto.

## 🎯 Estado actual (implementado)
Backend:
- CRUD operativo de reglas.
- Inactivacion y reactivacion.
- Bitacora de auditoria por regla.
- `publicId` firmado para no exponer ID interno.

Frontend:
- Listado: `/configuration/reglas-distribucion`.
- Crear: `/configuration/reglas-distribucion/crear`.
- Editar: `/configuration/reglas-distribucion/editar/:publicId`.
- Acciones: crear, editar, inactivar y reactivar.
- Bitacora visible en pantalla de edicion (si hay permiso).

Correccion aplicada (2026-03-12):
- En modo edicion, ya no se resetean las lineas `detalles` al hidratar `idEmpresa`.
- El reset de lineas ahora aplica solo en modo creacion cuando el usuario cambia empresa manualmente.
- Se normaliza y rehidrata `detalles` desde API con `form.resetFields()` + `setFieldsValue(...)` para evitar estado residual.

## 🎯 Reglas de negocio clave
1. La empresa es obligatoria.
2. Global no usa departamento/puesto.
3. Especifica requiere departamento; puesto es opcional.
4. No se permite duplicar tipo de accion personal dentro de la misma regla.
5. La cuenta contable debe pertenecer a la empresa y al tipo de accion personal seleccionado.
6. Unicidad funcional de regla activa:
   - Una global activa por empresa.
   - Una especifica activa por combinacion empresa+departamento+puesto.

## 🎯 Permisos
- `config:reglas-distribucion`: listar.
- `config:reglas-distribucion:view`: ver detalle.
- `config:reglas-distribucion:edit`: crear, editar, inactivar, reactivar.
- `config:reglas-distribucion:audit`: consultar bitacora.

## 🎯 API del modulo
- `GET /distribution-rules`
- `GET /distribution-rules/:publicId`
- `POST /distribution-rules`
- `PUT /distribution-rules/:publicId`
- `PATCH /distribution-rules/:publicId/inactivate`
- `PATCH /distribution-rules/:publicId/reactivate`
- `GET /distribution-rules/:publicId/audit-trail`

Nota tecnica:
- `GET /distribution-rules` acepta `cb` (cache-buster) en query para compatibilidad con interceptor HTTP frontend.

## 🎯 Datos y tablas involucradas
- `config_reglas_distribucion` (cabecera).
- `config_reglas_distribucion_detalle` (lineas por tipo accion/cuenta).
- `sys_auditoria_acciones` (bitacora de cambios del modulo).

## 🎯 Evidencia de pruebas (E2E)
Suite:
- `api/test/distribution-rules.e2e-spec.ts`

Resultado:
- `6/6` pruebas en verde.

Archivos de evidencia:
- `api/test/evidence/distribution-rules.e2e.log`
- `api/test/evidence/distribution-rules.e2e.result.json`
- `api/test/evidence/distribution-rules.e2e.summary.txt`

## 🎯 Pendiente para continuar despues
1. Completar la vista funcional `Distribucion de la planilla` (`/payroll-management/planillas/aplicadas/distribucion/:publicId`) para cerrar flujo contable final.
2. Definir si se requiere exportacion de reglas (CSV/PDF) para auditoria operativa.
3. Agregar E2E de UI (Playwright) del flujo de pantalla (crear/editar/inactivar/reactivar).
4. Validar con negocio si se necesita versionado formal de reglas por vigencia (fecha inicio/fin) o si la inactivacion actual cubre el caso.

## 🔗 Ver tambien
- [Configuracion organizacional (usuario)](../13-manual-usuario/09-CONFIG-ORGANIZACION.md)
- [API y contratos](./04-API-CONTRATOS.md)
- [Datos y BD](./03-DATOS-Y-BD.md)
- [QA y testing](./05-QA-Y-TESTING.md)
- [Pendientes tecnicos](./06-PENDIENTES-TECNICOS.md)
