# Arquitectura de State Management  KPITAL 360

**Versin:** 1.0  
**Fecha:** 2025-02-21  
**Estado:** Referencia tcnica  Frontend  
**Relacin:** Complementa [01-EnfoqueSistema.md](./01-EnfoqueSistema.md)

---

## Regla general de separacin

| Tipo de Estado | Herramienta | Ejemplos |
|----------------|-------------|----------|
| **Server state** (datos del backend) | TanStack Query | Empleados, planillas, acciones, listados, reportes |
| **Client state global complejo** | Redux Toolkit | Sesin, permisos, roles, mens dinmicos, empresa activa, flujos de aprobacin en curso |
| **Client state local de baja frecuencia** | Context API | Theme, locale, configuracin de UI |
| **Client state local de componente** | useState / useReducer | Filtros de tabla, modals, formularios en progreso |

---

## Boundaries explcitas (sin ambigedad)

### Va en Redux

- Empresa activa seleccionada
- Permisos del usuario para la empresa activa
- Roles activos
- Mens dinmicos (derivados de permisos)
- Sesin / usuario autenticado
- Flujos de aprobacin en curso (wizard multi-paso que cruza pantallas)
- Estado de navegacin global que afecta mltiples mdulos

### Va en TanStack Query

- Cualquier dato que venga del backend (CRUD, listados, reportes)
- Cache de empleados, planillas, acciones de personal
- Datos de empresas (para selectores, listados)
- Resultados de bsquedas y filtros que dependen del servidor

### Va en Context API

- Theme (claro/oscuro)
- Locale (idioma)
- Configuracin de UI que no afecta lgica de negocio

### Va en useState / useReducer

- Filtros de tabla (antes de enviar al servidor)
- Modals abiertos/cerrados
- Formularios en progreso que no se comparten entre rutas
- Estado de expansin de acordeones, tabs activos

### Regla de decisin rpida

> **Viene del backend?**  TanStack Query  
> **Se comparte entre mltiples rutas/componentes?**  Redux (si es complejo) o Context (si es simple)  
> **Solo vive en un componente?**  useState

---

## Estructura de Redux

### Slices por dominio funcional

```
store/
 slices/
    authSlice.ts        # Sesin, usuario autenticado
    permissionsSlice.ts # Permisos del usuario para empresa activa
    menuSlice.ts        # Mens dinmicos (derivados de permisos)
    activeCompanySlice.ts # Empresa activa seleccionada
 middleware/
    companyChangeListener.ts  # Escucha cambio de empresa  dispara invalidacin
 selectors/
    permissions.selectors.ts  # Selectors derivados: canCreatePayroll, canApproveAction, etc.
    menu.selectors.ts         # Selectors: getVisibleMenuItems (basado en permisos)
 store.ts
 hooks.ts
```

### Reglas de Redux

- **Un slice por dominio funcional.** No un slice por "feature" ni por bounded context del backend. Dominio = responsabilidad cohesiva (auth, permisos, men, empresa activa).
- **Selectors derivados para lgica permisos  mens.** Nunca computar "qu men mostrar" dentro del componente. El selector `getVisibleMenuItems(permissions)` vive en `menu.selectors.ts` y se alimenta de `permissionsSlice`.
- **Middleware listener** para reaccionar a cambios cross-slice (ej: cambio de empresa  reset de contexto, invalidacin de queries).

---

## Estructura de TanStack Query

### Custom hooks por entidad de dominio

```
queries/
 employees/
    useEmployees.ts
    useEmployee.ts
    keys.ts
 payrolls/
    usePayrolls.ts
    usePayroll.ts
    keys.ts
 personal-actions/
    usePersonalActions.ts
    usePersonalAction.ts
    keys.ts
 companies/
    ...
 client.ts
```

### Query keys  empresa activa siempre presente

```typescript
// Patrn obligatorio
['employees', companyId, filters]
['payrolls', companyId, period]
['personal-actions', companyId, status]
```

- **Primer segmento:** entidad de dominio.
- **Segundo segmento:** `companyId` (empresa activa). Si no aplica, usar `'global'` explcitamente.
- **Siguientes segmentos:** filtros, IDs, etc.

### Reglas de TanStack Query

- **Custom hooks por entidad:** `useEmployees()`, `usePayrolls()`, `usePersonalActions()`.
- **Query keys centralizados** en `keys.ts` por dominio. Nunca strings dispersos en componentes.
- **Mutations con `onSuccess`** que invalidan queries relacionados.
- **QueryClient** configurado con defaults: `staleTime`, `retry`, `onError` global.

---

## Regla de sincronizacin Redux  TanStack

| Direccin | Regla |
|-----------|-------|
| **Redux dispara, TanStack reacciona.** | Siempre. Nunca al revs. |
| Cambio de empresa activa (Redux) |  `queryClient.invalidateQueries()` global |
| Permisos cambian (Redux) |  No invalida queries. Los datos siguen vlidos; solo cambia qu se muestra. |
| Datos del servidor |  Nunca se duplican en Redux. Si viene del backend, vive en TanStack. |

### Implementacin del listener

```typescript
// companyChangeListener.ts (middleware)
// Al detectar cambio en activeCompanySlice:
// 1. queryClient.invalidateQueries()  todas las queries
// 2. Opcional: dispatch(resetFilters()) si hay filtros globales por empresa
```

---

## Manejo de estado derivado y permisos

### Principio

> **"Si el usuario no tiene permiso X, el men no muestra Y"** = estado derivado.

### Resolucin

- **Selectors de Redux** computan `getVisibleMenuItems(permissions)`.
- **No** computar en el componente con `useMemo` + permisos.
- **No** middleware que modifica men directamente  el men es derivado de permisos va selector.
- Si se requiere reaccin cross-slice compleja (ej: "al cambiar permisos, cerrar modals de acciones no permitidas"), usar **middleware listener** que despacha acciones, no que muta estado.

### Flujo

```
permissionsSlice (source of truth)
        
menu.selectors.ts  getVisibleMenuItems(state)
        
Componente NavBar usa selector  renderiza solo tems permitidos
```

---

## Poltica de invalidacin

| Evento | Accin |
|--------|--------|
| Cambio de empresa activa | `invalidateQueries()`  todas las queries |
| Mutacin: crear accin de personal | `invalidateQueries({ queryKey: ['personal-actions', companyId] })` |
| Mutacin: aplicar planilla | `invalidateQueries({ queryKey: ['payrolls', companyId] })` + queries de reportes si aplica |
| Logout | `queryClient.clear()` + dispatch logout en Redux |

---

## Orden de implementacin

1. Configurar store Redux con `authSlice` + `permissionsSlice` + `activeCompanySlice`.
2. Implementar `menuSlice` con selectors derivados de permisos.
3. Configurar `QueryClient` con defaults (`staleTime`, `retry`, `error handling` global).
4. Implementar hooks de TanStack por dominio con query keys que incluyan `companyId`.
5. Conectar middleware: cambio de empresa  invalidacin de queries.

---

## Convenciones de archivos

| Elemento | Ubicacin |
|----------|-----------|
| Slices Redux | `store/slices/` |
| Selectors | `store/selectors/` |
| Custom hooks TanStack | `queries/<dominio>/` |
| Query keys | `queries/<dominio>/keys.ts` |
| QueryClient config | `queries/client.ts` |
| Hooks de Redux (typed) | `store/hooks.ts` |

---

## Resumen ejecutivo

Esta arquitectura elimina ambigedad:

- **Qu herramienta usar** para cada tipo de estado.
- **Dnde va cada cosa** (Redux vs TanStack vs Context vs useState).
- **Cmo se conectan** (Redux dispara, TanStack reacciona; invalidacin al cambiar empresa).
- **En qu orden implementar** (auth  permisos  men  QueryClient  hooks  middleware).

Cualquier desviacin debe documentarse y justificarse.
