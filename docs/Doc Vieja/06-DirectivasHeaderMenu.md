# KPITAL 360 — Directivas del Header + Menú Principal

**Documento:** 06  
**Para:** Ingeniero Frontend  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [04-DirectivasStateManagement.md](./04-DirectivasStateManagement.md) + [05-IntegracionAntDesign.md](./05-IntegracionAntDesign.md)

---

## Qué Pidió Roberto (Textual)

> "Construir el header exactamente como el mock: Barra superior blanca, limpia, corporativa. Logo + nombre del sistema a la izquierda. Menú horizontal principal debajo del logo. Íconos + texto en cada opción del menú. Dropdown en cada opción principal. A la derecha: campana con badge y avatar de usuario. Diseño minimalista, serio y empresarial. No estoy definiendo las opciones del menú todavía. Solo la estructura."

Roberto proporcionó un mockup de referencia visual y dio instrucciones de diseño enterprise específicas.

---

## Estructura Obligatoria: Header de 2 Niveles

### Nivel 1 (Superior)

| Izquierda | Derecha |
|-----------|---------|
| Logo corporativo (`LogoLarge.png`) | Campana de notificaciones con Badge + Avatar de usuario |

- Logo: imagen real desde `/assets/images/global/LogoLarge.png`, altura 64px
- Notificaciones: `Badge` de AntD con contador, color verde (`#52c41a`)
- Avatar: `Avatar` de AntD con inicial del nombre

### Nivel 2 (Inferior)

Menú horizontal principal con dropdowns.

- Cada opción del menú top-level puede tener `children` (submenú dropdown)
- Los submenús pueden tener hijos anidados (multi-nivel)
- Ícono + texto en cada opción
- Hover sutil, activo con línea inferior

---

## Reglas de Diseño Enterprise

| Regla | Detalle |
|-------|---------|
| Fondo | Blanco (`#fff`), borde inferior `1px solid #f0f0f0` |
| Altura | Compacta — no más de lo necesario |
| Tipografía | Public Sans, limpia, sin bold excesivo |
| Sombras | Sin sombras exageradas. Máximo `box-shadow: 0 1px 2px rgba(0,0,0,0.03)` |
| Colores | Sin colores llamativos. Azul corporativo solo para activo. |
| Hover | Sutil — cambio de color de texto, no de fondo |
| Activo | Línea inferior azul + color de texto azul |
| Sensación | Corporativo, serio. No SaaS juvenil. No dashboard de startup. |

---

## Regla Arquitectónica (No Negociable)

> **El menú no se hardcodea. Se construye desde una estructura de datos (array/objeto).**

El menú es **data-driven**:

1. La configuración vive en Redux (`menuSlice.ts`)
2. Un selector (`getVisibleMenuItems`) filtra por permisos
3. El componente `MainMenu` recibe la lista ya filtrada y la renderiza
4. El componente **no** filtra. Solo renderiza lo que le llega.

### Soporte requerido

- Submenús multinivel (dropdown dentro de dropdown)
- Permisos por opción (`requiredPermission`)
- Íconos mapeados por ID (`menuIcons.tsx`)
- Detección de opción activa por ruta actual (`useLocation`)
- `useMemo` para evitar recálculos innecesarios

---

## Logo

Roberto proporcionó la imagen del logo corporativo. Se colocó en:

```
frontend/public/assets/images/global/LogoLarge.png
```

Se ajustó la altura del logo iterativamente hasta llegar a **64px** para que coincidiera con el mockup de referencia.

---

## Componentes Generados

| Componente | Archivo | Responsabilidad |
|-----------|---------|-----------------|
| `AppHeader` | `components/ui/AppHeader/AppHeader.tsx` | Compone los 2 niveles del header |
| `Logo` | `components/ui/AppHeader/Logo.tsx` | Renderiza el logo corporativo |
| `HeaderActions` | `components/ui/AppHeader/HeaderActions.tsx` | Notificaciones + Avatar |
| `MainMenu` | `components/ui/AppHeader/MainMenu.tsx` | Menú horizontal data-driven con submenús |
| Estilos | `components/ui/AppHeader/AppHeader.module.css` | CSS Module del header completo |

---

## No Hacer

- **No hardcodear** opciones de menú en JSX
- **No mezclar** layout con lógica de negocio
- **No usar sidebar** para el menú principal (el sidebar es el catálogo de módulos, ver documento 07)
- **No diseñar** de forma improvisada — seguir el mock
- **No usar** estilos inline excesivos — CSS Modules
