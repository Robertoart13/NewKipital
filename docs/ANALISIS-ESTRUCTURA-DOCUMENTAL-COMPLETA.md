# Análisis: Estructura documental completa del proyecto

**Fecha:** 2026-03-10  
**Alcance:** Revisión de lo implementado (Ruta 1 Usuario, Ruta 2 Técnico, enterprise, índice maestro) y análisis de cada carpeta y su papel en la documentación. **Solo análisis, sin cambios.**

---

## 1. Resumen de lo implementado

Se añadió una capa de **navegación por rol** sobre la documentación ya consolidada:

- **Ruta 1 (Manual de Usuario):** `13-manual-usuario/` — 14 documentos en orden operativo, con guía rápida, mapa de menús, flujos críticos y módulos (config organizacional, usuarios/roles/permisos, calendario nómina/feriados, movimientos nómina, traslado interempresa).
- **Ruta 2 (Manual Técnico):** `14-manual-tecnico/` — 11 documentos (stack, reglas, seguridad, datos, API, QA, pendientes, operación por módulo, matriz CRUD, incidentes, herramientas).
- **Capa enterprise:** `15-enterprise-gobierno/` (4 docs) y `16-enterprise-operacion/` (7 docs) — RACI, versionado, gobierno de cambios, auditoría mensual; matriz de permisos, diccionario de datos, catálogo API, runbooks, playbook incidentes, SLO/KPI, trazabilidad negocio–técnico–QA.
- **Índice maestro:** `00-INDICE-CONSOLIDACION.md` en raíz de `docs/` — “Manual Maestro” con las tres rutas (Usuario, Ingeniería, Enterprise) y enlaces a todo lo anterior.
- **Validación:** BROKEN_LINKS = 0 en `docs/`.

El enfoque es **enterprise** en el sentido de: dos audiencias claras (usuario / ingeniero), gobierno documental (RACI, versionado, auditoría) y operación (runbooks, playbook, SLO/KPI, trazabilidad).

---

## 2. Árbol documental actual (nivel superior)

```
docs/
├── 00-INDICE-CONSOLIDACION.md     ← Punto de entrada único (Manual Maestro)
├── 01-inventario/                 ← Control de consolidación (inventario, matriz, auditorías)
├── 02-estructura-destino/         ← Estructura destino, gobernanza, diagramas
├── 03-reglas/                     ← Fuente de verdad: reglas canónicas
├── 04-arquitectura/               ← Fuente de verdad: arquitectura y gobierno
├── 05-seguridad-identidad-permisos/
├── 06-backend-api-db/
├── 07-frontend-ux/
├── 08-planilla/
├── 09-acciones-personal/
├── 10-testing-qa/
├── 11-operacion-automatizaciones/
├── 12-backlog-pendientes/
├── 13-manual-usuario/             ← Ruta 1: usuario operativo (14 docs)
├── 14-manual-tecnico/             ← Ruta 2: ingeniería (11 docs)
├── 15-enterprise-gobierno/        ← Gobierno documental (4 docs)
├── 16-enterprise-operacion/       ← Operación y referencias canónicas (7 docs)
└── 99-historico/                  ← Histórico + fuentes originales
```

---

## 3. Análisis por carpeta y su papel

### 3.1 `00-INDICE-CONSOLIDACION.md` (archivo en raíz)

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | Punto de entrada único: “Manual Maestro” con dos rutas (Usuario / Ingeniería) y capa enterprise. |
| **Contenido** | Lista numerada por ruta: Ruta 1 (14 ítems → 13-manual-usuario), Ruta 2 (11 ítems → 14-manual-tecnico), Capas enterprise (11 ítems → 15 y 16). |
| **Navegación** | Total: un solo índice que lleva a todo lo que un usuario o un ingeniero necesitan sin tocar 01–12 directamente (aunque 13 y 14 sí enlazan a 03–12 y 16). |
| **Cobertura** | Cubre explícitamente: manual usuario completo, manual técnico completo, gobierno (RACI, versionado, cambios, auditoría), operación (matriz permisos, diccionario, API, runbooks, playbook, SLO/KPI, trazabilidad). |
| **Observación** | No enlaza directamente a 03–12; el acceso a “fuente de verdad” es vía 13 y 14. Coherente con “Soy Usuario / Soy Ingeniero”. |

**Conclusión:** Cumple el rol de índice maestro con enfoque enterprise y navegación por rol. Es el lugar natural para una futura “portada con dos botones” (Usuario / Ingeniero).

---

### 3.2 `01-inventario/` y `02-estructura-destino/`

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | Control del proceso de consolidación: inventario fuente, matriz de trazabilidad, auditorías de cobertura, estructura destino, gobernanza documental, diagramas. |
| **Papel en la doc “completa”** | No son lectura operativa para usuario ni ingeniero; son **metadocumentación** del proyecto de consolidación. |
| **Relación con el índice** | El índice actual (00) no los enlaza; es coherente si el Manual Maestro es solo para “producto” (usuario + técnico + enterprise). |
| **Observación** | Si se quiere que “todo” esté navegable desde un solo sitio, se podría añadir una sección “Consolidación y control” en 00 con enlaces a 01 y 02 (opcional). |

**Conclusión:** Bien definidos como capa de control; la doc “completa” para operación y técnica no depende de ellos en el flujo principal.

---

### 3.3 `03-reglas/` a `12-backlog-pendientes/`

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | **Fuente de verdad por dominio:** reglas, arquitectura, seguridad, backend, frontend, planilla, acciones de personal, testing, operación, backlog. |
| **Papel** | Documentos maestros consolidados; detalle técnico y de negocio. |
| **Quién los usa** | Principalmente vía **14-manual-tecnico** (enlaces desde reglas, seguridad, datos, API, QA, pendientes, operación) y **13-manual-usuario** (enlaces a planilla, acciones de personal, seguridad/permisos). |
| **Navegación** | No están en el índice 00 como primera opción; el flujo es: 00 → 13 o 14 → desde ahí a 03–12 (y 16). Trazabilidad correcta. |

**Conclusión:** Son la columna vertebral técnica y de negocio; la “documentación completa” los incluye a través de los manuales 13 y 14 y de 16 (operación). Bien alineados con el diseño enterprise (una fuente de verdad, dos rutas de acceso).

---

### 3.4 `13-manual-usuario/` — Ruta 1

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | Manual de usuario operativo: orden de operación, módulos, flujos y “qué pasa si”. |
| **Archivos** | 14: 00-GUIA-RAPIDA, 01-EMPRESAS, 02-EMPLEADOS, 03-ARTICULOS-NOMINA, 04-CUENTAS-CONTABLES, 05-PLANILLA-OPERATIVA, 06-ACCIONES-PERSONAL-OPERATIVO, 07-MAPA-MENUS-Y-RUTAS, 08-FLUJOS-CRITICOS-Y-ESCENARIOS, 09-CONFIG-ORGANIZACION, 10-USUARIOS-ROLES-PERMISOS, 11-CALENDARIO-NOMINA-Y-FERIADOS, 12-MOVIMIENTOS-NOMINA, 13-TRASLADO-INTEREMPRESA. |
| **Cobertura** | Empresas, empleados, configuración organizacional (departamentos, puestos, clases, proyectos), cuentas contables, artículos de nómina, movimientos de nómina, usuarios/roles/permisos (incl. perfil Master), calendario nómina y feriados, acciones de personal, planilla operativa, traslado interempresa, mapa de menús, flujos críticos y escenarios. |
| **Enlaces hacia atrás** | Enlaza a: 00-INDICE-CONSOLIDACION, 08-planilla/PLANILLA-NOMINA-CONSOLIDADO, 09-acciones-personal/ACCIONES-PERSONAL-INDICE, 05-seguridad-identidad-permisos/SEGURIDAD-IDENTIDAD-PERMISOS-CONSOLIDADO, 16-enterprise-operacion/01-MATRIZ-PERMISOS-CANONICA. |
| **Orden** | La guía rápida define un orden operativo completo (mapa → empresas → config org → … → planilla → traslado → escenarios) y atajos por necesidad. |

**Conclusión:** Ruta 1 completa y alineada con lo pedido (proyectos, clases, calendario, feriados, usuarios/roles/permisos/Master, movimientos, traslado, mapa, flujos). Bien conectada a la fuente de verdad (08, 09, 05, 16).

---

### 3.5 `14-manual-tecnico/` — Ruta 2

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | Manual técnico para ingeniería: stack, reglas, seguridad, datos, API, QA, pendientes, operación por módulo, matriz CRUD, incidentes, herramientas. |
| **Archivos** | 11: 00-STACK-Y-ARQUITECTURA, 01-REGLAS-TECNICAS, 02-SEGURIDAD-PERMISOS, 03-DATOS-Y-BD, 04-API-CONTRATOS, 05-QA-Y-TESTING, 06-PENDIENTES-TECNICOS, 07-OPERACION-POR-MODULO, 08-MATRIZ-CRUD-POR-MODULO, 09-MANEJO-INCIDENTES-FUNCIONALES, 10-HERRAMIENTAS-Y-ESTANDARES. |
| **Cobertura** | Stack (React, Vite, TS, NestJS, MySQL, Redux, TanStack Query); reglas; seguridad y permisos; datos y BD; API y contratos; QA y testing; pendientes; operación por módulo; matriz CRUD por módulo (tabla por módulo con Create/Read/Update/Delete lógico y regla clave); manejo de incidentes funcionales; herramientas y estándares. |
| **Enlaces hacia atrás** | Enlaza a: 03-reglas/REGLAS-MAESTRAS-CANONICAS, 05-seguridad, 06-backend-api-db, 10-testing-qa, 12-backlog-pendientes, 15-enterprise-gobierno (RACI, versionado), 16-enterprise-operacion (runbooks, playbook). |
| **Lectura “senior”** | El 00-STACK-Y-ARQUITECTURA actúa como índice técnico con la ruta recomendada (1→2→…→10). |

**Conclusión:** Ruta 2 completa con matriz CRUD por módulo y “qué hacer si…” (incidentes). Bien enlazada a documentos maestros (03–12) y a enterprise (15, 16).

---

### 3.6 `15-enterprise-gobierno/`

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | Gobierno documental: responsabilidades, versionado, cambios y auditoría. |
| **Archivos** | 4: 01-RACI-DOCUMENTAL, 02-POLITICA-VERSIONADO, 03-GOBIERNO-CAMBIOS-DOCS, 04-AUDITORIA-MENSUAL. |
| **Papel** | Define quién hace qué con la documentación, cómo se versiona, cómo se aprueban cambios y cómo se audita. |
| **Navegación** | Enlazados desde 00-INDICE-CONSOLIDACION (capas enterprise) y desde 14-manual-tecnico/10-HERRAMIENTAS-Y-ESTANDARES. |

**Conclusión:** Capa enterprise de gobierno bien delimitada e integrada en el índice y en el manual técnico.

---

### 3.7 `16-enterprise-operacion/`

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | Operación y referencias canónicas: permisos, datos, API, runbooks, incidentes, SLO/KPI, trazabilidad. |
| **Archivos** | 7: 01-MATRIZ-PERMISOS-CANONICA, 02-DICCIONARIO-DATOS-CANONICO, 03-CATALOGO-API-FUNCIONAL, 04-RUNBOOKS-OPERATIVOS, 05-PLAYBOOK-INCIDENTES, 06-SLO-KPI-OPERACION, 07-TRAZABILIDAD-NEGOCIO-TECNICO-QA. |
| **Papel** | Matriz canónica de permisos, diccionario de datos, catálogo API, runbooks operativos, playbook de incidentes, SLO/KPI de operación, trazabilidad negocio→técnico→QA. |
| **Navegación** | Enlazados desde 00 (enterprise), desde 13 (usuarios/roles/permisos → matriz permisos) y desde 14 (incidentes → runbooks y playbook). |

**Conclusión:** Capa enterprise de operación completa y enlazada desde usuario (permisos) y técnico (incidentes, herramientas).

---

### 3.8 `99-historico/`

| Aspecto | Análisis |
|--------|----------|
| **Propósito** | Histórico y fuentes originales: actas, informes, plantilla de informe de consolidación y copia de la documentación pre-consolidación. |
| **Papel** | No es ruta de uso diario; es archivo y trazabilidad. |
| **Relación con el índice** | No aparece en 00; es correcto si el Manual Maestro es solo “vigente”. |

**Conclusión:** Bien como depósito histórico; no forma parte de la navegación principal por diseño.

---

## 4. Cómo queda la documentación “completa” del proyecto

- **Un solo punto de entrada:** `docs/00-INDICE-CONSOLIDACION.md` (Manual Maestro).
- **Dos rutas por rol:**
  - **Usuario:** 00 → Ruta 1 → 13-manual-usuario (guía rápida + 13 módulos/flujos).
  - **Ingeniero:** 00 → Ruta 2 → 14-manual-tecnico (stack + 10 temas técnicos).
- **Capa enterprise:** 00 → 15 (gobierno) y 16 (operación); también accesible desde 13 y 14 donde aplica.
- **Fuente de verdad por dominio:** 03–12; accedida desde 13 y 14 (y 16) mediante enlaces explícitos.
- **Control de consolidación:** 01 y 02 quedan como metadocumentación; 99 como histórico.

No hay duplicación de “quién es el maestro”: los manuales 13 y 14 son **vistas orientadas a rol** que apuntan a los consolidados (03–12) y a enterprise (15, 16). La navegación es total en el sentido de que desde el índice se puede llegar a todo lo operativo y de gobierno/operación, y los manuales enlazan a la fuente de verdad donde hace falta.

---

## 5. Calidad de navegación y enlaces

- **Índice 00:** Enlaces a 13, 14, 15 y 16; no a 01, 02 ni 99 (coherente con el diseño).
- **13 y 14:** Enlaces verificados a 03, 05, 06, 08, 09, 10, 12 y 16 (y 13→00). Si la validación reportó BROKEN_LINKS = 0 en `docs/`, la red interna está consistente.
- **Trazabilidad:** Usuario → manual usuario → planilla/acciones/seguridad/permisos canónicos; ingeniero → manual técnico → reglas/seguridad/backend/QA/backlog/enterprise. Correcto para un enfoque enterprise.

---

## 6. Posible “último toque” que mencionaste

Una **portada visual “Read Me del Sistema”** con dos botones (Soy Usuario / Soy Ingeniero) encajaría como:

- Un único documento (p. ej. `docs/README-SISTEMA.md` o la propia `00-INDICE-CONSOLIDACION.md` con dos bloques destacados al inicio) con:
  - **Soy Usuario** → `./13-manual-usuario/00-GUIA-RAPIDA-USUARIO.md`
  - **Soy Ingeniero** → `./14-manual-tecnico/00-STACK-Y-ARQUITECTURA.md`

y opcionalmente un tercer bloque “Gobierno y operación” → sección enterprise del índice (15 y 16). Eso no cambia la estructura actual; solo refuerza la portada.

---

## 7. Conclusión del análisis

| Pregunta | Respuesta |
|----------|-----------|
| ¿Quedó hecho completo como se pidió? | Sí: Ruta 1 con módulos faltantes (config org, usuarios/roles/permisos, calendario/feriados, movimientos, traslado, mapa, flujos); Ruta 2 con matriz CRUD, incidentes, herramientas; índice maestro con ambas rutas y enterprise; BROKEN_LINKS = 0. |
| ¿Enfoque enterprise? | Sí: dos audiencias, gobierno (RACI, versionado, auditoría), operación (matriz permisos, diccionario, API, runbooks, playbook, SLO/KPI, trazabilidad). |
| ¿Navegación total? | Sí: desde 00 se llega a 13, 14, 15 y 16; desde 13 y 14 se llega a 03–12 y 16 según corresponda. |
| ¿Cómo va quedando la documentación completa? | Con una estructura clara: una entrada (00), dos rutas por rol (13, 14), capa enterprise (15, 16), fuentes de verdad por dominio (03–12), control e histórico (01, 02, 99). Cada carpeta tiene un papel definido y no se solapan responsabilidades. |

**Solo análisis:** Este documento no propone cambios en archivos; solo describe y valida la estructura y el papel de cada carpeta en la documentación completa del proyecto.
