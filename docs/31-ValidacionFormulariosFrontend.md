# DIRECTIVA 31 — Validación de Formularios (Frontend)

**Documento:** 31  
**Fecha:** 2026-02-23  
**Objetivo:** Definir la lógica de validación unificada para campos de texto en formularios: anti-inyección SQL, longitud, email y tipos.

**Prerrequisito:** [05-IntegracionAntDesign.md](./05-IntegracionAntDesign.md), [29-EstandarFormatoMoneda.md](./29-EstandarFormatoMoneda.md)

---

## Regla principal

Todo campo de texto en formularios (Ant Design Form) debe usar las reglas compartidas de `formValidation.ts`. No se permite duplicar validadores inline ni reglas de longitud/SQL en componentes.

---

## Archivo oficial

**Ubicación:** `frontend/src/lib/formValidation.ts`

**Dependencia:** `validator` (npm) para `isEmail`, `isLength`.

---

## Funciones y lógica

### 1. Detección de inyección SQL

| Función | Uso | Comportamiento |
|---------|-----|----------------|
| `hasSqlInjectionAttempt(value)` | Diagnóstico / tests | Retorna `true` si detecta patrones peligrosos (comillas, `;`, `--`, `/*`, `*/`, palabras reservadas: union, select, insert, update, delete, drop, exec, script) |
| `noSqlInjection(_, value)` | Validador Ant Design | Rechaza con "Caracteres o patrones no permitidos" si `hasSqlInjectionAttempt` es true |
| `optionalNoSqlInjection(_, value)` | Validador para campos opcionales | Si el valor está vacío → pasa. Si tiene valor → aplica `noSqlInjection` |

**Nota de seguridad:** La protección real está en el backend (consultas parametrizadas). Esto es una capa extra en frontend para evitar envío de intentos obvios.

### 2. Reglas de texto

| Función | Uso | Parámetros | Comportamiento |
|---------|-----|------------|----------------|
| `textRules(options)` | Campos de texto requeridos u opcionales | `{ required?: boolean; min?: number; max?: number }` | Combina: required, longitud (validator.isLength) y noSqlInjection. Campos vacíos en opcionales pasan. |
| `emailRules(required)` | Campo email | `required: boolean` | Si required: mensaje "Correo requerido". Valida formato con validator.isEmail y anti-SQL. |

### 3. Ejemplos de uso

```tsx
import { textRules, emailRules, optionalNoSqlInjection } from '../../../lib/formValidation';

// Campo requerido, max 100 caracteres
<Form.Item name="nombre" rules={textRules({ required: true, max: 100 })}>
  <Input maxLength={100} />
</Form.Item>

// Email requerido
<Form.Item name="email" rules={emailRules(true)}>
  <Input type="email" />
</Form.Item>

// Email opcional (si se llena, debe ser formato válido)
<Form.Item name="email" rules={emailRules(false)}>
  <Input type="email" />
</Form.Item>

// Campo opcional, solo validar anti-SQL
<Form.Item name="direccion" rules={[{ validator: optionalNoSqlInjection }]}>
  <Input />
</Form.Item>
```

---

## Trazabilidad: dónde se aplica

| Componente | Campos con validación | Tipo |
|------------|------------------------|------|
| `EmployeeCreateModal.tsx` | nombre, apellido1, cedula, email, telefono, direccion, codigoPostal, codigo, numeroCcss, cuentaBanco, passwordInicial, registroEmpresa | textRules, emailRules, optionalNoSqlInjection |
| `CompaniesManagementPage.tsx` | nombre, nombreLegal, cedula, actividadEconomica, prefijo, idExterno, email, telefono, direccionExacta, codigoPostal | textRules, emailRules, optionalNoSqlInjection |

---

## Checklist para nuevos desarrollos

Si agregas un nuevo formulario o campo de texto:

1. Importar desde `formValidation.ts` (no crear reglas inline para longitud o email).
2. Usar `textRules` para campos de texto con longitud conocida.
3. Usar `emailRules` para campos de correo.
4. Usar `optionalNoSqlInjection` para campos opcionales de texto libre.
5. Mantener validaciones de negocio específicas (ej. salario > 0) como validadores separados, pero combinar con las reglas de este módulo cuando aplique.

---

## Relación con otros estándares

- **Moneda:** Ver `docs/29-EstandarFormatoMoneda.md` — salario, montos provisionados, etc.
- **Estilos:** Ver `docs/05-IntegracionAntDesign.md` — clases de formulario (companyFormGrid, etc.).
