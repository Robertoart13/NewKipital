# Análisis de migración: Código legacy → NewKipital

Comparación de lo que existe en HRK-TalentPay (`Planilla_empleados_cargar.js`) y Kpital360 (`GenerarPlanillas_lista.jsx` + `PlanillaRegular.jsx`) versus lo implementado en NewKipital.

---

## Fuentes de referencia

| Sistema       | Archivo principal                           | Rol                         |
|---------------|---------------------------------------------|-----------------------------|
| HRK-TalentPay | `23-Planilla/Planilla_empleados_cargar.js`  | Backend: lógica de cálculo  |
| Kpital360     | `GenerarPlanillas_lista.jsx`                | Frontend: selector y layout |
| Kpital360     | `Planillas/Regular/PlanillaRegular.jsx`     | Frontend: tabla planilla    |
| Kpital360     | `Planillas/Aguinaldo/PlanillaAguinaldo.jsx` | Frontend: aguinaldo         |

---

## Resumen ejecutivo

| Área                 | Estado        | Notas                                                                 |
|----------------------|---------------|-----------------------------------------------------------------------|
| Cálculo regular      | ✅ Migrado    | Quincenal/mensual con acciones                                       |
| Vacaciones           | ✅ Migrado    | Label "Vacaciones (n)", monto `(salarioBase*dias)/30`                 |
| Detalle de acciones  | ✅ Migrado    | Tipo (+/-), aprobación, Invalidar, monto Licencias/Ausencias corregido |
| Empleados por horas  | ⚠️ Pendiente  | Legacy usa flujo distinto (suma horas reales)                         |
| Empleados verificados| ⚠️ Pendiente  | Legacy conserva valores manuales; NewKipital siempre recalcula        |
| Crédito cónyuge      | ⚠️ Diferencia | Legacy: bandera `emp_tiene_conyuge`; NewKipital: estado civil         |
| Planilla Aguinaldo   | ❌ No existe  | Solo existe placeholder en legacy                                    |
| UI selector planilla | ⚠️ Diferente  | Legacy: Empresa+Periodo; NewKipital: lista de planillas               |
| Modales de acciones  | ✅ Migrado    | Formularios inline en planilla: Horas extras, Ausencias, Retenciones, Descuentos |
| Títulos dinámicos    | ⚠️ Parcial    | Salario Quincenal/Mensual según periodo                              |

---

## 1. HRK-TalentPay – Lógica de cálculo

### 1.1 Flujo principal (Planilla_empleados_cargar.js)

```
procesarEmpleadosPlanilla() 
  → isEmpleadoVerificado?
     → SÍ: conserva valores; recalcula vacaciones/cargas (o horas extras si por horas)
     → NO: procesarEmpleadoQuincenalOMensual() o procesarHorasExtras()
```

### 1.2 Empleados quincenal/mensual (no verificados)

1. `asignarDiasBase` – Días base: 15 (quincenal) o 30 (mensual); si ingreso en periodo, prorratea
2. `procesarDespidos` – Días hasta fecha último día trabajado
3. `procesarRenuncias` – Días hasta fecha última día trabajado
4. `procesarAccionesPersonal` – Resta días (ausencias, licencias no remuneradas, vacaciones, incapacidades)
5. `calcularSalarioProporcional` – Salario base recalculado
6. `calcularDevengadoEmpleado` – Suma aumentos, bonos, horas extras, incapacidad CCSS, licencia remunerada
7. `calcularTotalVacaciones` – Suma monto vacaciones
8. `calcularTotalCargasSociales` – Cargas sobre devengado
9. `ejecutarCalculoImpuestoRenta` – Mensual o quincenal (solo 2da quincena)
10. `calcularTotalMontoNeto` – Devengado − cargas − renta − deducciones − retenciones

### 1.3 Fórmulas clave legacy

| Concepto            | Fórmula legacy                                      | NewKipital                                       |
|---------------------|-----------------------------------------------------|--------------------------------------------------|
| Salario quincenal   | `(salario/2/15) * diasTrabajados`                   | `salarioBase * (diasLaborados/30)`               |
| Salario mensual     | `(salario/30) * diasTrabajados`                     | `salarioBase * (diasLaborados/30)`               |
| Vacaciones quincenal| `(salario_base_periodo/15) * dias`                  | Usa `/30` siempre                                |
| Vacaciones mensual  | `(salario_base_periodo/30) * dias`                  | ✅ Igual                                         |
| Vacaciones por horas| `salarioBase * (dias*8)`                            | No aplicado en NewKipital                        |
| Crédito cónyuge     | `emp_tiene_conyuge_empleado === 1`                  | Estado civil (casado, unión libre)               |
| Impuesto quincenal  | Solo si `diaFinCalendario >= 16`                    | ✅ Igual                                         |

### 1.4 Empleados por horas (legacy)

```javascript
// procesarHorasExtras
horasTotales = emp_cantidad_dias_horas + suma(horas_extras_salariales.horas_extras_cantidad)
salarioTotal = suma(horas_extras_salariales.horas_extras_monto)
emp_salario_base_recalculado = salarioTotal
```

NewKipital usa: `salarioBase * (diasPeriodo * 8)` para por horas. No suma horas reales ni montos de `horas_extras_salariales`.

### 1.5 Empleados verificados (legacy)

- Si `emp_verificado === true`: se conservan `emp_cantidad_dias_horas`, `emp_salario_base_empleado_periodo_pago`, `emp_salario_base_recalculado`, `emp_salario_base_devengado`, etc.
- Solo se recalculan vacaciones y cargas (o horas extras en empleados por horas).

NewKipital no usa `nomina_empleado_verificado`; siempre recalcula.

---

## 2. Kpital360 – Frontend

### 2.1 GenerarPlanillas_lista.jsx

- Autocomplete Empresa
- Autocomplete Periodo de pago
- InfoCardPeriodoPago
- Botón "Cargar Planilla"
- `renderPlanillaComponent()` según `periodoInfo.tipo_planilla`:
  - `planilla_regular` → `PlanillaRegular`
  - `planilla_aguinaldo` → `PlanillaAguinaldo` (placeholder)

NewKipital: selecciona planilla desde lista (filtros empresa, moneda, periodo); no hay selector Empresa+Periodo directo.

### 2.2 PlanillaRegular.jsx

| Característica           | Legacy                                  | NewKipital                                      |
|--------------------------|-----------------------------------------|-------------------------------------------------|
| Tabla empleados          | Con colores (verificados verde, sel azul)| Tabla con collapse para acciones                |
| Checkbox verificación    | Sí                                      | No (aprobar acciones, no verificación empleado) |
| Modal detalle empleado   | Sí                                      | Descriptions/Detalle expandible                |
| Acciones agregar        | Horas extras, Ausencias, Retenciones, Deducciones | Formularios inline en PayrollGeneratePage  |
| Título Salario           | Dinámico (Quincenal/Mensual/Hora)       | "Salario Quincenal Bruto" fijo                  |
| getAccionesEmpleado      | Mapea arrays legacy a UI                | Viene del snapshot del backend                  |

### 2.3 Registro de acciones (migrado como formularios inline)

Legacy usaba modales (`Modal_Ausencia`, `Modal_Deducciones`, `Modal_Retencion`, `Accion_HorasExtras`, etc.).

NewKipital implementa formularios inline en `PayrollGeneratePage`:
- **Horas extras** (`OvertimeInlineForm`): Movimiento, Tipo jornada, Fechas, Cantidad, Monto
- **Ausencias** (`AbsenceInlineForm`): Movimiento, Tipo ausencia, Cantidad, Monto, Remuneracion, Formula
- **Retenciones** (`RetentionInlineForm`): Movimiento, Cantidad, Monto, Formula
- **Descuentos** (`DiscountInlineForm`): Movimiento, Cantidad, Monto, Formula

Cada formulario permite multiples lineas, calculo automatico de monto (monto fijo o porcentaje) y crea la accion con estado pendiente; luego se aprueba desde el detalle del empleado. Tambien pueden crearse desde el modulo Accion de Personal.

---

## 3. Pendientes por migrar (prioridad)

### P1 – Alta prioridad

| # | Pendiente                        | Fuente          | Acción sugerida                                                              |
|---|----------------------------------|-----------------|------------------------------------------------------------------------------|
| 1 | Empleados por horas              | HRK             | Usar suma de horas reales y montos de acciones aprobadas de horas extras     |
| 2 | Paridad campo a campo            | HRK             | Probar mismo empleado en ambos sistemas y comparar todos los montos          |
| 3 | Crédito cónyuge                  | HRK             | Definir si se usa bandera explícita o derivación por estado civil            |

### P2 – Prioridad media

| # | Pendiente                  | Fuente    | Acción sugerida                                                                 |
|---|----------------------------|-----------|----------------------------------------------------------------------------------|
| 4 | Empleados verificados      | HRK       | Revisar `nomina_empleado_verificado` y conservar valores cuando está verificado |
| 5 | Planilla Aguinaldo         | Kpital360 | Implementar flujo (legacy solo tiene placeholder)                                |
| 6 | Título Salario dinámico    | Kpital360 | Mostrar "Salario Mensual Bruto" o "Salario por Hora Bruto" según periodo        |
| 7 | Vacaciones quincenal       | HRK       | Legacy usa `/15` para quincenal; NewKipital usa `/30`. Confirmar regla          |

### P3 – Mejoras UX

| # | Pendiente            | Fuente    | Acción sugerida                                                   |
|---|----------------------|-----------|-------------------------------------------------------------------|
| 8 | Selector Empresa+Periodo | Kpital360 | Evaluar si agregar flujo alternativo para crear planilla nueva    |
| 9 | Modales de acciones  | Kpital360 | ✅ Resuelto: formularios inline en planilla + modulo Accion de Personal |
| 10| Colores verificados  | Kpital360 | Resaltar empleados verificados vs pendientes                      |

---

## 4. Ya migrado (no requiere cambios)

- Cálculo quincenal/mensual (días, salario proporcional, devengado)
- Días: ingreso en periodo, renuncia, despido, acciones que restan días
- Devengado: aumentos, bonos, horas extras, incapacidad CCSS, licencia remunerada, vacaciones
- Cargas sociales, impuesto renta, monto neto
- Acciones aprobadas vs pendientes
- Prorrateo por solapamiento de fechas
- Vacaciones: label "Vacaciones (n)", monto recalculado
- Tipo (+/-) en detalle de acciones
- Licencias tipo %: monto recalculado `(salarioBase/30)*días_remunerados` cuando `monto_linea=0`
- Ausencias remuneradas: monto desde `monto_linea` de líneas remuneradas
- Botón Invalidar con confirmación en detalle de acciones
- Columna "Como aplica" removida (documentada como comentario)

---

## 5. Archivos de referencia

| Sistema       | Ruta                                                              |
|---------------|-------------------------------------------------------------------|
| HRK-TalentPay | `Kpital App/HRK-TalentPay/src/modules/23-Planilla/Planilla_empleados_cargar.js` |
| Kpital360     | `Kpital App/Kpital360/src/Sistem/views/PlanillasViews/Generar/GenerarPlanillas_lista.jsx` |
| Kpital360     | `.../Generar/modulos/Planillas/Regular/PlanillaRegular.jsx`       |
| Kpital360     | `.../Generar/modulos/Planillas/Aguinaldo/PlanillaAguinaldo.jsx`   |
| NewKipital    | `api/src/modules/payroll/payroll.service.ts`                      |
| NewKipital    | `frontend/.../PayrollGeneratePage.tsx`                            |
| NewKipital    | `docs/14-manual-tecnico/06-PENDIENTES-TECNICOS.md`                |
| NewKipital    | `docs/08-planilla/CALCULOS-PLANILLA-CODIGO-COMENTADO.md`          |
