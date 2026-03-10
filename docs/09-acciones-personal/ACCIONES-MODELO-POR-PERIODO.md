# Modelo por Periodo - Acciones de Personal

## Objetivo
Explicar como una accion se divide y persiste por periodo/linea.

## Flujo
```mermaid
flowchart LR
  A[Input accion] --> B[Normalizar fechas]
  B --> C[Split por periodo]
  C --> D[Guardar lineas]
  D --> E[Relacionar con planilla]
```

## Regla
Cada linea debe ser completa y consistente con su fecha de efecto.
