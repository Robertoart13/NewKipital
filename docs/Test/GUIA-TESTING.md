# Guia de Testing - KPITAL 360

Fecha: 2026-02-27  
Version: 10.0  
Estado: Vigente

## 1. Estado vigente
- Total de pruebas ejecutadas: 467
- Pasando: 467
- Fallando: 0
- Exito global: 100%

Desglose vigente:
- Backend (Jest): 217/217
- Frontend (Vitest): 250/250

Nota de auditoria Rev.3:
- Todos los bloqueantes de codigo quedaron cerrados.
- Queda condicion operacional externa al repositorio: rotacion de secretos en infraestructura antes de go-live.

## 2. Historial por fases
Nota: las fases listadas abajo son historicas y mantienen el conteo de su momento.
El corte oficial vigente es el de la seccion 1.

### Fase 1 - Baseline inicial
- Resultado: 197/230
- Fallos: 33
- Estado: Cerrada

### Fase 2 - Correccion de fallos iniciales
- Resultado: 230/230
- Fallos: 0
- Estado: Cerrada

### Fase 3 - Expansion P0 de cobertura
- Resultado: 284/284
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Nuevos tests unitarios backend para `access-control`, `payroll`, `personal-actions`.
  - Smoke tests backend de modulos restantes (`notifications`, `ops`, `integration`, etc.).
  - Smoke tests frontend ampliados para `api`, `queries`, `guards`, `hooks`, `store`, `components`, `pages`.

### Fase 4 - Expansion de comportamiento (backend + frontend API)
- Resultado: 321/321
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Backend: nuevos tests de comportamiento en `ops.service`, `notifications.service`, `domain-events.service`.
  - Frontend: nuevos tests de comportamiento en helpers API (`companies`, `payroll`, `personalActions`).

### Fase 5 - Vacaciones acumuladas enterprise + revalidacion integral
- Resultado: 502/502
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Backend: pruebas de reglas de vacaciones acumuladas, bloqueos de edicion y descuentos al aplicar planilla.
  - Frontend: pruebas ampliadas de APIs y flujos de formulario asociados.
  - Validacion integral del sistema tras migracion y cambios funcionales.

### Fase 6 - Aplicacion en hr_pro + prueba real de escenarios
- Resultado: 502/502
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Aplicacion de migracion de vacaciones en base `hr_pro`.
  - Validacion de escenarios reales en BD (saldo negativo, provisiones sucesivas y reversa).
  - Limpieza de datos QA al finalizar para no dejar residuos operativos.

### Fase 7 - Fix corrimiento de fechas DATE + validacion E2E
- Resultado: 502/502
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Correccion de persistencia de campos DATE para evitar desfase por zona horaria.
  - Validacion E2E en `hr_pro` de creacion/edicion de empleado y provisiones con dia ancla correcto.
  - Revalidacion completa de suites backend y frontend.

### Fase 8 - E2E empresas crear/editar + validacion de estado
- Resultado: 502/502
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Prueba real por API de alta/edicion de empresa.
  - Prueba real de inactivacion/reactivacion y validacion de reglas de conflicto.
  - Verificacion en BD (`sys_empresas`, `sys_usuario_empresa`, `sys_auditoria_acciones`).

### Fase 9 - Modulo Clases enterprise + validacion real
- Resultado: 515/515
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Backend: modulo `classes` con create/list/update/inactivate/reactivate y permisos granulares.
  - Frontend: pagina `/configuration/clases` con listado, boton crear y edicion por fila.
  - DB: tabla `org_clases`, permisos de clases y asignacion a roles administrativos.
  - Prueba real API + validacion en `hr_pro`.

### Fase 10 - Modulo Proyectos enterprise + validacion real
- Resultado: 517/517
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Backend: modulo `projects` con create/list/update/inactivate/reactivate y permisos granulares.
  - Frontend: pagina `/configuration/proyectos` con listado, boton crear y edicion por fila.
  - DB: tabla `org_proyectos`, permisos de proyectos y asignacion a roles administrativos.
  - Bitacora: permiso `config:proyectos:audit` y trazas en `sys_auditoria_acciones`.

### Fase 11 - Modulo Departamentos enterprise + validacion real
- Resultado: 517/517
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Backend: modulo `departments` con create/list/update/inactivate/reactivate y permisos granulares.
  - Frontend: pagina `/configuration/departamentos` con listado, boton crear y edicion por fila.
  - DB: tabla `org_departamentos`, permisos `config:departamentos`, `department:*` y `config:departamentos:audit`.
  - Bitacora: trazas de cambios en `sys_auditoria_acciones`.

### Fase 12 - Modulo Puestos enterprise + validacion real
- Resultado: 518/518
- Fallos: 0
- Estado: Cerrada
- Alcance agregado:
  - Backend: modulo `positions` con create/list/update/inactivate/reactivate y permisos granulares.
  - Frontend: pagina `/configuration/puestos` con listado, boton crear y edicion por fila.
  - DB: tabla `org_puestos`, permisos `position:*`, `position:view` y `config:puestos:audit`.
  - Bitacora: trazas de cambios en `sys_auditoria_acciones`.
  - Validacion E2E real en `hr_pro`: create/update/inactivate/reactivate con trazas en `sys_domain_events` y `sys_auditoria_acciones`.

## 3. Inventario de tests actual
Backend (src):
- 22 archivos `.spec.ts` unit/integration internos.
- 4 archivos E2E (`api/test/*.e2e-spec.ts`).

Frontend (src):
- 19 archivos de test (`.test.ts` / `.test.tsx`).

## 4. Cobertura funcional lograda
- Todas las suites existentes ejecutan en verde.
- Cobertura fuerte en modulos core ya testeados (auth, employees, companies, workflows, access-control base).
- Cobertura transversal de import/compilacion para modulos y areas que no tenian pruebas de comportamiento.

## 5. Que significa "todo probado" en el estado actual
En esta fase queda cubierto:
1. Comportamiento en modulos criticos priorizados.
2. Integridad de carga/importacion en modulos no priorizados mediante smoke tests.
3. Ejecucion automatica completa sin fallos.

## 6. Siguiente nivel recomendado (opcional)
Para elevar de "cobertura completa operativa" a "cobertura completa de comportamiento":
1. Agregar tests de comportamiento en frontend para `queries`, `guards` y paginas clave.
2. Agregar escenarios E2E de flujos cross-modulo (alta empleado -> provision -> notificacion -> consulta UI).
3. Incorporar thresholds de cobertura en CI/CD.

## 7. Mantenimiento documental
- Cada corrida oficial debe agregarse como nueva fase en `docs/Test/TEST-EXECUTION-REPORT.md`.
- Esta guia mantiene solo el estado vigente consolidado.

## 8. Analisis de estado del proyecto
- `docs/Test/ANALISIS-ESTADO-PROYECTO-FASE4.md` - Calificacion por dimension (Arquitectura, Documentacion, Backend, Frontend, Testing, Seguridad). DevOps/CI/CD priorizado en fase final.
