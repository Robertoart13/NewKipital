# Gobernanza Documental de Consolidacion

Nombrado estandar:
- Formato recomendado: NN-TEMA-RESUMIDO.md (sin espacios).
- Fechas solo cuando aplique trazabilidad historica: YYYYMMDD.
- Sufijo -HISTORICO solo para documentos no vigentes.

Control de cambios en docs maestros:
- Todo cambio debe reflejarse en MATRIZ-TRAZABILIDAD.md.
- Todo cambio debe revisar consistencia con REGLAS-MAESTRAS-CANONICAS.md.
- El indice maestro de consolidacion se actualiza en el mismo cambio.

Politica de no-dispersar documentacion:
- No crear docs sueltos fuera de carpetas oficiales de consolidacion.
- Si aparece un doc suelto en docs/, se registra en matriz y se clasifica de inmediato.

Seguridad de consolidacion (backup y no-borrado):
- Antes de borrar: confirmar respaldo en remoto y crear checkpoint (tag/commit pre-consolidacion).
- Nunca borrar .md sin accion registrada en matriz: consolidado_en o movido_a_historico.
- Recomendado: revision de PR por segunda persona antes de borrados fisicos.

Estados permitidos en matriz:
- pendiente
- en_proceso
- finalizado
- vigente
- historico
- pendiente_decision
