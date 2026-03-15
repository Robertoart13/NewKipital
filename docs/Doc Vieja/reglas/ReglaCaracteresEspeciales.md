# Regla: No usar símbolos especiales que provocan mojibake

## Propósito

Evitar caracteres Unicode que, con codificación incorrecta (Latin-1, Windows-1252, etc.), se convierten en secuencias corruptas (por ejemplo o con tilde, símbolos lógicos o de caja mal interpretados). Esto genera texto ilegible y dificulta el mantenimiento del proyecto.

## Regla obligatoria

**NO usar** los siguientes tipos de caracteres en código fuente, comentarios, strings de UI ni documentación Markdown del proyecto:

### 1. Símbolos matemáticos o lógicos

| NO usar | Usar en su lugar | Ejemplo |
|-----------|---------------------|---------|
| `≠`       | `!=`                | `sys_empleados != sys_usuarios` |
| `→`       | `->`                     | `Abierta -> Verificada` |
| `↔`       | `-` o `<->`         | `Usuario - Rol - Empresa` |
| `≤` `≥`   | `<=` `>=`           | En código siempre ASCII |

### 2. Caracteres de caja / líneas decorativas

| NO usar | Usar en su lugar |
|-----------|---------------------|
| `─` `═` `│` `┌` `┐` | `-` o `---` |
| Cualquier box-drawing Unicode (U+2500–U+257F) | Guiones `-` |

### 3. Comillas y guiones especiales

| NO usar | Usar en su lugar |
|-----------|---------------------|
| `"` `"` (comillas tipográficas) | `"` `'` ASCII |
| `—` (em dash) | `-` |
| `…` (ellipsis) | `...` |

### 4. Viñetas y listas

| NO usar | Usar en su lugar |
|-----------|---------------------|
| `•` `◦` `‣` | `*` o `-` en Markdown |
| En CSS `content`: preferir `'-'` o `'*'` | Evitar `•` (U+2022) si hay riesgo de encoding |

### 5. Acentos y eñes en strings

**Recomendación:** Usar **solo ASCII** en identificadores, nombres de variables, claves y mensajes que puedan pasar por sistemas con codificación inconsistente.

| NO usar en strings de UI/API | Preferir |
|-------------------------------|-------------|
| `acción`, `Configuración`, `Período` | `accion`, `Configuracion`, `Periodo` |
| `integración`, `aprobación` | `integracion`, `aprobacion` |
| `líneas`, `transacción`, `múltiples` | `lineas`, `transaccion`, `multiples` |

Si el proyecto exige español correcto en UI (con tildes), asegurar que **todos** los archivos estén guardados en **UTF-8** y que el proyecto tenga configuración explícita de codificación en build/tests.

### 6. Escapes Unicode en strings literales

**NO usar** secuencias `\u00XX` para escribir acentos en strings de UI (ej. `l\u00EDneas`, `acci\u00F3n`, `m\u00FAltiples`). Son difíciles de leer y pueden provocar inconsistencias. Usar texto ASCII directo.

| NO usar | Usar |
|---------|------|
| `l\u00EDneas` | `lineas` |
| `acci\u00F3n` | `accion` |
| `m\u00FAltiples` | `multiples` |
| `per\u00EDodo` | `periodo` |
| `transacci\u00F3n` | `transaccion` |

## Resumen de reemplazos seguros

```
≠    →  !=
->   (flecha)
↔    →  -    o  <-> 
─═│  →  -
" "  →  " '
—    →  -
…    →  ...
•    →  *  o  -
```

## Checklist para el ingeniero

Antes de escribir código o documentación:

- [ ] No uso `≠`, `→`, `↔` ni símbolos similares; uso `!=`, `->`, `-`
- [ ] No uso caracteres de caja (box-drawing) en comentarios ni docs
- [ ] No uso comillas tipográficas ni em dash; uso comillas ASCII y guión
- [ ] En strings críticos prefiero ASCII sin tildes; no uso escapes \u00XX para acentos
- [ ] Los archivos están guardados en UTF-8

## Referencia: caracteres que provocaron problemas

En el proyecto se detectaron y corrigieron estos mojibake:

| Mojibake (texto corrupto) | Carácter original | Reemplazo seguro |
|---------------------------|-------------------|------------------|
| `â‰ `                     | `≠`               | `!=`             |
| `â"€â"€â"€`               | `───`             | `---`            |
| `â•â•â•â•`                 | `════`            | `-----`          |
| `â†"`                     | `↔`               | `-`              |
| `â€¢`                     | `•`               | `*` o `-`        |
| integración (vista como corrupto) | `integración`     | `integracion`    |
| Período (vista como corrupto)     | `Período`         | `Periodo`        |
| distribución (vista como corrupto)| `distribución`    | `distribucion`   |
| `l\u00EDneas`             | `líneas`          | `lineas`         |
| `acci\u00F3n`             | `acción`          | `accion`         |
| `m\u00FAltiples`          | `múltiples`       | `multiples`      |
| `per\u00EDodo`            | `período`         | `periodo`        |
| `transacci\u00F3n`        | `transacción`     | `transaccion`    |

**Causas:** UTF-8 mal interpretado como Latin-1/Windows-1252; o escapes Unicode innecesarios que dificultan lectura.

---

Esta regla debe cumplirse en todo código nuevo y, cuando se toque código existente, corregir los símbolos que la violen.
