# Instrucciones para estandarizar documentacion del frontend

## Objetivo

Aplicar un estilo de documentacion uniforme, visual y mantenible en los archivos de `frontend/src`, usando bloques visuales con `=` en lugar de separadores con guiones.

## Archivo de referencia

Usar `frontend/src/api/accountingAccounts.ts` como **ejemplo base**.

## Reglas de formato

### 1. Encabezados de seccion

Todas las secciones grandes del archivo deben usar:

```
/* =============================================================================
   NOMBRE DE LA SECCION
   ============================================================================= */
```

Ejemplos: `INTERFACES DE DOMINIO`, `API: OPERACIONES CRUD`, `API: CATALOGOS AUXILIARES`.

### 2. Documentacion JSDoc de interfaces y funciones

Cada interfaz, tipo o funcion exportada debe tener bloque JSDoc con delimitadores `=`:

```
/**
 * ============================================================================
 * Nombre del Contrato
 * ============================================================================
 *
 * Descripcion general.
 *
 * Contexto funcional si aplica.
 *
 * @param param1 - Descripcion.
 * @returns Descripcion del retorno.
 *
 * @throws {Error} Cuando falla.
 *
 * ============================================================================
 */
```

### 3. No usar separadores con guiones

Eliminar bloques como:

```
// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------
```

y reemplazarlos por bloques con `=` o JSDoc estructurado.

### 4. Orientacion de comentarios

- **Documentar:** proposito, decisiones de diseno, comportamiento esperado del backend, reglas de negocio.
- **No documentar:** lineas obvias que no aportan contexto (ej. `const qs = params.toString();`).

### 5. Lenguaje

- Espanol tecnico claro y consistente.
- Sin tildes en strings criticos (segun ReglaCaracteresEspeciales): preferir `integracion`, `accion`, `modulo`.

### 6. No modificar logica

El cambio debe ser **solo documentacion**:
- orden visual
- legibilidad
- consistencia
- JSDoc completo

No cambiar nombres de funciones, interfaces o contratos salvo mejora aprobada.

## Checklist de validacion

Antes de dar por terminado:

- [ ] No quedan bloques con `----------`
- [ ] Todas las funciones exportadas tienen JSDoc
- [ ] Todas las interfaces exportadas tienen JSDoc
- [ ] Las propiedades mas relevantes estan comentadas
- [ ] El archivo se puede escanear rapido por secciones
- [ ] No hay comentarios redundantes

## Alcance

Aplicar este estandar a todos los archivos en `frontend/src` que no lo tengan:
- `api/*.ts`
- `lib/*.ts`
- `hooks/*.ts`
- `store/**/*.ts`
- `queries/**/*.ts`
- etc.
