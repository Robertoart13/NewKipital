# 📐 Cálculos de Planilla - Código Comentado para Claridad

Este documento deja documentado (como código comentado) la lógica investigada para entender cómo se calcula cada cosa en el módulo de planillas.

---

## 1. Fuentes de datos por tipo de acción

Las acciones aprobadas obtienen sus datos de tablas específicas:

```typescript
// loadApprovedActionRuleMap() consulta estas tablas:

// AUSENCIAS: acc_ausencias_lineas
// - Días no remunerados: SUM(CASE WHEN remuneracion_linea = 0 THEN cantidad_linea ELSE 0 END)
// - Afecta: resta días del devengado. No suma monto.

// LICENCIAS: acc_licencias_lineas
// - Días no remunerados: SUM(CASE WHEN remuneracion_linea = 0 THEN cantidad_linea ELSE 0 END)
// - Monto remunerado: SUM(CASE WHEN remuneracion_linea = 1 THEN monto_linea ELSE 0 END)
// - Afecta: resta días si no remunerada. Suma monto si remunerada.

// INCAPACIDADES: acc_incapacidades_lineas
// - Días: SUM(cantidad_linea)
// - Monto CCSS: SUM(CASE WHEN tipo_institucion = 'CCSS' THEN monto_linea ELSE 0 END)
// - Afecta: resta días. Suma solo monto CCSS.

// VACACIONES: acc_vacaciones_fechas
// - Días: COUNT(*) (una fila por cada día de vacación)
// - Monto: (salarioBase / 30) * vacationDays
// - Afecta: resta días. Suma monto recalculado.

// AUMENTOS: acc_aumentos_lineas
// - Monto: SUM(monto_linea)
// - Afecta: suma monto. No afecta días.

// BONIFICACIONES: acc_bonificaciones_lineas
// - Monto: SUM(monto_linea)
// - Afecta: suma monto. No afecta días.

// HORAS EXTRAS: acc_horas_extras_lineas
// - Monto: SUM(monto_linea)
// - Afecta: suma monto. No afecta días.

// RETENCIONES: acc_retenciones_lineas
// - Monto: SUM(monto_linea)
// - Afecta: resta del neto (deducción).

// DESCUENTOS: acc_descuentos_lineas
// - Monto: SUM(monto_linea)
// - Afecta: resta del neto (deducción).
```

---

## 2. Impacto en días por tipo de acción (resolveApprovedActionDaysImpact)

```typescript
// Solo estas acciones restan días del devengado (empleados NO por horas):
// - Ausencias: absenceNonRemDays
// - Licencias: licenseNonRemDays
// - Incapacidades: disabilityDays
// - Vacaciones: vacationDays
// Las demás (aumentos, bonos, horas extras, retenciones, descuentos) no afectan días.
```

---

## 3. Monto efectivo por tipo de acción (resolveApprovedActionAmountForPayroll)

```typescript
// AUSENCIAS: siempre 0 (no suma monto).
// LICENCIAS: licenseRemAmount (solo la parte remunerada).
// INCAPACIDADES: disabilityCcssAmount (solo monto CCSS).
// VACACIONES: (salarioBase / 30) * vacationDays — RECALCULADO, no usa action.monto.
// AUMENTOS: increaseAmount de acc_aumentos_lineas, o defaultAmount.
// BONIFICACIONES: bonusAmount de acc_bonificaciones_lineas, o defaultAmount.
// HORAS EXTRAS: overtimeAmount de acc_horas_extras_lineas, o defaultAmount.
// RETENCIONES: retentionAmount de acc_retenciones_lineas, o defaultAmount.
// DESCUENTOS: discountAmount de acc_descuentos_lineas, o defaultAmount.
```

---

## 4. Deducciones vs devengado (isNetDeductionAction)

```typescript
// Las acciones que RESTAN del neto (van a "deducciones") son:
// - Retenciones (retencion)
// - Descuentos (descuento)
// - Cualquier tipo que incluya "deduc"
// El resto (aumentos, bonos, horas extras, licencias remuneradas, incapacidades CCSS, vacaciones)
// van al GROSS (devengado bruto).
```

---

## 5. Salario bruto periodo (empleado mensual)

```typescript
// baseDiasLaborados = diasPeriodo (30 o 15 según periodo)
// - Ajuste por fecha ingreso: si ingresa en el periodo, prorratear desde esa fecha.
// - Ajuste por acciones: baseDiasLaborados - daysToSubtract (ausencias, licencias no rem, incapacidades, vacaciones).
// - Override por terminación: si hay acción de baja, limitar a días hasta esa fecha.
// diasLaborados = max(0, baseDiasLaborados - daysToSubtract)
// salarioBrutoPeriodo = salarioBase * (diasLaborados / 30)
```

---

## 6. Salario bruto periodo (empleado por horas)

```typescript
// devengadoHoras = diasPeriodo * 8 (asume 8 horas/día del periodo).
// salarioBrutoPeriodo = salarioBase * devengadoHoras
// Nota: empleados por horas no tienen ajuste de días por ausencias/vacaciones en la misma lógica.
```

---

## 7. Total bruto por empleado

```typescript
// totalBruto = salarioBrutoPeriodo + totals.gross
// totals.gross = suma de montos efectivos de acciones APROBADAS que NO son deducciones
// (aumentos, bonos, horas extras, licencias remuneradas, incapacidades CCSS, vacaciones).
```

---

## 8. Cargas sociales (calculateSocialCharges)

```typescript
// Se aplica sobre totalBruto.
// Por cada carga configurada: monto = totalBruto * porcentaje
// total = suma de todos los montos de cargas.
// Las cargas son deducciones legales (ej. CCSS, pensiones).
```

---

## 9. Impuesto renta (calculateIncomeTax)

```typescript
// Solo aplica si periodo es mensual o quincenal.
// Si quincenal: solo en la segunda quincena del mes (fecha fin >= 16).
// base = (si quincenal: previousQuincenalTotal + totalBruto) | (si mensual: totalBruto)
// Tramo impositivo (CRC 2024):
//   - 0 - 922,000: 0%
//   - 922,000 - 1,352,000: 10%
//   - 1,352,000 - 2,373,000: 15%
//   - 2,373,000 - 4,745,000: 20%
//   - > 4,745,000: 25%
// Créditos: porHijo=1720, porConyuge=2600 (si casado o unión libre).
// impuesto = max(0, impuestoCalculado - creditos)
```

---

## 10. Total deducciones y neto

```typescript
// totalDeducciones = totals.ded + cargasSociales + impuestoRenta
// totals.ded = suma de montos de acciones APROBADAS que son deducciones (retenciones, descuentos).
// totalNeto = totalBruto - totalDeducciones
```

---

## 11. Prorrateo por solapamiento de fechas (calculateProratedAmountForPayroll)

```typescript
// Si la acción tiene fechas y solapa parcialmente con el periodo de planilla:
// overlapDays = días de intersección entre [actionStart, actionEnd] y [periodoInicio, periodoFin]
// actionDays = días totales de la acción
// montoProrated = (montoOriginal / actionDays) * overlapDays
// Se usa para acciones que atraviesan periodos.
```

---

## 12. Vacaciones: etiqueta y monto en detalle de acciones

```typescript
// ETIQUETA (buildActionDisplayLabelMap):
// - Días: COUNT(*) en acc_vacaciones_fechas por id_accion
// - Label: "Vacaciones (n)" donde n = cantidad de días

// MONTO EN DETALLE (displayActionsByEmployee):
// - Si es Vacaciones y hay vacationDays:
//   monto = (salarioBase * vacationDays) / 30
// - Si aprobada: se usa approvedActionAmountMap si existe, sino la fórmula anterior.
// - Si pendiente: siempre la fórmula (salarioBase * vacationDays) / 30
// - action.monto NO se usa para vacaciones; siempre se recalcula.
```

---

## 13. Resumen en frontend (PayrollGeneratePage)

```typescript
// Total Devengado: previewTable.totals.totalBruto (si no hay filtro) o suma de row.devengadoMonto
// Nota: devengadoMonto = totalBruto del empleado (salarioBrutoPeriodo + acciones gross).

// Cargas Sociales, Impuesto Renta, Neto: de previewTable.totals o suma por empleado filtrado.
// Acciones pendientes: no afectan el cálculo; solo las aprobadas modifican bruto/deducciones.
```

---

## 14. Totales de planilla (snapshot)

```typescript
// totalBrutoPlanilla = suma de totalBruto de cada empleado
// totalDeduccionesPlanilla = suma de totalDeducciones
// totalNetoPlanilla = suma de totalNeto
// totalDevengadoPlanilla = suma de salarioBrutoPeriodo (sin acciones)
// totalCargasPlanilla = suma de cargasSociales
// totalImpuestoPlanilla = suma de impuestoRenta
```

---

## 15. Lógica "Cómo aplica" (referencia, columna removida)

```typescript
// function resolveHowApplies(row): texto según categoría y aprobación.
// Pendiente: "Pendiente: no afecta calculo"
// Ausencias: "Resta dias. No suma monto."
// Licencias: "No remunerada: resta dias. Remunerada: suma monto."
// Incapacidades: "Resta dias. Suma solo monto CCSS."
// Vacaciones: "Resta dias. Suma monto recalculado."
// Aumentos/Bonificaciones/Horas extras: "Suma monto. No afecta dias."
// Carga social: "Resta del neto (deduccion legal)."
// Impuesto renta: "Resta del neto (tramos fiscales)."
// Retenciones: "Resta del neto (obligatorio)."
// Descuentos: "Resta del neto (autorizado)."
```

---

## 16. Archivos de referencia

| Archivo | Sección / Líneas aprox. |
|---------|---------|
| `api/src/modules/payroll/payroll.service.ts` | `process()` ~líneas 627-1050 |
| `api/src/modules/payroll/payroll.service.ts` | `loadApprovedActionRuleMap` ~2674 |
| `api/src/modules/payroll/payroll.service.ts` | `resolveApprovedActionAmountForPayroll` ~2859 |
| `api/src/modules/payroll/payroll.service.ts` | `resolveApprovedActionDaysImpact` ~2843 |
| `api/src/modules/payroll/payroll.service.ts` | `calculateSocialCharges` ~3049 |
| `api/src/modules/payroll/payroll.service.ts` | `calculateIncomeTax` ~3085 |
| `frontend/.../PayrollGeneratePage.tsx` | `previewSummary` ~347 |
