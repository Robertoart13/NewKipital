# 🛠️ Manual Tecnico - Stack y Arquitectura

## 🎯 Stack base
- Frontend: React + Vite + TypeScript + Ant Design
- Estado FE: Redux Toolkit + TanStack Query
- Backend: NestJS + TypeORM
- Base de datos: MySQL
- Seguridad: JWT + cookies httpOnly + CSRF token + control de permisos por app/empresa

## 🔄 System Map Global (Vista End-to-End)
```mermaid
flowchart LR
  subgraph U[Usuarios]
    U1[RRHH]
    U2[Supervisor]
    U3[Finanzas]
    U4[Master]
  end

  subgraph FE[Frontend KPITAL]
    F1[Login / Seleccion de empresa]
    F2[Configuracion]
    F3[Empleados]
    F4[Acciones Personal]
    F5[Planilla]
    F6[Monitoreo]
  end

  subgraph API[NestJS API]
    A1[Auth + Authz]
    A2[Companies]
    A3[Employees Workflow]
    A4[Personal Actions]
    A5[Payroll Engine]
    A6[Config Access]
    A7[Audit Outbox]
    A8[Domain Events]
  end

  subgraph DB[MySQL]
    D1[(sys_usuarios / authz)]
    D2[(sys_empresas)]
    D3[(sys_empleados cifrado)]
    D4[(nom_acciones_personal)]
    D5[(nom_calendarios_nomina)]
    D6[(auditoria)]
  end

  U1 --> F3
  U2 --> F4
  U3 --> F5
  U4 --> F2

  F1 --> A1
  F2 --> A6
  F3 --> A3
  F4 --> A4
  F5 --> A5
  F6 --> A7

  A1 --> D1
  A2 --> D2
  A3 --> D3
  A4 --> D4
  A5 --> D5
  A7 --> D6
  A8 --> D6

  A3 --> A7
  A4 --> A7
  A5 --> A7
  A5 --> A8
```

## 🎯 Arquitectura funcional
```mermaid
flowchart LR
  FE[Frontend React] --> API[NestJS API]
  API --> DB[(MySQL)]
  API --> AUTH[Auth/Authz]
  API --> AUD[Audit outbox]
  API --> EVT[Domain events]
```

## 🔄 Flujo de autenticacion y autorizacion
1. Login (`/auth/login` o Microsoft).
2. API emite access token + refresh token + csrf.
3. FE consulta `/auth/me` para sesion y permisos.
4. FE cambia contexto con `/auth/switch-company`.
5. Backend resuelve permisos efectivos por usuario+empresa+app.

## 🔗 Rutas de este manual tecnico
1. [Reglas tecnicas](./01-REGLAS-TECNICAS.md)
2. [Seguridad y permisos](./02-SEGURIDAD-PERMISOS.md)
3. [Datos y BD](./03-DATOS-Y-BD.md)
4. [API y contratos](./04-API-CONTRATOS.md)
5. [QA y testing](./05-QA-Y-TESTING.md)
6. [Pendientes tecnicos](./06-PENDIENTES-TECNICOS.md)
7. [Operacion por modulo](./07-OPERACION-POR-MODULO.md)
8. [Matriz CRUD por modulo](./08-MATRIZ-CRUD-POR-MODULO.md)
9. [Manejo de incidentes](./09-MANEJO-INCIDENTES-FUNCIONALES.md)
10. [Herramientas y estandares](./10-HERRAMIENTAS-Y-ESTANDARES.md)
11. [Modulo Reglas de Distribucion](./11-MODULO-REGLAS-DISTRIBUCION.md)
