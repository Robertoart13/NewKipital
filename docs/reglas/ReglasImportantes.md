# Coding Standards & Clean Code Rules

Este documento define las **reglas obligatorias de desarrollo** del proyecto.

Todo ingeniero debe seguir estas reglas para garantizar que el código sea:

- Legible
- Mantenible
- Escalable
- Fácil de entender por cualquier miembro del equipo

**Antes de hacer commit o Pull Request**, el ingeniero debe revisar este documento y confirmar que su código cumple todas las reglas.

Cada cambio o funcionalidad debe quedar **documentado en la carpeta `docs/`** para mantener la documentación del proyecto actualizada. Cuando se establezca o modifique una **regla, proceso o cualquier cosa que deba quedar plasmada**, hay que **actualizar todos los documentos** en `docs/` (y donde corresponda) donde sea necesario que esa información aparezca. Es **regla obligatoria** y se debe cumplir junto con el resto de este documento.

Si el código no cumple estas reglas, **debe refactorizarse antes de integrarse al repositorio**.

**Código existente:** cuando un ingeniero trabaje en código que ya está en el repositorio, debe **revisarlo** contra este documento. Si **no cumple** lo que aquí se exige, **debe refactorizarlo** para que cumpla, en el mismo cambio o en uno dedicado. El objetivo es **ir limpiando y mejorando el código** de forma continua; no se deja código legacy que viole estas reglas con el pretexto de “solo toqué una línea”.

---

## 1. Principios Fundamentales

Todo el código debe seguir los siguientes principios:

- **Clean Code**
- **SOLID**
- **DRY (Don't Repeat Yourself)**
- **KISS (Keep It Simple)**
- **YAGNI (You Aren't Gonna Need It)**

Siempre priorizar:

> **Legibilidad > Complejidad**

Un código que funciona pero es difícil de entender **no se considera código aceptable**.

---

## 2. Código Siempre Comentado

Todo el código debe estar **documentado correctamente**.

No se trata de comentar cada línea, sino de explicar:

- La intención
- Las reglas de negocio
- Decisiones técnicas importantes

Se debe utilizar **JSDoc o comentarios estructurados**.

**Ejemplo:**

```ts
/**
 * Representa una cuenta contable dentro del sistema.
 * Se utiliza para transportar información entre la base de datos,
 * servicios de negocio y la UI.
 */
export interface AccountingAccount {
  /** Identificador único de la cuenta */
  id: number

  /** Empresa propietaria de la cuenta (multiempresa) */
  companyId: number

  /** Nombre descriptivo de la cuenta */
  name: string
}
```

Los comentarios deben explicar:

- **Por qué** existe el código
- **Qué problema** resuelve
- **Reglas de negocio** relevantes

**Evitar** comentarios redundantes como:

```ts
let id: number // número
```

---

## 3. Nombres Claros y Descriptivos

Los nombres deben expresar la intención del código.

**Mal ejemplo:**

```ts
let d
let temp
let data
let x
```

**Buen ejemplo:**

```ts
diasTranscurridos
employeeId
totalPayrollAmount
isEmployeeActive
```

**Reglas:**

- Evitar abreviaturas innecesarias
- Usar nombres del dominio del negocio
- Los booleanos deben leerse como preguntas

**Ejemplos de booleanos:**

- `isActive`
- `hasAccess`
- `canExecute`

---

## 4. Funciones Pequeñas y con Responsabilidad Única

Cada función debe hacer **una sola cosa** y hacerla bien.

**Reglas:**

- Máximo recomendado: **20–30 líneas**
- Si supera ese tamaño, dividir la función
- No mezclar lógica de negocio con infraestructura

**Mal ejemplo:**

```ts
validarYGuardarUsuario()
procesarYEnviarFactura()
```

**Buen enfoque:**

```ts
validarUsuario()
guardarUsuario()
enviarFactura()
```

---

## 5. Principio SOLID

El código debe respetar **SOLID**.

Especialmente:

### SRP — Single Responsibility Principle

Cada módulo, clase o función debe tener **una única responsabilidad**.

Si algo cambia por más de una razón, debe separarse.

**Ejemplo:**

| Incorrecto | Correcto |
|------------|----------|
| `UserService` hace: validar usuario, guardar usuario, enviar email, manejar base de datos | `UserValidator`, `UserRepository`, `EmailService`, `UserService` |

---

## 6. DRY — No Repetir Código

La duplicación genera deuda técnica.

Si se detecta lógica repetida:

- Extraer a función
- Crear utilidades
- Reutilizar servicios

**Regla:** Si copias y pegas código más de una vez, debes refactorizar.

---

## 7. Estructura de Archivos

Los archivos deben mantenerse **pequeños y organizados**.

**Recomendaciones:**

- **Ideal:** 100–300 líneas
- **Máximo absoluto:** 1000 líneas

Si un archivo supera ese tamaño, **debe dividirse** en múltiples archivos.

**Ejemplo de estructura recomendada:**

```
/controllers
/services
/repositories
/models
/dto
/utils
/validators
```

Separar responsabilidades entre:

- Lógica de negocio
- Infraestructura
- Modelos
- Validaciones

---

## 8. Manejo de Errores Limpio

Evitar código anidado excesivamente.

**Mal ejemplo:**

```ts
if (user) {
  if (user.isValid()) {
    if (user.age > 18) {
      // ...
    }
  }
}
```

**Buen ejemplo usando guard clauses:**

```ts
if (!user) return
if (!user.isValid()) return
if (!isAdult(user)) return

// Código principal aquí
```

Esto mantiene el código plano y legible.

---

## 9. Formateo Consistente

Todo el código debe estar **correctamente formateado**.

Se deben usar herramientas como:

- **Prettier**
- **ESLint**

El código debe parecer escrito por una sola persona, aunque participen varios ingenieros.

**Reglas:**

- Indentación consistente
- Espacios correctos
- Estructura clara
- Sin código muerto

---

## 10. Refactorización Continua

El código debe mejorarse constantemente.

Aplicar la **Boy Scout Rule:**

> *"Deja el código un poco más limpio de como lo encontraste."*

**Revisar el código existente:** cada vez que se modifique un archivo que ya existe en el proyecto, hay que **revisarlo** contra este documento. Si ese código **no cumple** lo que aquí se indica (nombres, tamaño de funciones, comentarios, tipado, manejo de errores, etc.), **hay que refactorizarlo** para que cumpla. No se hace “solo el cambio mínimo”; se aprovecha el contacto con el archivo para **ir limpiando y mejorando** el código hasta alinearlo con estas reglas.

Cada vez que se modifique un archivo:

- Mejorar nombres
- Simplificar lógica
- Separar funciones grandes
- Eliminar duplicación
- **Si el código existente no cumple este documento, corregirlo hasta que cumpla**

---

## 11. Tipado Fuerte — Evitar `any` y Tipos Implícitos

En TypeScript (y en cualquier lenguaje tipado), el tipo es **documentación ejecutable**.

**Reglas:**

- **No usar `any`** salvo integración con librerías sin tipos; preferir `unknown` y acotar.
- Definir interfaces/types para contratos (APIs, DTOs, respuestas).
- Habilitar y respetar `strict` (o equivalente) en el compilador.

**Mal ejemplo:**

```ts
function process(data: any) {
  return data.value * 2
}
```

**Buen ejemplo:**

```ts
interface ProcessInput {
  value: number
}
function process(data: ProcessInput): number {
  return data.value * 2
}
```

---

## 12. Inmutabilidad y Efectos Secundarios

Preferir datos inmutables y funciones puras donde sea posible.

**Reglas:**

- Preferir `const` sobre `let`; evitar reasignaciones innecesarias.
- No mutar argumentos de función; devolver nuevos valores en lugar de modificar entradas.
- Reducir efectos secundarios (I/O, mutación global) a puntos concretos y bien identificados.

**Mal ejemplo:**

```ts
function addItem(cart: Item[]) {
  cart.push(newItem) // muta el argumento
}
```

**Buen ejemplo:**

```ts
function addItem(cart: Item[], newItem: Item): Item[] {
  return [...cart, newItem]
}
```

---

## 13. Argumentos y Parámetros

Mantener las firmas de funciones simples y predecibles.

**Reglas:**

- **Máximo 3–4 parámetros** por función. Si necesitas más, agrupar en un objeto de opciones.
- Parámetros opcionales al final; usar objetos de opciones en lugar de muchos booleanos.
- Evitar parámetros que cambien el comportamiento de forma radical (flags que convierten la función en “dos funciones en una”).

**Mal ejemplo:**

```ts
function createUser(name: string, email: string, age: number, active: boolean, role: string) {}
```

**Buen ejemplo:**

```ts
interface CreateUserInput {
  name: string
  email: string
  age: number
  active?: boolean
  role?: string
}
function createUser(input: CreateUserInput) {}
```

---

## 14. Un Solo Nivel de Abstracción por Función

Dentro de una misma función no mezclar detalles de bajo nivel con lógica de alto nivel.

**Reglas:**

- Una función debe operar en **un solo nivel de abstracción** (por ejemplo: solo “qué hace el negocio” o solo “cómo se accede al disco”).
- Extraer los detalles a funciones con nombres que describan ese nivel.

**Mal ejemplo:**

```ts
function processOrder(order: Order) {
  const db = getConnection()
  const row = db.query('SELECT * FROM inventory WHERE id = ?', order.itemId)
  if (row.quantity < order.quantity) throw new Error('Sin stock')
  const total = order.quantity * getPrice(order.itemId)
  sendEmail(order.customerId, `Pedido: ${total}`)
}
```

**Buen ejemplo:**

```ts
function processOrder(order: Order) {
  ensureStockAvailable(order)
  const total = calculateOrderTotal(order)
  notifyCustomer(order.customerId, total)
}
```

---

## 15. Constantes y Configuración — Sin Números o Cadenas Mágicas

Todo valor con significado de negocio o técnico debe tener nombre.

**Reglas:**

- Extraer **números y cadenas literales** a constantes con nombre (o en configuración).
- Agrupar constantes por dominio (errores, límites, mensajes, códigos).

**Mal ejemplo:**

```ts
if (user.role === 'ADM') { }
if (items.length > 100) { }
```

**Buen ejemplo:**

```ts
const ROLES = { ADMIN: 'ADM', USER: 'USR' } as const
const MAX_ITEMS_PER_PAGE = 100
if (user.role === ROLES.ADMIN) { }
if (items.length > MAX_ITEMS_PER_PAGE) { }
```

---

## 16. Errores y Excepciones — No Tragarse los Errores

El manejo de errores debe ser explícito y útil para depuración y operación.

**Reglas:**

- **No usar `catch` vacío**; al menos loguear o re-lanzar con contexto.
- Usar tipos de error específicos (clases o códigos) en lugar de strings genéricos.
- En APIs, devolver códigos y mensajes coherentes; documentar errores posibles en JSDoc.

**Mal ejemplo:**

```ts
try {
  await saveUser(user)
} catch {
  // silencio
}
```

**Buen ejemplo:**

```ts
try {
  await saveUser(user)
} catch (error) {
  logger.error('Error guardando usuario', { userId: user.id, error })
  throw new UserSaveError('No se pudo guardar el usuario', { cause: error })
}
```

---

## 17. Dependencias Explícitas — Inyección y Testabilidad

Las dependencias no deben estar “escondidas” dentro de la función o módulo.

**Reglas:**

- Pasar **dependencias por parámetro o constructor** (inyección de dependencias), no instanciarlas dentro (ej. no `new Repository()` dentro del servicio).
- Facilita tests (mocks) y hace evidente qué usa cada componente.
- En frontend: mismo criterio para APIs, navegación, etc.

**Mal ejemplo:**

```ts
class UserService {
  createUser(data: CreateUserDTO) {
    const repo = new UserRepository()
    return repo.save(data)
  }
}
```

**Buen ejemplo:**

```ts
class UserService {
  constructor(private readonly userRepository: UserRepository) {}
  createUser(data: CreateUserDTO) {
    return this.userRepository.save(data)
  }
}
```

---

## 18. Código Testeable por Diseño

Si el código es difícil de testear, suele ser una señal de diseño mejorable.

**Reglas:**

- Funciones puras y pequeñas son más fáciles de testear.
- Evitar lógica compleja acoplada a frameworks (UI, HTTP); extraer a servicios/funciones que se puedan probar con unit tests.
- Naming de tests: describir comportamiento, no implementación (ej. “debe calcular el total con descuento cuando el usuario es premium”).

---

## 19. Complejidad y Legibilidad — Evitar Anidación y Ramas Excesivas

Mantener la complejidad ciclomática baja.

**Reglas:**

- Preferir **guard clauses** (salida temprana) en lugar de múltiples niveles de `if/else`.
- Si una función tiene muchos `if/else` o `switch`, valorar extraer a funciones o estrategias por tipo/caso.
- Máximo recomendado: **complejidad ciclomática menor a 10** por función (herramientas como ESLint pueden reportarlo).

**Principio de menor asombro:** el código debe comportarse como un lector esperaría según su nombre y contexto.

---

## 20. Documentación del Proyecto (carpeta `docs/`)

**Regla obligatoria:** cada vez que se implemente o modifique algo en el proyecto, la documentación debe actualizarse en la carpeta **`docs/`**.

**Qué documentar:**

- **Nuevas funcionalidades o módulos:** describir qué hace, cómo se usa y dónde está en el código (o enlazar al código).
- **Cambios en APIs (endpoints, contratos):** actualizar o crear documentos de API, ejemplos de request/response.
- **Cambios en flujos de negocio o reglas:** actualizar guías, diagramas o documentos de dominio que correspondan.
- **Nuevas decisiones técnicas o de arquitectura:** registrarlas en la documentación técnica o en ADRs (Architecture Decision Records) si aplica.
- **Configuración, variables de entorno o despliegue:** mantener actualizado el README o la sección de setup en `docs/`.

**Dónde va:**

- Todo debe vivir dentro de la carpeta **`docs/`** del repositorio (o subcarpetas como `docs/api/`, `docs/arquitectura/`, `docs/reglas/`, etc.).
- Formato preferido: **Markdown (`.md`)** para que sea legible en el repo y en GitHub/GitLab.

**Cuándo:**

- En el **mismo commit o PR** donde se hace el cambio de código. La documentación no es opcional ni “para después”.

**Actualizar todos los docs donde sea necesario:** cuando se agregue o cambie una **regla**, un **proceso**, un **flujo**, una **decisión** o cualquier cosa que **deba quedar plasmada** en el proyecto, el ingeniero debe **actualizar todos los documentos** en `docs/` (y en cualquier otro lugar relevante, por ejemplo README, wikis internas) donde esa información deba reflejarse. No basta con tocar un solo archivo: hay que revisar y actualizar **cada doc** que haga referencia al tema o que deba incluir el cambio (índices, resúmenes, guías, reglas, APIs, etc.). El objetivo es que la documentación quede **consistente y al día** en todos los puntos afectados.

Esta regla forma parte de las reglas de desarrollo del proyecto y **debe cumplirse** junto con todas las demás de este documento.

---

## 21. Checklist antes de hacer Commit o PR

Antes de enviar código al repositorio, el ingeniero debe confirmar:

**Principios y estructura**

- [ ] **Si modifiqué código existente:** lo revisé contra este documento y, si no cumplía, lo refactoricé para que cumpla (ir limpiando y mejorando el código).
- [ ] El código sigue principios Clean Code (DRY, KISS, YAGNI, SOLID)
- [ ] Las funciones tienen responsabilidad única y un solo nivel de abstracción
- [ ] Los nombres son claros y descriptivos (dominio de negocio, booleanos como preguntas)
- [ ] No existe duplicación de código
- [ ] El archivo no supera 1000 líneas (ideal 100–300)
- [ ] Las funciones tienen un número razonable de parámetros (máx. 3–4 o objeto de opciones)

**Calidad y tipos**

- [ ] No se usa `any` sin justificación; tipos e interfaces definidos donde aplica
- [ ] Se prefieren inmutabilidad y evitar mutar argumentos
- [ ] No hay números o cadenas mágicas; se usan constantes con nombre
- [ ] El manejo de errores es explícito (no catch vacío, errores con contexto)

**Documentación y formato**

- [ ] El código está comentado correctamente (JSDoc, intención, reglas de negocio)
- [ ] **La documentación del proyecto está actualizada en la carpeta `docs/`** (funcionalidades, APIs, flujos o decisiones técnicas tocadas en el cambio)
- [ ] **Si agregué o cambié una regla, proceso o algo que deba quedar plasmado:** actualicé **todos los documentos** en `docs/` (y donde corresponda) donde fuera necesario reflejar ese cambio
- [ ] El código está bien formateado (Prettier, ESLint)
- [ ] Las dependencias están inyectadas o explícitas (testeable)
- [ ] El código es fácil de entender y de testear para otro ingeniero

**Si alguna regla no se cumple, el código debe refactorizarse antes de hacer merge.**

---

## Regla Final

Antes de finalizar cualquier tarea, el ingeniero debe revisar nuevamente este documento para confirmar que **todas** las reglas se están cumpliendo, incluida la actualización de la documentación en la carpeta `docs/` y, cuando se haya establecido o modificado una regla o algo que deba quedar plasmado, que **todos los documentos afectados** estén actualizados donde sea necesario.

Estas reglas aplican **tanto al código nuevo como al código existente**. Si se toca código que ya está en el repositorio y no cumple lo que dice este documento, **hay que refactorizarlo** para que cumpla y así ir limpiando y mejorando la base de código.

Todo lo que está en este documento **es regla** y **se debe cumplir**. No hay excepciones sin acuerdo explícito del equipo.

El objetivo de estas reglas es garantizar que el código y la documentación del proyecto sean:

**limpios, consistentes, mantenibles y profesionales.**
