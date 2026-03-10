# Estructura Destino de Consolidacion

Principios:
- Fuente de verdad unica por dominio.
- Separacion estricta entre vigente e historico.
- Sin duplicacion textual entre documentos maestros.

Arbol de documentos maestros vigentes:
- 03-reglas/REGLAS-MAESTRAS-CANONICAS.md
- 04-arquitectura/ARQUITECTURA-GOBIERNO-CONSOLIDADO.md
- 05-seguridad-identidad-permisos/SEGURIDAD-IDENTIDAD-PERMISOS-CONSOLIDADO.md
- 06-backend-api-db/BACKEND-API-DB-CONSOLIDADO.md
- 07-frontend-ux/FRONTEND-UX-CONSOLIDADO.md
- 08-planilla/PLANILLA-NOMINA-CONSOLIDADO.md
- 09-acciones-personal/ACCIONES-PERSONAL-INDICE.md
- 09-acciones-personal/ACCION-AUSENCIAS.md
- 09-acciones-personal/ACCION-BONIFICACIONES.md
- 09-acciones-personal/ACCION-HORAS-EXTRA.md
- 09-acciones-personal/ACCION-DESCUENTOS.md
- 09-acciones-personal/ACCIONES-MODELO-POR-PERIODO.md
- 10-testing-qa/TESTING-QA-CONSOLIDADO.md
- 11-operacion-automatizaciones/OPERACION-AUTOMATIZACIONES-CONSOLIDADO.md
- 12-backlog-pendientes/BACKLOG-CONSOLIDADO.md

Historico:
- 99-historico/ACTAS-E-INFORMES-HISTORICOS.md
- 99-historico/INFORME-CONSOLIDACION-YYYYMMDD.md (resultado final)

Cardinalidad por dominio (regla):
- Cada dominio tiene 1 documento maestro funcional obligatorio.
- Puede tener 0..N anexos tecnicos, pero sin duplicar reglas ni contratos.
- Todo anexo debe estar referenciado desde el indice del dominio.

Regla especifica para Acciones de Personal:
- Todas las acciones terminan en 09-acciones-personal/ con 1 archivo maestro por accion.
- Contratos API y handoffs se integran al maestro o se mueven a historico.

Regla especifica para Planilla:
- Documento maestro: 08-planilla/PLANILLA-NOMINA-CONSOLIDADO.md.
- Se admiten anexos tecnicos de calculo/QA solo si estan enlazados desde el maestro.
