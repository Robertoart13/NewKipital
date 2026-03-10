# Manual Tecnico - QA y Testing

## Enfoque de prueba
Validar por modulo cuatro capas:
1. Happy path.
2. Validaciones de negocio.
3. Permisos y seguridad.
4. Estados y transiciones.

## Casos minimos por endpoint
- Entradas validas.
- Campos faltantes.
- Tipos invalidos.
- Reintento/duplicado.
- Usuario sin permiso.
- Conflictos de estado.

## Casos minimos UI
- Formularios con requeridos.
- Mensajes de error legibles.
- Estados vacio/cargando/error.
- Rutas ocultas por permiso.

## Prioridad de regresion
- Login/sesion/cambio de empresa.
- Alta de empresa y empleado con acceso digital.
- Acciones de personal a estado aprobado.
- Cierre de planilla (process -> verify -> apply).
- Traslado interempresa.

## Evidencia requerida
- Resultado esperado vs resultado real.
- Captura de pantalla o log de API.
- Usuario/permiso de prueba.
- Fecha y build validado.

## Ver tambien
- [Testing QA consolidado](../10-testing-qa/TESTING-QA-CONSOLIDADO.md)
- [Manejo de incidentes](./09-MANEJO-INCIDENTES-FUNCIONALES.md)
