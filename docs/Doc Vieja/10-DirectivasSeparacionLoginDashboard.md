# KPITAL 360  Directivas de Separacin Login / Dashboard

**Documento:** 10  
**Para:** Ingeniero Frontend  
**De:** Roberto  Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber ledo [04-DirectivasStateManagement.md](./04-DirectivasStateManagement.md)  
**Prioridad:** Ejecutar en orden. No saltar pasos.

---

## Qu Pidi Roberto (Principio Fundamental)

> "El Login y el Dashboard son dos aplicaciones distintas que comparten el mismo proyecto. No comparten layout, no comparten navegacin, no comparten estructura visual. El usuario entra por una puerta (Login) y cuando se autentica, pasa a otro mundo (Dashboard). Son dos experiencias completamente separadas."

> "El Login es el lobby del edificio. El Dashboard es el piso de oficinas."

---

## Arquitectura de Dos Mundos

### Public Layout (Login)

- Sin header, sin men, sin navegacin
- Pantalla limpia: logo, formulario, nada ms
- No consume Redux, no sabe que el dashboard existe
- Futuro: forgot-password, primer ingreso, cuenta bloqueada

### Private Layout (Dashboard)

- Header con men dinmico (construido desde permisos)
- rea de contenido donde se renderizan los mdulos
- Acceso completo al store de Redux
- **No se renderiza JAMS si el usuario no est autenticado**

---

## Guards de Ruta (Cascada Enterprise)

### PublicGuard

Ya autenticado?  Redirigir a Dashboard. No mostrar login.

### PrivateGuard  Cascada de 3 pasos

```
Autenticado?  Permisos cargados?  Empresa seleccionada?  Dashboard
       No               No                     No
   /login           Loading...          /select-company
```

No se renderiza el dashboard hasta que las 3 condiciones se cumplan.

---

## Flujos Implementados

### Login

1. Usuario ingresa credenciales en `/login`
2. Backend devuelve token + datos  localStorage + authSlice
3. Si tiene empresa guardada  auto-seleccionar  dashboard
4. Si no  pantalla de seleccin de empresa
5. Si haba URL guardada (redirected from)  ir ah

### Seleccin de empresa

- Post-login, pre-dashboard
- Lista de empresas accesibles
- Al seleccionar  setActiveCompany + cargar permisos  dashboard
- Si solo tiene 1 empresa  auto-seleccionar (futuro)

### Logout (Orquestado)

Un solo punto de ejecucin (`performLogout`):
1. `dispatch(logout())`  middleware limpia permisos + empresa + queryClient
2. `clearStorage()`  elimina token + companyId de localStorage
3. Redirigir a `/login`

### Token expirado (401)

- `httpInterceptor` detecta 401 en cualquier request
- Ejecuta mismo flujo de logout
- Guarda URL actual para re-login
- Redirige a `/login`

---

## Persistencia

| Dato | Se persiste | Dnde |
|------|-------------|-------|
| Token | Si | localStorage |
| Company ID | Si | localStorage |
| Permisos | **NO**  siempre del backend |  |
| Men | **NO**  derivado de permisos |  |
| Datos TanStack | **NO**  se refetchean |  |

---

## Estructura de Archivos Generados

```
src/
 layouts/
    PublicLayout.tsx          # Layout limpio para login
    PrivateLayout.tsx         # Layout con header + content
    index.ts
 guards/
    PublicGuard.tsx           # Redirige si autenticado
    PrivateGuard.tsx          # Cascada: auth  permisos  empresa
    index.ts
 pages/
    public/
       LoginPage.tsx         # Formulario de login
    private/
       DashboardPage.tsx     # Pgina principal (placeholder)
    CompanySelectionPage.tsx  # Seleccin de empresa (intermedia)
 router/
    AppRouter.tsx             # Config de rutas pblicas/privadas
 lib/
    storage.ts                # Claves y helpers de localStorage
    auth.ts                   # performLogout orquestado
 interceptors/
    httpInterceptor.ts        # Interceptor 401 global
```

---

## Anti-Patterns Que Se Evitaron

| Anti-pattern | Qu se hizo en cambio |
|-------------|----------------------|
| Un solo layout con `if(auth)` | Dos layouts completamente separados |
| Dashboard antes de tener permisos | Cascada en PrivateGuard |
| Permisos en localStorage | Siempre del backend |
| Logout parcial | `performLogout()` orquestado |
| Lgica dispersa en componentes | Un flujo controlado en guards + router |

---

## Conexin con State Management

| Momento | Redux | TanStack |
|---------|-------|----------|
| Login exitoso | `authSlice.setCredentials()` | Nada todava |
| Empresa seleccionada | `activeCompanySlice.setCompany()` | Nada todava |
| Permisos cargados | `permissionsSlice.setPermissions()` | Nada todava |
| Dashboard renderiza | Men se construye (selectors) | Queries empiezan |
| Cambio de empresa | Redux actualiza + permisos | `invalidateQueries()` |
| Logout | Todos los slices limpios | `queryClient.clear()` |
| 401 | Mismo que logout | Mismo que logout |

---

*Este documento complementa las Directivas de State Management.*
