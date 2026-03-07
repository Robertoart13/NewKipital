# Coding Standards & Clean Code Rules

Este documento define las **reglas obligatorias de desarrollo** del proyecto.

Todo ingeniero debe seguir estas reglas para garantizar que el cdigo sea:

- Legible
- Mantenible
- Escalable
- Fcil de entender por cualquier miembro del equipo

**Antes de hacer commit o Pull Request**, el ingeniero debe revisar este documento y confirmar que su cdigo cumple todas las reglas.

Cada cambio o funcionalidad debe quedar **documentado en la carpeta `docs/`** para mantener la documentacin del proyecto actualizada. Cuando se establezca o modifique una **regla, proceso o cualquier cosa que deba quedar plasmada**, hay que **actualizar todos los documentos** en `docs/` (y donde corresponda) donde sea necesario que esa informacin aparezca. Es **regla obligatoria** y se debe cumplir junto con el resto de este documento.

Si el cdigo no cumple estas reglas, **debe refactorizarse antes de integrarse al repositorio**.

**Cdigo existente:** cuando un ingeniero trabaje en cdigo que ya est en el repositorio, debe **revisarlo** contra este documento. Si **no cumple** lo que aqu se exige, **debe refactorizarlo** para que cumpla, en el mismo cambio o en uno dedicado. El objetivo es **ir limpiando y mejorando el cdigo** de forma continua; no se deja cdigo legacy que viole estas reglas con el pretexto de solo toqu una lnea.

---

## 1. Principios Fundamentales

Todo el cdigo debe seguir los siguientes principios:

- **Clean Code**
- **SOLID**
- **DRY (Don't Repeat Yourself)**
- **KISS (Keep It Simple)**
- **YAGNI (You Aren't Gonna Need It)**

Siempre priorizar:

> **Legibilidad > Complejidad**

Un cdigo que funciona pero es difcil de entender **no se considera cdigo aceptable**.

---

## 2. Cdigo Siempre Comentado

Todo el cdigo debe estar **documentado correctamente**.

No se trata de comentar cada lnea, sino de explicar:

- La intencin
- Las reglas de negocio
- Decisiones tcnicas importantes

Se debe utilizar **JSDoc o comentarios estructurados**.

**Ejemplo:**

```ts
/**
 * Representa una cuenta contable dentro del sistema.
 * Se utiliza para transportar informacin entre la base de datos,
 * servicios de negocio y la UI.
 */
export interface AccountingAccount {
  /** Identificador nico de la cuenta */
  id: number

  /** Empresa propietaria de la cuenta (multiempresa) */
  companyId: number

  /** Nombre descriptivo de la cuenta */
  name: string
}
```

Los comentarios deben explicar:

- **Por qu** existe el cdigo
- **Qu problema** resuelve
- **Reglas de negocio** relevantes

**Evitar** comentarios redundantes como:

```ts
let id: number // nmero
```

---

## 3. Nombres Claros y Descriptivos

Los nombres deben expresar la intencin del cdigo.

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

## 4. Funciones Pequeas y con Responsabilidad nica

Cada funcin debe hacer **una sola cosa** y hacerla bien.

**Reglas:**

- Mximo recomendado: **2030 lneas**
- Si supera ese tamao, dividir la funcin
- No mezclar lgica de negocio con infraestructura

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

El cdigo debe respetar **SOLID**.

Especialmente:

### SRP  Single Responsibility Principle

Cada mdulo, clase o funcin debe tener **una nica responsabilidad**.

Si algo cambia por ms de una razn, debe separarse.

**Ejemplo:**

| Incorrecto | Correcto |
|------------|----------|
| `UserService` hace: validar usuario, guardar usuario, enviar email, manejar base de datos | `UserValidator`, `UserRepository`, `EmailService`, `UserService` |

---

## 6. DRY  No Repetir Cdigo

La duplicacin genera deuda tcnica.

Si se detecta lgica repetida:

- Extraer a funcin
- Crear utilidades
- Reutilizar servicios

**Regla:** Si copias y pegas cdigo ms de una vez, debes refactorizar.

---

## 7. Estructura de Archivos

Los archivos deben mantenerse **pequeos y organizados**.

**Recomendaciones:**

- **Ideal:** 100300 lneas
- **Mximo absoluto:** 1000 lneas

Si un archivo supera ese tamao, **debe dividirse** en mltiples archivos.

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

- Lgica de negocio
- Infraestructura
- Modelos
- Validaciones

---

## 8. Manejo de Errores Limpio

Evitar cdigo anidado excesivamente.

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

// Cdigo principal aqu
```

Esto mantiene el cdigo plano y legible.

---

## 9. Formateo Consistente

Todo el cdigo debe estar **correctamente formateado**.

Se deben usar herramientas como:

- **Prettier**
- **ESLint**

El cdigo debe parecer escrito por una sola persona, aunque participen varios ingenieros.

**Reglas:**

- Indentacin consistente
- Espacios correctos
- Estructura clara
- Sin cdigo muerto

---

## 10. Refactorizacin Continua

El cdigo debe mejorarse constantemente.

Aplicar la **Boy Scout Rule:**

> *"Deja el cdigo un poco ms limpio de como lo encontraste."*

**Revisar el cdigo existente:** cada vez que se modifique un archivo que ya existe en el proyecto, hay que **revisarlo** contra este documento. Si ese cdigo **no cumple** lo que aqu se indica (nombres, tamao de funciones, comentarios, tipado, manejo de errores, etc.), **hay que refactorizarlo** para que cumpla. No se hace solo el cambio mnimo; se aprovecha el contacto con el archivo para **ir limpiando y mejorando** el cdigo hasta alinearlo con estas reglas.

Cada vez que se modifique un archivo:

- Mejorar nombres
- Simplificar lgica
- Separar funciones grandes
- Eliminar duplicacin
- **Si el cdigo existente no cumple este documento, corregirlo hasta que cumpla**

---

## 11. Tipado Fuerte  Evitar `any` y Tipos Implcitos

En TypeScript (y en cualquier lenguaje tipado), el tipo es **documentacin ejecutable**.

**Reglas:**

- **No usar `any`** salvo integracin con libreras sin tipos; preferir `unknown` y acotar.
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
- No mutar argumentos de funcin; devolver nuevos valores en lugar de modificar entradas.
- Reducir efectos secundarios (I/O, mutacin global) a puntos concretos y bien identificados.

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

## 13. Argumentos y Parmetros

Mantener las firmas de funciones simples y predecibles.

**Reglas:**

- **Mximo 34 parmetros** por funcin. Si necesitas ms, agrupar en un objeto de opciones.
- Parmetros opcionales al final; usar objetos de opciones en lugar de muchos booleanos.
- Evitar parmetros que cambien el comportamiento de forma radical (flags que convierten la funcin en dos funciones en una).

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

## 14. Un Solo Nivel de Abstraccin por Funcin

Dentro de una misma funcin no mezclar detalles de bajo nivel con lgica de alto nivel.

**Reglas:**

- Una funcin debe operar en **un solo nivel de abstraccin** (por ejemplo: solo qu hace el negocio o solo cmo se accede al disco).
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

## 15. Constantes y Configuracin  Sin Nmeros o Cadenas Mgicas

Todo valor con significado de negocio o tcnico debe tener nombre.

**Reglas:**

- Extraer **nmeros y cadenas literales** a constantes con nombre (o en configuracin).
- Agrupar constantes por dominio (errores, lmites, mensajes, cdigos).

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

## 16. Errores y Excepciones  No Tragarse los Errores

El manejo de errores debe ser explcito y til para depuracin y operacin.

**Reglas:**

- **No usar `catch` vaco**; al menos loguear o re-lanzar con contexto.
- Usar tipos de error especficos (clases o cdigos) en lugar de strings genricos.
- En APIs, devolver cdigos y mensajes coherentes; documentar errores posibles en JSDoc.

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

## 17. Dependencias Explcitas  Inyeccin y Testabilidad

Las dependencias no deben estar escondidas dentro de la funcin o mdulo.

**Reglas:**

- Pasar **dependencias por parmetro o constructor** (inyeccin de dependencias), no instanciarlas dentro (ej. no `new Repository()` dentro del servicio).
- Facilita tests (mocks) y hace evidente qu usa cada componente.
- En frontend: mismo criterio para APIs, navegacin, etc.

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

## 18. Cdigo Testeable por Diseo

Si el cdigo es difcil de testear, suele ser una seal de diseo mejorable.

**Reglas:**

- Funciones puras y pequeas son ms fciles de testear.
- Evitar lgica compleja acoplada a frameworks (UI, HTTP); extraer a servicios/funciones que se puedan probar con unit tests.
- Naming de tests: describir comportamiento, no implementacin (ej. debe calcular el total con descuento cuando el usuario es premium).

---

## 19. Complejidad y Legibilidad  Evitar Anidacin y Ramas Excesivas

Mantener la complejidad ciclomtica baja.

**Reglas:**

- Preferir **guard clauses** (salida temprana) en lugar de mltiples niveles de `if/else`.
- Si una funcin tiene muchos `if/else` o `switch`, valorar extraer a funciones o estrategias por tipo/caso.
- Mximo recomendado: **complejidad ciclomtica menor a 10** por funcin (herramientas como ESLint pueden reportarlo).

**Principio de menor asombro:** el cdigo debe comportarse como un lector esperara segn su nombre y contexto.

---

## 20. Documentacin del Proyecto (carpeta `docs/`)

**Regla obligatoria:** cada vez que se implemente o modifique algo en el proyecto, la documentacin debe actualizarse en la carpeta **`docs/`**.

**Qu documentar:**

- **Nuevas funcionalidades o mdulos:** describir qu hace, cmo se usa y dnde est en el cdigo (o enlazar al cdigo).
- **Cambios en APIs (endpoints, contratos):** actualizar o crear documentos de API, ejemplos de request/response.
- **Cambios en flujos de negocio o reglas:** actualizar guas, diagramas o documentos de dominio que correspondan.
- **Nuevas decisiones tcnicas o de arquitectura:** registrarlas en la documentacin tcnica o en ADRs (Architecture Decision Records) si aplica.
- **Configuracin, variables de entorno o despliegue:** mantener actualizado el README o la seccin de setup en `docs/`.

**Dnde va:**

- Todo debe vivir dentro de la carpeta **`docs/`** del repositorio (o subcarpetas como `docs/api/`, `docs/arquitectura/`, `docs/reglas/`, etc.).
- Formato preferido: **Markdown (`.md`)** para que sea legible en el repo y en GitHub/GitLab.

**Cundo:**

- En el **mismo commit o PR** donde se hace el cambio de cdigo. La documentacin no es opcional ni para despus.

**Actualizar todos los docs donde sea necesario:** cuando se agregue o cambie una **regla**, un **proceso**, un **flujo**, una **decisin** o cualquier cosa que **deba quedar plasmada** en el proyecto, el ingeniero debe **actualizar todos los documentos** en `docs/` (y en cualquier otro lugar relevante, por ejemplo README, wikis internas) donde esa informacin deba reflejarse. No basta con tocar un solo archivo: hay que revisar y actualizar **cada doc** que haga referencia al tema o que deba incluir el cambio (ndices, resmenes, guas, reglas, APIs, etc.). El objetivo es que la documentacin quede **consistente y al da** en todos los puntos afectados.

Esta regla forma parte de las reglas de desarrollo del proyecto y **debe cumplirse** junto con todas las dems de este documento.

---

## 21. Checklist antes de hacer Commit o PR

Antes de enviar cdigo al repositorio, el ingeniero debe confirmar:

**Principios y estructura**

- [ ] **Si modifiqu cdigo existente:** lo revis contra este documento y, si no cumpla, lo refactoric para que cumpla (ir limpiando y mejorando el cdigo).
- [ ] El cdigo sigue principios Clean Code (DRY, KISS, YAGNI, SOLID)
- [ ] Las funciones tienen responsabilidad nica y un solo nivel de abstraccin
- [ ] Los nombres son claros y descriptivos (dominio de negocio, booleanos como preguntas)
- [ ] No existe duplicacin de cdigo
- [ ] El archivo no supera 1000 lneas (ideal 100300)
- [ ] Las funciones tienen un nmero razonable de parmetros (mx. 34 o objeto de opciones)

**Calidad y tipos**

- [ ] No se usa `any` sin justificacin; tipos e interfaces definidos donde aplica
- [ ] Se prefieren inmutabilidad y evitar mutar argumentos
- [ ] No hay nmeros o cadenas mgicas; se usan constantes con nombre
- [ ] El manejo de errores es explcito (no catch vaco, errores con contexto)

**Documentacin y formato**

- [ ] El cdigo est comentado correctamente (JSDoc, intencin, reglas de negocio)
- [ ] **La documentacin del proyecto est actualizada en la carpeta `docs/`** (funcionalidades, APIs, flujos o decisiones tcnicas tocadas en el cambio)
- [ ] **Si agregu o cambi una regla, proceso o algo que deba quedar plasmado:** actualic **todos los documentos** en `docs/` (y donde corresponda) donde fuera necesario reflejar ese cambio
- [ ] El cdigo est bien formateado (Prettier, ESLint)
- [ ] Las dependencias estn inyectadas o explcitas (testeable)
- [ ] El cdigo es fcil de entender y de testear para otro ingeniero

**Si alguna regla no se cumple, el cdigo debe refactorizarse antes de hacer merge.**

---

## Regla Final

Antes de finalizar cualquier tarea, el ingeniero debe revisar nuevamente este documento para confirmar que **todas** las reglas se estn cumpliendo, incluida la actualizacin de la documentacin en la carpeta `docs/` y, cuando se haya establecido o modificado una regla o algo que deba quedar plasmado, que **todos los documentos afectados** estn actualizados donde sea necesario.

Estas reglas aplican **tanto al cdigo nuevo como al cdigo existente**. Si se toca cdigo que ya est en el repositorio y no cumple lo que dice este documento, **hay que refactorizarlo** para que cumpla y as ir limpiando y mejorando la base de cdigo.

Todo lo que est en este documento **es regla** y **se debe cumplir**. No hay excepciones sin acuerdo explcito del equipo.

El objetivo de estas reglas es garantizar que el cdigo y la documentacin del proyecto sean:

**limpios, consistentes, mantenibles y profesionales.**
