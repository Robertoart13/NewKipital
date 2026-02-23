# KPITAL 360 — Integración de Ant Design

**Documento:** 05  
**Para:** Ingeniero Frontend  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [02-ScaffoldingProyecto.md](./02-ScaffoldingProyecto.md)

---

## Qué Pidió Roberto (Textual)

> "Vas a integrar Ant Design para toda la UI. Primero, instala las dependencias de AntD y asegúrate de que se carguen sus estilos globales. Luego, aplica el tema de Ant Design a nivel de toda la app, personalizando variables si es necesario (por ejemplo, colores corporativos). Usa los componentes base de AntD, como botones, tablas, formularios y modales, pero siempre dentro de un patrón coherente. Si necesitás personalizar o extender componentes, usa clases CSS o componentes envueltos. No generes lógica compleja en los componentes, mantén la lógica en Redux o en los hooks. Así, AntD será la base visual, pero la arquitectura de estado sigue siendo la que definimos (Redux Toolkit y TanStack Query). Ejecuta esto en orden: primero configura AntD, luego los slices, y después los hooks de TanStack. Si hay dudas, revisa la documentación oficial de AntD y ajusta las variables de tema según la identidad corporativa."

---

## Decisiones Tomadas

### Ant Design 5

Se eligió Ant Design versión 5 como framework UI completo para toda la aplicación. No se mezcla con otro framework de componentes (no Bootstrap, no Material UI, no Tailwind para componentes).

### Tema Corporativo

Se definió un tema corporativo en `src/config/theme.ts` con los siguientes tokens:

| Token | Valor | Propósito |
|-------|-------|-----------|
| `colorPrimary` | `#0d6efd` | Azul corporativo KPITAL |
| `borderRadius` | `6` | Bordes suaves pero no exagerados |
| `fontFamily` | `"Public Sans"` | Tipografía corporativa (Google Fonts) |
| `fontSize` | `14` | Tamaño base legible |
| `colorBgContainer` | `#ffffff` | Fondo de contenedores blanco |
| `colorText` | `#262626` | Texto principal oscuro |
| `controlHeight` | `36` | Altura de controles coherente |

### ConfigProvider Dinámico

`AntDConfigProvider.tsx` envuelve toda la app y sincroniza:
- **Tema claro/oscuro** — Lee de `ThemeContext`. Dark mode usa `theme.darkAlgorithm`.
- **Locale** — Lee de `LocaleContext`. Cambia entre `esES` y `enUS` de Ant Design.

---

## Reglas de Uso de Ant Design

### Qué SÍ hacer

1. **Usar componentes base de AntD directamente:** `Button`, `Table`, `Form`, `Modal`, `Select`, `Input`, `DatePicker`, `Tabs`, `Card`, `Badge`, `Avatar`, `Tag`, `Space`, `Typography`, `Layout`, `Menu`.
2. **Envolver componentes cuando se necesite personalización recurrente:** `KpButton`, `KpTable` ya existen como wrappers extensibles.
3. **Usar CSS Modules (`.module.css`) para estilos específicos de componente.**
4. **Usar el sistema de `token` de AntD para colores y espaciado.** No inventar colores fuera del tema.

### Qué NO hacer

1. **No poner lógica de negocio en componentes UI.** Un `KpTable` no decide qué datos mostrar. Recibe datos procesados.
2. **No mezclar frameworks.** Si AntD tiene un `Select`, no uses `react-select`. Si AntD tiene un `Modal`, no hagas uno custom con CSS.
3. **No sobreescribir estilos globales de AntD con `!important`.** Si necesitás cambiar algo, usá los tokens del tema o CSS Modules.
4. **No hardcodear colores inline.** Usá los tokens: `token.colorPrimary`, `token.colorText`, etc.

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
