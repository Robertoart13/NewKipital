# 🛠️ Accion de Personal - Ausencias

## 🔄 Flujo
1. Seleccionar empresa y empleado.
2. Definir tipo de ausencia y fechas.
3. Validar lineas.
4. Enviar a aprobacion.
5. Consumir en planilla cuando corresponda.

```mermaid
flowchart TD
  A[Crear ausencia] --> B[Definir fechas y tipo]
  B --> C[Validar monto y lineas]
  C --> D[Enviar aprobacion]
  D --> E[Consumo en planilla]
```

## 🎯 Que pasa si...
- Linea incompleta: no permite guardar.
- Estado no aprobado: no impacta planilla.


