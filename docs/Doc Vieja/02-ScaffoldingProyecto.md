# KPITAL 360 — Scaffolding del Proyecto

**Documento:** 02  
**Para:** Cualquier ingeniero que se incorpore  
**De:** Roberto — Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber leído [01-EnfoqueSistema.md](./01-EnfoqueSistema.md)

---

## Contexto

El proyecto KPITAL 360 empezó **completamente desde cero**. No hay código previo, no hay base de datos existente, no hay sistema legacy del que migrar. El documento `01-EnfoqueSistema.md` define la visión arquitectónica, pero no existía ni una línea de código.

---

## Decisión: Dos Proyectos Independientes

Se decidió crear **dos proyectos completamente separados**, cada uno con su propio repositorio, dependencias y ciclo de vida:

| Proyecto | Stack | Carpeta | Puerto |
|----------|-------|---------|--------|
| **Frontend** | React + Vite + TypeScript | `frontend/` | 5173 |
| **API** | NestJS + TypeScript | `api/` | 3000 |

### Por qué dos proyectos separados

1. **Despliegue independiente:** El frontend se puede desplegar como SPA estática sin depender del API.
2. **Equipos independientes:** Un ingeniero puede trabajar en el frontend sin tocar el API y viceversa.
3. **Escalado independiente:** El API puede escalar horizontalmente sin afectar al frontend.
4. **Alineación con 01-EnfoqueSistema.md:** El documento define bounded contexts que se implementan en el API; el frontend es un consumidor.

---

## Frontend — React + Vite + TypeScript

### Generación

```bash
npm create vite@latest frontend -- --template react-ts
```

### Dependencias instaladas

| Paquete | Propósito |
|---------|-----------|
| `react`, `react-dom` | Core de React |
| `@reduxjs/toolkit`, `react-redux` | State management global |
| `@tanstack/react-query` | Server state / data fetching |
| `antd`, `@ant-design/icons` | Framework UI |
| `react-router-dom` | Enrutamiento SPA |

### Estructura base generada

```
frontend/
├── public/
│   └── assets/
│       ├── images/global/LogoLarge.png    # Logo corporativo
│       └── fonts/                          # Íconos (Tabler, Phosphor, Feather, FA, Material)
├── src/
│   ├── store/                # Redux Toolkit (slices, selectors, middleware)
│   ├── queries/              # TanStack Query (hooks por dominio)
│   ├── config/               # Tema, catálogo de menú, íconos
│   ├── components/ui/        # Componentes UI (AppLayout, AppHeader, Sidebar)
│   ├── providers/            # Providers (Redux, TanStack, AntD, Theme, Locale)
│   ├── contexts/             # Context API (Theme, Locale)
│   ├── api/                  # Funciones de llamada al backend (placeholder)
│   ├── selectors/            # Re-exports de selectors
│   ├── App.tsx               # Componente raíz
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globales
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## API — NestJS

### Generación

```bash
npx @nestjs/cli new api
```

### Estado actual

Scaffolding básico de NestJS. Sin módulos, sin controladores adicionales, sin base de datos configurada. Archivos:

```
api/src/
├── main.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── app.controller.spec.ts
```

### Pendiente

- Configuración de base de datos (PostgreSQL + Supabase según 01-EnfoqueSistema.md)
- Módulos por bounded context
- Autenticación JWT
- Guards de permisos
- Endpoints CRUD por dominio

---

## Decisiones Técnicas Tomadas en Esta Fase

| Decisión | Justificación |
|----------|---------------|
| Vite en lugar de CRA o Next.js | SPA pura, no necesita SSR. Vite es rápido y ligero. |
| TypeScript obligatorio en ambos proyectos | Seguridad de tipos, autocompletado, refactoring seguro. |
| NestJS en lugar de Express puro | Estructura modular, decoradores, inyección de dependencias. Alineado con bounded contexts. |
| Proyectos en la misma carpeta raíz | Facilita desarrollo local. En producción se despliegan por separado. |

---

## Notas

- **TimeWise** se mencionó en `01-EnfoqueSistema.md` pero fue explícitamente excluido del alcance. Es un sistema diferente.
- El frontend está significativamente más avanzado que el API porque las directivas hasta ahora se han enfocado en la estructura visual y de estado del frontend.
