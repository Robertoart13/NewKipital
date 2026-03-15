# 08 - Pruebas

## Contexto
Se realizaron validaciones funcionales y de carga en entorno local con BD limpia por iteraciones, y con revision previa de codigo en workers, enqueue y monitoreo.

## Pruebas cubiertas
1. Flujo normal API/UI.
2. Insert manual SQL sin login.
3. Duplicado de email.
4. Error de configuracion (app/rol).
5. Permisos field-level.
6. Anti-loop de cifrado.
7. Recuperacion de lock.
8. Base para rotacion de clave.
9. Empleado inactivo sin login.
10. Stress test de 400 inserts.

## Hallazgos relevantes
- Correccion aplicada de starvation en enqueue con `ORDER BY` deterministico + exclusion de jobs activos.
- Idempotencia reforzada con `dedupe_key` unico + `INSERT IGNORE`.
- Politica de duplicado alineada a reuse seguro con guardas de empresa/cedula hash.
- Monitoreo operativo habilitado con endpoints y UI.

## Resultados operativos consolidados
- En carga normal: comportamiento estable, sin loops infinitos.
- En stress: backlog alto inicial con drenado progresivo.
- Throughput reportado en pruebas: pico aproximado de 44 jobs/min.
- Sin evidencia de crecimiento infinito de cola tras correccion.

## Criterios de cierre recomendados
- `activos_sin_usuario = 0`.
- `activos_no_cifrados = 0`.
- `plaintext_detected = 0`.
- Sin `PROCESSING` stuck.
- `PENDING` cercano a 0 o tendencia descendente sostenida.
