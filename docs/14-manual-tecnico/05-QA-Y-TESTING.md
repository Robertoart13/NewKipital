# 🛠️ Manual Tecnico - QA y Testing

## 🎯 Enfoque de prueba
Validar por modulo cuatro capas:
1. Happy path.
2. Validaciones de negocio.
3. Permisos y seguridad.
4. Estados y transiciones.

## 🎯 Casos minimos por endpoint
- Entradas validas.
- Campos faltantes.
- Tipos invalidos.
- Reintento/duplicado.
- Usuario sin permiso.
- Conflictos de estado.

## 🎯 Casos minimos UI
- Formularios con requeridos.
- Mensajes de error legibles.
- Estados vacio/cargando/error.
- Rutas ocultas por permiso.

## 🎯 Prioridad de regresion
- Login/sesion/cambio de empresa.
- Alta de empresa y empleado con acceso digital.
- Acciones de personal a estado aprobado.
- Cierre de planilla (process -> verify -> apply).
- Traslado interempresa.

## 🎯 Evidencia requerida
- Resultado esperado vs resultado real.
- Captura de pantalla o log de API.
- Usuario/permiso de prueba.
- Fecha y build validado.

## 🎯 Evidencia E2E - Modulo Reglas de distribucion
Suite ejecutada:
- `api/test/distribution-rules.e2e-spec.ts`

Comando:
```bash
cd api
npm run test:e2e -- distribution-rules.e2e-spec.ts
```

Resultado actual:
- `6/6` pruebas en verde.

Artefactos de evidencia:
- `api/test/evidence/distribution-rules.e2e.log`
- `api/test/evidence/distribution-rules.e2e.result.json`
- `api/test/evidence/distribution-rules.e2e.summary.txt`

Cobertura validada en esa suite:
1. Health endpoint.
2. Crear regla global.
3. Conflicto por duplicado global activo.
4. Crear/editar/inactivar/reactivar regla especifica.
5. Bloqueo de lineas duplicadas por tipo de accion.
6. Consulta de bitacora (`audit-trail`).

## 🎯 Evidencia QA final - Carga masiva de horas extras (PEND-012)
Estado:
- `Cerrado`.

Casos evidenciados:
1. Flujo feliz (`template -> preview -> commit`) con insercion correcta.
2. Duplicado detectado y bloqueado.
3. Empleado bloqueado por planilla verificada.
4. Error bloqueante con rollback controlado.

Cobertura de evidencia:
- UI: preview, estado por fila y confirmacion.
- API: respuestas de `preview` y `commit`.
- DB: verificacion de persistencia esperada y no persistencia en rollback.

## 🎯 Validacion final de notificaciones
Estado:
- `Completada`.

Flujo validado:
1. Campana muestra notificacion nueva.
2. Navegacion a `/notifications`.
3. Abrir notificacion no leida.
4. Cambio de no leida -> leida.
5. Panel derecho muestra detalle completo.

## 🔗 Ver tambien
- [Testing QA consolidado](../10-testing-qa/TESTING-QA-CONSOLIDADO.md)
- [Manejo de incidentes](./09-MANEJO-INCIDENTES-FUNCIONALES.md)


