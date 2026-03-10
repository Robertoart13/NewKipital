# 🛠️ Manual Tecnico - Pendientes Tecnicos

## 🎯 Como leer pendientes
- `P0`: afecta operacion o seguridad.
- `P1`: mejora necesaria antes de escalar volumen.
- `P2`: optimizacion o mejora incremental.

## 🎯 Bloques recomendados de seguimiento
- Seguridad y cifrado
- Logging y monitoreo
- CI/CD
- Performance
- Cobertura API/QA

## 📊 Vista operativa recomendada
Use como tablero oficial:
- [Backlog consolidado (tablero vivo)](../12-backlog-pendientes/BACKLOG-CONSOLIDADO.md)

Cada fila debe tener:
1. Owner
2. Estado
3. Fecha objetivo
4. Bloqueo actual
5. Criterio de cierre

## 🎯 Regla de cierre de pendiente
Un pendiente se cierra cuando:
1. Existe cambio implementado.
2. Existe evidencia de prueba.
3. Se actualiza documento maestro correspondiente.

## 📌 Pendientes finos de paridad legacy (planilla)
| Prioridad | Pendiente | Estado |
|---|---|---|
| `P1` | Validar en ambiente corriendo (`PATCH /api/payroll/:id/load-table`) paridad exacta campo a campo para empleados quincenales con combinacion de acciones. | Pendiente de ejecucion |
| `P1` | Confirmar regla de empleados por horas vs legacy (legacy usa flujo especifico de horas extras, distinto al flujo quincenal/mensual). | Pendiente de decision funcional |
| `P1` | Confirmar fuente de `credito por conyuge`: legacy usa bandera booleana; modelo actual deriva desde estado civil. | Pendiente de confirmacion de negocio |
| `P2` | Validar comportamiento de empleados `verificados` vs legacy (legacy conserva/rehidrata ciertos valores). | Pendiente de analisis final |

## 🔗 Ver tambien
- [Backlog consolidado](../12-backlog-pendientes/BACKLOG-CONSOLIDADO.md)
- [Gobierno de cambios](../15-enterprise-gobierno/03-GOBIERNO-CAMBIOS-DOCS.md)
