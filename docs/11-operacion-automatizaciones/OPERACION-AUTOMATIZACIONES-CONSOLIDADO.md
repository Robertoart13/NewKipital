# Operacion y Automatizaciones

## Objetivo
Mostrar como funcionan workers, colas y monitoreo para mantener estabilidad operativa.

## Flujo general
```mermaid
flowchart TB
  A[Scheduler] --> B[Cola identidad]
  A --> C[Cola cifrado]
  B --> D[Worker identidad]
  C --> E[Worker cifrado]
  D --> F[(BD)]
  E --> F
  F --> G[Dashboard y semaforo]
```

## Semaforo operativo
- Verde: estable.
- Amarillo: revisar.
- Rojo: intervencion inmediata.

## Que pasa si...
- Job falla terminal: queda en failed y requiere accion controlada.
- Job no terminal: entra en reintento segun politica.
