# Manual Tecnico - API y Contratos

## Contrato de respuesta esperado
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "error": null
}
```

## Endpoints funcionales principales

### Auth
| Endpoint | Uso |
|---|---|
| `POST /auth/login` | Iniciar sesion |
| `POST /auth/refresh` | Renovar sesion |
| `POST /auth/logout` | Cerrar sesion |
| `GET /auth/me` | Sesion, roles y permisos |
| `POST /auth/switch-company` | Cambiar contexto empresa/app |

### Empresas
| Endpoint | Permiso |
|---|---|
| `POST /companies` | `company:create` |
| `GET /companies` | `company:view` |
| `PUT /companies/:id` | `company:edit` |
| `PATCH /companies/:id/inactivate` | `company:inactivate` |
| `PATCH /companies/:id/reactivate` | `company:reactivate` |

### Empleados
| Endpoint | Permiso |
|---|---|
| `POST /employees` | `employee:create` |
| `GET /employees` | `employee:view` |
| `PUT /employees/:id` | `employee:edit` + `employee:view-sensitive` |
| `PATCH /employees/:id/inactivate` | `employee:inactivate` |
| `PATCH /employees/:id/reactivate` | `employee:reactivate` |
| `PATCH /employees/:id/liquidar` | `employee:edit` + `employee:view-sensitive` |

### Planilla
| Endpoint | Permiso |
|---|---|
| `POST /payroll` | `payroll:create` |
| `PATCH /payroll/:id` | `payroll:edit` |
| `PATCH /payroll/:id/process` | `payroll:process` |
| `PATCH /payroll/:id/verify` | `payroll:verify` |
| `PATCH /payroll/:id/apply` | `payroll:apply` |
| `PATCH /payroll/:id/reopen` | `payroll:edit` |

### Acciones de personal
- Base: `GET/POST /personal-actions`
- Por tipo: `POST/PATCH /personal-actions/{tipo}`
- Avance: `PATCH /personal-actions/{tipo}/:id/advance`
- Invalida: `PATCH /personal-actions/{tipo}/:id/invalidate`

### Traslado interempresa
- `POST /payroll/intercompany-transfer/simulate`
- `POST /payroll/intercompany-transfer/execute`
- Permiso: `payroll:intercompany-transfer`

## Codigos HTTP
- `200`, `201`: exito
- `400`: validacion
- `401`: no autenticado
- `403`: sin permiso
- `404`: no encontrado
- `409`: conflicto de negocio
- `422`: entidad no procesable
- `500`: error interno

## Ver tambien
- [Catalogo API funcional](../16-enterprise-operacion/03-CATALOGO-API-FUNCIONAL.md)
- [Matriz CRUD por modulo](./08-MATRIZ-CRUD-POR-MODULO.md)
