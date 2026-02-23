# KPITAL 360 — Integración de Ant Design

**Documento:** 05  
**Para:** Ingeniero Frontend  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [02-ScaffoldingProyecto.md](./02-ScaffoldingProyecto.md)  
**Última actualización:** 2026-02-23 (Paleta RRHH: Activo, danger, clases de referencia)

---

## Directivas de Estilo RRHH (Obligatorio)

> **Este es el único estilo a seguir en KPITAL 360.** Cualquier nueva página o componente debe respetar estas directivas.

KPITAL 360 es un sistema de **recursos humanos**. La interfaz debe reflejar:

- **Seriedad** — Sin colores fuertes ni llamativos
- **Confort** — Espacios cómodos, legibilidad clara
- **Profesionalidad** — Sensación corporativa, no SaaS juvenil
- **Identificable** — Jerarquía visual clara sin saturación excesiva

Se utilizan colores **poco saturados, tonos slate y grises neutros**. Referencia implementada: `UsersManagementPage.tsx` y su módulo CSS.

---

## Paleta RRHH (Valores vigentes)

> **Última actualización:** Ajustes aplicados — verde Activo más visible (`#b8d9c4`), danger más identificable (borde `#c99a9a`). Usar exclusivamente estos valores.

### Acentos principales (slate / azul-gris)

| Uso | Color | Hex |
|-----|-------|-----|
| Acciones, links, focus, paginación activa | Slate principal | `#5a6c7d` |
| Hover de botones y links | Slate oscuro | `#4a5c6d` |
| Avatar de usuario en Drawer | Gris-azul | `#6b7c8c` |

### Texto

| Uso | Color | Hex |
|-----|-------|-----|
| Títulos, texto principal | Gris oscuro | `#3d4f5c` |
| Encabezados de tabla | Gris medio | `#4a5a68` |
| Texto secundario, subtítulos | Gris suave | `#6b7a85` |

### Etiquetas de estado

| Estado | Fondo | Texto |
|--------|-------|-------|
| Activo | `#b8d9c4` | `#3d5a45` |
| Inactivo | `#f0f2f4` | `#6b7a85` |

### Botones

| Tipo | Fondo | Borde | Texto |
|------|-------|-------|-------|
| Principal | `#5a6c7d` | — | `#fff` |
| Secundario | `#fff` | `#d8dde4` | `#5a6b7a` |

### Fondos y bordes

| Uso | Color | Hex |
|-----|-------|-----|
| Fondo de página | Gris muy claro | `#f7f8fa`, `#f5f7f9` |
| Bordes | Gris sutil | `#e8ecf0`, `#e0e4e8`, `#e4e8ec` |
| Encabezado tabla | Gris claro | `#f2f4f6` |
| Hover filas | Gris muy sutil | `#f8f9fa` |

### Errores / advertencias / danger (suaves pero identificables)

| Uso | Color | Hex |
|-----|-------|-----|
| Fondo banner danger | `#e4cdcd` | Rojo suave |
| Fondo lista danger | `#ecd8d8` | Rojo muy suave |
| Borde danger | `#c99a9a` | Rojo pastel |
| Texto danger | `#4d2e2e` | Marrón-gris oscuro |

---

## Qué Pidió Roberto (Textual)

> "Vas a integrar Ant Design para toda la UI. Primero, instala las dependencias de AntD y asegúrate de que se carguen sus estilos globales. Luego, aplica el tema de Ant Design a nivel de toda la app, personalizando variables si es necesario (por ejemplo, colores corporativos). Usa los componentes base de AntD, como botones, tablas, formularios y modales, pero siempre dentro de un patrón coherente. Si necesitás personalizar o extender componentes, usa clases CSS o componentes envueltos. No generes lógica compleja en los componentes, mantén la lógica en Redux o en los hooks. Así, AntD será la base visual, pero la arquitectura de estado sigue siendo la que definimos (Redux Toolkit y TanStack Query). Ejecuta esto en orden: primero configura AntD, luego los slices, y después los hooks de TanStack. Si hay dudas, revisa la documentación oficial de AntD y ajusta las variables de tema según la identidad corporativa."

---

## Decisiones Tomadas

### Ant Design 5

Se eligió Ant Design versión 5 como framework UI completo para toda la aplicación. No se mezcla con otro framework de componentes (no Bootstrap, no Material UI, no Tailwind para componentes).

### Tema Corporativo (alineado a Paleta RRHH)

Se definió un tema corporativo en `src/config/theme.ts` con los siguientes tokens. **Deben mantenerse coherentes con la Paleta RRHH**:

| Token | Valor | Propósito |
|-------|-------|-----------|
| `colorPrimary` | `#5a6c7d` | Slate corporativo RRHH (no azul fuerte) |
| `borderRadius` | `6` a `12` | Bordes suaves (8–12px para cards) |
| `fontFamily` | `"Public Sans"` | Tipografía corporativa (Google Fonts) |
| `fontSize` | `14` | Tamaño base legible |
| `colorBgContainer` | `#ffffff` | Fondo de contenedores blanco |
| `colorText` | `#3d4f5c` | Texto principal gris oscuro |
| `controlHeight` | `36` | Altura de controles coherente |

### ConfigProvider Dinámico

`AntDConfigProvider.tsx` envuelve toda la app y sincroniza:
- **Tema claro/oscuro** — Lee de `ThemeContext`. Dark mode usa `theme.darkAlgorithm`.
- **Locale** — Lee de `LocaleContext`. Cambia entre `esES` y `enUS` de Ant Design.

---

## Referencia de Implementación

**Archivos de referencia:**
- `UsersManagementPage.tsx` y `UsersManagementPage.module.css` — Usuarios, Drawer, etiquetas, botones
- `PermissionsAdminListPage.tsx` — Permisos: encabezado, banner informativo, tabla config, búsqueda
- `RolesManagementPage.tsx` — Roles: selector de aplicación (KPITAL/TimeWise), matriz de permisos, Agregar rol, Guardar cambios

Ambas páginas comparten `UsersManagementPage.module.css` y aplican la Paleta RRHH de extremo a extremo. **Copiar estas clases y valores** para nuevas pantallas. Los ajustes (verde Activo, danger, etc.) están ya reflejados aquí.

### Clases CSS obligatorias (UsersManagementPage.module.css)

| Clase | Uso | Valores principales |
|-------|-----|---------------------|
| `.tagActivo` | Etiqueta estado Activo | fondo `#b8d9c4`, texto `#3d5a45` |
| `.tagInactivo` | Etiqueta estado Inactivo | fondo `#f0f2f4`, texto `#6b7a85` |
| `.exceptionBanner` | Banner de advertencia/danger | fondo `#e4cdcd`, borde `#c99a9a`, texto `#4d2e2e` |
| `.helpInfoAlert` | Mensajes informativos (Para qué sirve / guías operativas) | fondo `#1f2b3d`, borde `#2f3f56`, texto `#ffffff`, ícono `#8fd3ff` |
| `.exceptionListBox` | Lista dentro de sección danger | fondo `#ecd8d8`, borde `#c99a9a` |
| `.btnPrimary` | Botón principal | fondo `#5a6c7d` |
| `.btnSecondary` | Botón secundario | borde `#d8dde4`, texto `#5a6b7a` |
| `.infoBanner` | Banner informativo (modo migración, etc.) | fondo `#f2f4f6`, borde `#e4e8ec`, texto `#4a5a68` |
| `.configTable` | Tabla de configuración (permisos, roles) | Mismos estilos que `.usersTable` |
| `.appSelector` | Selector de aplicación (Roles: KPITAL/TimeWise) | Contenedor + `.appSelectorLabel`, `.appSelectorButtons`, `.appSelectorDesc` |

**Regla:** Al crear nuevos componentes de configuración, alertas o etiquetas de estado, usar estos valores. No inventar colores.

### Regla Global de Mensajes Informativos

- Todo mensaje informativo de producto (por ejemplo "Para qué sirve") debe usar la clase `.helpInfoAlert`.
- Debe verse en formato dark: fondo `#1f2b3d`, texto blanco y borde `#2f3f56`.
- La clase fuerza color blanco en todos los descendientes para evitar letras en negro por herencia de estilos de AntD.

---

## Reglas de Uso de Ant Design

### Qué SÍ hacer

1. **Usar componentes base de AntD directamente:** `Button`, `Table`, `Form`, `Modal`, `Select`, `Input`, `DatePicker`, `Tabs`, `Card`, `Badge`, `Avatar`, `Tag`, `Space`, `Typography`, `Layout`, `Menu`.
2. **Envolver componentes cuando se necesite personalización recurrente:** `KpButton`, `KpTable` ya existen como wrappers extensibles.
3. **Usar CSS Modules (`.module.css`) para estilos específicos de componente.**
4. **Usar exclusivamente la Paleta RRHH** para colores. No inventar colores fuera de ella.
5. **Consultar `UsersManagementPage.module.css`** como referencia de clases y valores hex.

### Qué NO hacer

1. **No usar colores fuertes ni llamativos.** Evitar azul brillante (`#1677ff`), verde fuerte (`#52c41a`), rojos saturados.
2. **No poner lógica de negocio en componentes UI.** Un `KpTable` no decide qué datos mostrar. Recibe datos procesados.
3. **No mezclar frameworks.** Si AntD tiene un `Select`, no uses `react-select`. Si AntD tiene un `Modal`, no hagas uno custom con CSS.
4. **No sobreescribir estilos globales de AntD con `!important`.** Usar tokens del tema o CSS Modules.
5. **No hardcodear colores fuera de la Paleta RRHH.** Usar los hex documentados en este documento.

---

## Iconos

Se integraron múltiples bibliotecas de íconos para flexibilidad:

| Biblioteca | Uso | Carga |
|-----------|-----|-------|
| **Ant Design Icons** (`@ant-design/icons`) | Header, botones, acciones | Import directo en JS |
| **Tabler Icons** | Sidebar | CSS font (`tabler-icons.min.css`) |
| **Phosphor Icons** | Complementario | CSS font (`phosphor/duotone/style.css`) |
| **Feather Icons** | Complementario | CSS font (`feather.css`) |
| **Font Awesome** | Complementario | CSS font (`fontawesome.css`) |
| **Material Icons** | Complementario | CSS font (`material.css`) |

Los CSS de fuentes de íconos se cargan desde `public/assets/fonts/` en `index.html`.

---

## Tipografía

**Google Fonts: Public Sans** — Cargada desde CDN en `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Aplicada globalmente en `index.css` y en el tema de AntD (`fontFamily`).

---

## Archivos Generados

| Archivo | Propósito |
|---------|-----------|
| `src/config/theme.ts` | Tokens corporativos KPITAL (colores, tipografía, radios) |
| `src/providers/AntDConfigProvider.tsx` | ConfigProvider dinámico (tema + locale) |
| `src/components/ui/KpButton.tsx` | Wrapper de Button (extensible) |
| `src/components/ui/KpTable.tsx` | Wrapper de Table (paginación por defecto) |

---

## Orden de Ejecución (Cumplido)

1. Instalar `antd` + `@ant-design/icons`
2. Crear `theme.ts` con tokens corporativos
3. Crear `AntDConfigProvider.tsx` conectado a Theme y Locale contexts
4. Integrar en `Providers.tsx` como wrapper
5. Crear componentes envueltos (`KpButton`, `KpTable`)
6. Migrar layout a componentes AntD (`Layout`, `Menu`, etc.)
