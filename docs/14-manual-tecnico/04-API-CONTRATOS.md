# 🛠️ Manual Tecnico - API y Contratos

## 🎯 Contrato de respuesta esperado
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "error": null
}
```

## 🎯 Endpoints funcionales principales

### 🎯 Auth
| Endpoint | 📊 Uso |
|---|---|
| `POST /auth/login` | Iniciar sesion |
| `POST /auth/refresh` | Renovar sesion |
| `POST /auth/logout` | Cerrar sesion |
| `GET /auth/me` | Sesion, roles y permisos |
| `POST /auth/switch-company` | Cambiar contexto empresa/app |

### 🎯 Empresas
| Endpoint | Permiso |
|---|---|
| `POST /companies` | `company:create` |
| `GET /companies` | `company:view` |
| `PUT /companies/:id` | `company:edit` |
| `PATCH /companies/:id/inactivate` | `company:inactivate` |
| `PATCH /companies/:id/reactivate` | `company:reactivate` |

### 🎯 Reglas de distribucion
| Endpoint | Permiso |
|---|---|
| `GET /distribution-rules` | `config:reglas-distribucion` |
| `GET /distribution-rules/:publicId` | `config:reglas-distribucion:view` |
| `POST /distribution-rules` | `config:reglas-distribucion:edit` |
| `PUT /distribution-rules/:publicId` | `config:reglas-distribucion:edit` |
| `PATCH /distribution-rules/:publicId/inactivate` | `config:reglas-distribucion:edit` |
| `PATCH /distribution-rules/:publicId/reactivate` | `config:reglas-distribucion:edit` |
| `GET /distribution-rules/:publicId/audit-trail` | `config:reglas-distribucion:audit` |

Notas tecnicas:
- `publicId` usa firma HMAC (`dr1_<payload>.<signature>`), no expone ID interno en URL.
- Scope de unicidad de regla activa se valida en servicio (empresa + global/departamento/puesto).
- `GET /distribution-rules` acepta `cb` como query tecnica de cache-buster (inyectada por interceptor HTTP del frontend). Ejemplo: `?idEmpresa=1&esActivo=1&cb=<token>`.

### 🎯 Empleados
| Endpoint | Permiso |
|---|---|
| `POST /employees` | `employee:create` |
| `GET /employees` | `employee:view` |
| `PUT /employees/:id` | `employee:edit` + `employee:view-sensitive` |
| `PATCH /employees/:id/inactivate` | `employee:inactivate` |
| `PATCH /employees/:id/reactivate` | `employee:reactivate` |
| `PATCH /employees/:id/liquidar` | `employee:edit` + `employee:view-sensitive` |

### 🎯 Planilla
| Endpoint | Permiso |
|---|---|
| `POST /payroll` | `payroll:create` |
| `PATCH /payroll/:id` | `payroll:edit` |
| `PATCH /payroll/:id/process` | `payroll:process` |
| `PATCH /payroll/:id/verify` | `payroll:verify` |
| `PATCH /payroll/:id/apply` | `payroll:apply` |
| `PATCH /payroll/:id/reopen` | `payroll:edit` |

### 🎯 Acciones de personal
- Base: `GET/POST /personal-actions`
- Por tipo: `POST/PATCH /personal-actions/{tipo}`
- Avance: `PATCH /personal-actions/{tipo}/:id/advance`
- Invalida: `PATCH /personal-actions/{tipo}/:id/invalidate`

### 🎯 Carga masiva horas extras
| Endpoint | Metodo | Permiso |
|---|---|---|
| `/personal-actions/horas-extras/carga-masiva/template-data` | GET | `payroll:overtime:bulk-upload` |
| `/personal-actions/horas-extras/carga-masiva/preview` | POST | `payroll:overtime:bulk-upload` |
| `/personal-actions/horas-extras/carga-masiva/commit` | POST | `payroll:overtime:bulk-upload` |

Reglas de contrato:
- `preview` valida filas y calcula monto/formula.
- `commit` procesa en background y notifica resultado al usuario ejecutor.
- Scope de notificacion del resultado: `USER + APP` (sin filtro por empresa).
- Solo filas validas se insertan; filas bloqueadas se reportan en resultado.

### 🎯 Notificaciones
| Endpoint | Metodo | Uso |
|---|---|---|
| `/notifications` | GET | Listar notificaciones (all/unread) |
| `/notifications/unread-count` | GET | Contador de no leidas |
| `/notifications/:id/read` | POST | Marcar una como leida |
| `/notifications/read-all` | POST | Marcar todas como leidas |
| `/notifications/:id/delete` | POST | Eliminar notificacion |

Regla de alcance:
- Notificaciones operan por usuario y app activa.
- No deben depender de empresa activa para listar/leer.

### 🎯 Traslado interempresa
- `POST /payroll/intercompany-transfer/simulate`
- `POST /payroll/intercompany-transfer/execute`
- Permiso: `payroll:intercompany-transfer`

## 🎯 Codigos HTTP
- `200`, `201`: exito
- `400`: validacion
- `401`: no autenticado
- `403`: sin permiso
- `404`: no encontrado
- `409`: conflicto de negocio
- `422`: entidad no procesable
- `500`: error interno

## 🔗 Ver tambien
- [Catalogo API funcional](../16-enterprise-operacion/03-CATALOGO-API-FUNCIONAL.md)
- [Matriz CRUD por modulo](./08-MATRIZ-CRUD-POR-MODULO.md)


