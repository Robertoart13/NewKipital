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
| `P1` | Completar `Distribucion de la planilla` (ruta `/payroll-management/planillas/aplicadas/distribucion/:publicId`) con detalle funcional final. | Pendiente de implementacion completa |

---

## 📋 Analisis: ajustes pendientes para cerrar planillas (referencia HRK-TalentPay)

Analisis derivado de la comparacion con `Planilla_empleados_cargar.js` (HRK-TalentPay). Usar como guia para implementacion posterior.

### P1 - Prioridad alta

| Item | Descripcion | Accion sugerida |
|------|-------------|-----------------|
| **Empleados por horas** | En HRK se suman horas reales de `horas_extras_salariales` y sus montos. NewKipital usa `salarioBase * (diasPeriodo * 8)`. No coincide. | Alinear flujo con legacy o documentar excepcion. |
| **Paridad campo a campo** | Validar que `load-table` devuelva exactamente lo mismo que HRK para quincenales con combinaciones de acciones. | Ejecutar casos de prueba con mismo empleado en ambos sistemas y comparar Salario Base, Dias, Salario Quincenal Bruto, Devengado, Cargas, Renta, Neto. |
| **Credito por conyuge** | HRK: `emp_tiene_conyuge_empleado === 1`. NewKipital: deriva de estado civil (casado, union libre). | Confirmar con negocio cual es la regla oficial. |

### P2 - Prioridad media

| Item | Descripcion | Accion sugerida |
|------|-------------|-----------------|
| **Empleados verificados** | HRK conserva valores manuales cuando el empleado esta verificado. Existe `nomina_empleado_verificado` pero `process` puede no usarla. El resumen muestra "(Solo empleados verificados)" pero el backend siempre retorna "Pendiente". | Revisar si el flujo de process/load-table consume `nomina_empleado_verificado` y rehidrata valores manuales. |
| **Planilla Aguinaldo / Liquidacion** | Legacy tiene `PlanillaAguinaldo`. NewKipital solo carga Regular en la vista actual. | Agregar vista o flujo para Aguinaldo (y Liquidacion si aplica). |
| **Hint resumen** | El resumen monetario muestra "(Solo empleados verificados)". Si la verificacion no esta operativa, el mensaje induce a error. | Corregir o eliminar el hint segun el estado real de la feature. |

### Ya cubierto (no requiere cambio)

- Calculo quincenal/mensual (dias, salario proporcional, devengado).
- Dias: ingreso en periodo, renuncia, despido, acciones que restan.
- Devengado: acciones que suman (aumento, bonificacion, hora extra, incapacidad CCSS, licencia remunerada, ausencia remunerada, vacaciones). Licencias %: fallback (salarioBase/30)*dias. Ausencias rem: monto_linea.
- Cargas sociales, impuesto renta, monto neto.
- Acciones aprobadas vs pendientes.
- Prorrateo por solapamiento de periodo.

### Referencias

- Codigo de ayuda: `Kpital App/HRK-TalentPay/src/modules/23-Planilla/Planilla_empleados_cargar.js`
- Manual operativo: `docs/08-planilla/PLANILLA-NOMINA-CONSOLIDADO.md`
- Calculos y formulas: `docs/08-planilla/CALCULOS-PLANILLA-CODIGO-COMENTADO.md`
- Analisis migracion: `docs/08-planilla/ANALISIS-MIGRACION-PLANILLA.md`
- Operacion por modulo: `docs/14-manual-tecnico/07-OPERACION-POR-MODULO.md`

---

## 🔗 Ver tambien
- [Backlog consolidado](../12-backlog-pendientes/BACKLOG-CONSOLIDADO.md)
- [Gobierno de cambios](../15-enterprise-gobierno/03-GOBIERNO-CAMBIOS-DOCS.md)

---

## Pendientes especificos - Modulo Reglas de distribucion

Estado del modulo:
- Backend y frontend principal completos (listar, crear, editar, inactivar, reactivar, bitacora, `publicId` firmado).
- Contratos API y datos de BD documentados.
- E2E backend ejecutado con evidencia (`6/6` pass).

Pendientes para continuar:
| Prioridad | Pendiente | Estado |
|---|---|---|
| `P1` | Implementar funcionalmente la vista `Distribucion de la planilla` (`/payroll-management/planillas/aplicadas/distribucion/:publicId`) para cierre del flujo contable. | Pendiente |
| `P2` | Definir con negocio si se requiere exportacion de reglas de distribucion (CSV/PDF) para auditoria operativa. | Pendiente de decision |
| `P2` | Agregar E2E de UI (Playwright) para crear/editar/inactivar/reactivar reglas desde pantalla. | Pendiente |
