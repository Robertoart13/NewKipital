# 07 - Semaforo

## Definicion actual
El semaforo usa tres variables:
- `oldestPendingAgeMinutes`
- `errorsLast15m`
- `stuckProcessing`

## Reglas operativas vigentes
### Saludable (verde)
- `oldestPendingAgeMinutes <= 5`
- `errorsLast15m = 0`

### Requiere revision (amarillo)
- `oldestPendingAgeMinutes > 10` o
- `errorsLast15m > 3` o
- condiciones intermedias que no califican como verde

### Critico (rojo)
- `oldestPendingAgeMinutes > 30` o
- `stuckProcessing > 3`

## Interpretacion operativa
- Verde: flujo estable.
- Amarillo: degradacion o carga elevada, requiere seguimiento.
- Rojo: riesgo alto de cola atascada o falla operativa.

## Ajuste futuro
Los umbrales se pueden externalizar a configuracion para ajustar por ambiente/productividad.
