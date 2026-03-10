# Acciones de Personal - Indice Consolidado

Estado: vigente

Documentos maestros por accion:
- ACCION-AUSENCIAS.md
- ACCION-BONIFICACIONES.md
- ACCION-HORAS-EXTRA.md
- ACCION-DESCUENTOS.md
- ACCIONES-MODELO-POR-PERIODO.md

## Flujo transversal de acciones
```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> PENDING_RRHH: enviar
  PENDING_RRHH --> APPROVED: aprobar
  PENDING_RRHH --> REJECTED: rechazar
  APPROVED --> CONSUMED: aplicado en planilla
  APPROVED --> INVALIDATED: inactivar/traslado
  REJECTED --> [*]
  CONSUMED --> [*]
  INVALIDATED --> [*]
```

## Flujo de lineas por periodo
```mermaid
flowchart TD
  A[Crear accion] --> B[Agregar lineas por fecha efecto]
  B --> C[Validar completitud]
  C --> D[Guardar split por periodo]
  D --> E[Asociar planilla elegible]
```
