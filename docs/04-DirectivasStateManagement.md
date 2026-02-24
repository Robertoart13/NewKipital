# KPITAL 360 — Directivas de State Management

**Documento:** 04  
**Para:** Ingeniero Frontend  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Proyecto:** KPITAL 360 — ERP Multiempresa  
**Prerrequisito:** Haber leído [01-EnfoqueSistema.md](./01-EnfoqueSistema.md) + [03-ArquitecturaStateManagement.md](./03-ArquitecturaStateManagement.md)  
**Prioridad:** Ejecutar en orden. No saltar pasos.

---

## Qué Pidió Roberto (Textual)

> "Vas a integrar TanStack Query para server state, Redux Toolkit para client state complejo, y Context API para theme e idioma. La separación tiene que ser precisa: definí las boundaries, la política de invalidación, la estructura de carpetas, y el manejo de estados derivados y middleware. Ejecutá en orden."

Roberto evaluó la primera versión de la instrucción con un **7.5/10** y proporcionó feedback detallado:

1. **Faltaban boundaries precisas** (-1.0): "¿La empresa activa va en Redux o en Context? ¿Los filtros de tabla son TanStack o useState?" → Sin reglas claras, cada dev toma decisiones distintas.
2. **Faltaba política de invalidación y sincronización** (-0.5): "El usuario cambia de empresa activa (Redux) → todos los queries de TanStack deben invalidarse. ¿Cómo?"
3. **Faltaba estructura de carpetas/convenciones** (-0.5): "¿Un slice por bounded context? ¿Un slice por feature? ¿Dónde viven los custom hooks de TanStack?"
4. **Faltaba manejo de estados derivados y middleware** (-0.5): "Si el usuario no tiene permiso X, el menú no muestra Y. ¿Selectors? ¿Middleware?"

---

## Decisión Arquitectónica (No Negociable)

Tres herramientas para manejar estado. No una. Tres.

| Herramienta | Responsabilidad | Ejemplos |
|-------------|-----------------|----------|
| **TanStack Query** | Todo lo que venga del backend | Empleados, planillas, acciones, listados, reportes |
| **Redux Toolkit** | Estado global complejo del cliente | Sesión, permisos, roles, menús dinámicos, empresa activa, flujos de aprobación |
| **Context API** | Solo theme e idioma | ThemeContext (light/dark), LocaleContext (es/en) |
| **useState / useReducer** | Estado local de componente | Filtros de tabla, modals, formularios en progreso |

### Regla de decisión rápida

> **¿Viene del backend?** → TanStack Query  
> **¿Se comparte entre múltiples rutas?** → Redux (si es complejo) o Context (si es simple)  
> **¿Solo vive en un componente?** → useState

---

## Paso 1 — Store Redux (4 slices)

1. **authSlice** — Login, logout, usuario autenticado, token. Logout limpia los demás slices.
2. **activeCompanySlice** — Empresa activa (ID, nombre, frecuencia de pago, moneda). Un usuario puede estar en múltiples empresas.
3. **permissionsSlice** — Permisos del usuario para la empresa activa. Se recargan al cambiar empresa.
4. **menuSlice** — Configuración maestra del menú. La visibilidad se deriva vía selectors, no se modifica el menú directamente.

### Selectors derivados

- `getVisibleMenuItems(state)` — filtra el menú header según permisos
- `getVisibleSidebarGroups(state)` — filtra el sidebar según permisos
- `hasPermission(state, permission)` — verificación puntual
- `canCreatePayroll(state)`, `canApprovePersonalAction(state)` — atajos por módulo

### Middleware

- `companyChangeListener` — Escucha `setActiveCompany` → recarga permisos + invalida queries de TanStack
- Escucha `logout` → limpia permisos, empresa, `queryClient.clear()`

---

## Paso 2 — TanStack Query

- **staleTime:** 5 minutos
- **retry:** 2
- **refetchOnWindowFocus:** activado
- **Error handling global** en `QueryCache.onError`
- Query keys con `companyId` como segundo segmento: `['employees', companyId, filters]`
- Custom hooks por entidad: `useEmployees()`, `usePayrolls()`, `usePersonalActions()`
- Mutations con `onSuccess` que invalidan queries relacionados

---

## Paso 3 — Context API

- **ThemeContext** — `toggleTheme()` alterna entre light y dark
- **LocaleContext** — `setLocale('es' | 'en')` cambia idioma

No se pone nada más en Context. Si crece, se mueve a Redux.

---

## Paso 4 — Sincronización Redux ↔ TanStack

| Dirección | Regla |
|-----------|-------|
| Redux dispara, TanStack reacciona | **Siempre. Nunca al revés.** |
| Cambio de empresa activa (Redux) | → `queryClient.invalidateQueries()` global |
| Permisos cambian (Redux) | → No invalida queries. Solo cambia qué se muestra. |
| Datos del servidor | → Nunca se duplican en Redux. Si viene del backend, vive en TanStack. |
| Logout | → `queryClient.clear()` + dispatch limpieza de Redux |

---

## Paso 5 — Orden de Implementación (Ejecutado)

| Paso | Qué | Archivo(s) |
|------|-----|-----------|
| 5.1 | Store + authSlice | `store/store.ts`, `store/slices/authSlice.ts` |
| 5.2 | activeCompanySlice | `store/slices/activeCompanySlice.ts` |
| 5.3 | permissionsSlice + selectors | `store/slices/permissionsSlice.ts`, `store/selectors/permissions.selectors.ts` |
| 5.4 | menuSlice + selector | `store/slices/menuSlice.ts`, `store/selectors/menu.selectors.ts` |
| 5.5 | QueryClient + useEmployees | `queries/queryClient.ts`, `queries/employees/` |
| 5.6 | Middleware companyChange | `store/middleware/companyChangeListener.ts` |
| 5.7 | Hooks restantes | `queries/payrolls/`, `queries/personal-actions/`, `queries/companies/` |

---

## Archivos Generados

```
store/
├── slices/authSlice.ts
├── slices/permissionsSlice.ts
├── slices/activeCompanySlice.ts
├── slices/menuSlice.ts
├── selectors/permissions.selectors.ts
├── selectors/menu.selectors.ts
├── selectors/sidebar.selectors.ts
├── middleware/companyChangeListener.ts
├── store.ts
├── hooks.ts (useAppDispatch, useAppSelector)
└── index.ts

queries/
├── queryClient.ts
├── employees/ (useEmployees, useEmployee, keys)
├── payrolls/ (usePayrolls, usePayroll, keys)
├── personal-actions/ (usePersonalActions, usePersonalAction, keys)
└── companies/ (useCompanies, keys)

contexts/
├── ThemeContext.tsx
└── LocaleContext.tsx

providers/
└── Providers.tsx (Redux + TanStack + Theme + Locale + AntD)
```

---

**Referencia técnica detallada:** [03-ArquitecturaStateManagement.md](./03-ArquitecturaStateManagement.md)

---

## Actualizacion Operativa (2026-02-24) - Robustez de Permisos

Regla obligatoria para desarrollo futuro:

1. No recargar permisos si no hubo cambio real de contexto (`app` o `company`).
2. Si una recarga de permisos falla por error transitorio de red/API, no sobrescribir permisos actuales con `[]`.
3. Limpiar permisos solo por eventos de seguridad explicitos: `logout`, `401` final no recuperable, o sesion no autenticada.
4. El frontend controla visibilidad de UI, pero la autorizacion final siempre se valida en backend.
5. El token de sesion no se guarda en Redux/localStorage/sessionStorage; permanece en cookie `httpOnly`.

Riesgo que evita:

- 403 falso positivo despues de restaurar sesion por condiciones de carrera entre requests concurrentes.
