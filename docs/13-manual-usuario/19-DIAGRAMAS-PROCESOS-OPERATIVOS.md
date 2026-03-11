# Diagramas de Procesos Operativos - KPITAL 360

Version: 1.0  
Fecha: 2026-03-11

## 1. Flujo de generacion de planilla
```mermaid
flowchart TD
  A[Seleccionar planilla] --> B[Cargar tabla de empleados]
  B --> C[Revisar calculos]
  C --> D[Marcar empleados incluidos]
  D --> E[Verificar empleados]
  E --> F[Aplicar planilla]
  F --> G[Emitir reportes]
```

## 2. Flujo de acciones de personal
```mermaid
flowchart TD
  A[Crear accion] --> B[Pendiente supervisor]
  B --> C[Pendiente RRHH]
  C --> D[Aprobada]
  D --> E[Impacta planilla]
  B --> F[Rechazada]
  C --> F
  D --> H[Invalidada]
```

## 3. Flujo de bloqueo por verificacion
```mermaid
flowchart LR
  A[Empleado marcado] --> B{Verificado?}
  B -- No --> C[Permitir crear/aprobar/invalidar]
  B -- Si --> D[Bloquear mutaciones]
  D --> E[UI: botones ocultos/bloqueados]
  D --> F[API: rechazo de mutacion]
```

## 4. Flujo de movimientos salariales
```mermaid
flowchart TD
  A[Configurar articulo] --> B[Configurar movimiento]
  B --> C[Registrar accion al empleado]
  C --> D[Aprobar accion]
  D --> E[Recalculo de planilla]
```

## 5. Flujo de aplicacion y cierre
```mermaid
flowchart TD
  A[Planilla verificada] --> B[Aplicar planilla]
  B --> C[Consumir acciones aprobadas]
  C --> D[Estado aplicada]
  D --> E[Contabilizacion]
  E --> F[Auditoria]
```

## 6. Flujo de soporte e incidentes funcionales
```mermaid
flowchart TD
  A[Usuario reporta problema] --> B[Validar permisos y estado]
  B --> C{Dato o regla?}
  C -- Dato --> D[Corregir datos y reintentar]
  C -- Regla --> E[Escalar a RRHH funcional]
  E --> F[Si tecnico, escalar a ingenieria]
  F --> G[Cerrar incidente con evidencia]
```

## 7. Flujo de vista de planillas aplicadas
```mermaid
flowchart TD
  A[Gestion Planilla > Planillas > Lista de Planillas Aplicadas] --> B[Filtrar por empresa]
  B --> C[Estados por defecto: Verificada, Aplicada, Enviada NetSuite]
  C --> D[Revisar cierre y trazabilidad]
  D --> E[Tomar accion: aplicar/revisar/envio NetSuite]
```

## Referencias
- [Manual de Usuario Enterprise](./14-MANUAL-USUARIO-ENTERPRISE-KPITAL360.md)
- [Checklist de auditoria documental](./18-CHECKLIST-AUDITORIA-DOCUMENTAL.md)
