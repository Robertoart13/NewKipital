# ⚙️ Catalogo API Funcional

## 🎯 Objetivo
Concentrar endpoints, permisos y contratos funcionales.

## 🎯 Formato de respuesta canonico
```json
{
  "success": true,
  "data": {},
  "message": "Operacion completada",
  "error": null
}
```

## 🎯 Endpoints clave
| Modulo | Endpoint | Metodo | Permiso | Exito | Errores comunes |
|---|---|---|---|---|---|
| Auth | /auth/login | POST | publico | 200 | 401 |
| Empleados | /employees | POST | employee:create | 201 | 400, 409 |
| Empleados | /employees/:id | GET | employee:view | 200 | 404 |
| Empresas | /companies | POST | company:manage | 201 | 400, 409 |
| Planilla | /payroll/generate | POST | payroll:generate | 200 | 400, 409 |
| Planilla | /payroll/apply | POST | payroll:apply | 200 | 400, 409 |
| Acciones | /personal-actions/:id/approve | POST | hr-action:approve | 200 | 400, 403 |

## 🎯 Regla
- Todo endpoint productivo debe estar documentado aquí antes de release.


