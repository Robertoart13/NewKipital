# 25 — Sistema de Notificaciones Enterprise en Tiempo Real

**Fecha:** 2026-02-21  
**Estado:** Implementado

---

## Resumen

Sistema de notificaciones enterprise con modelo masivo por rol, estado individual por usuario (leído/eliminado), campanita con badge en el header, y entrega en tiempo real vía WebSocket.

---

## Modelo de Base de Datos

### 1. Tabla `sys_notificaciones` (evento global)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id_notificacion | int PK | Identificador |
| tipo_notificacion | varchar(60) | PERMISSIONS_CHANGED, PAYROLL_APPLIED, etc. |
| titulo_notificacion | varchar(200) | Título |
| mensaje_notificacion | text | Cuerpo opcional |
| payload_notificacion | json | Metadata opcional |
| scope_notificacion | varchar(20) | ROLE, USER, COMPANY, APP, GLOBAL |
| id_app | int nullable | App (KPITAL/TIMEWISE) si aplica |
| id_empresa | int nullable | Empresa si aplica |
| creado_por_notificacion | int | Usuario que creó |
| fecha_creacion_notificacion | datetime | Timestamp |
| fecha_expira_notificacion | datetime nullable | Opcional |
| estado_notificacion | tinyint | 1=activa |

### 2. Tabla `sys_notificacion_usuarios` (estado por destinatario)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id_notificacion_usuario | int PK | Identificador |
| id_notificacion | int FK | Referencia a sys_notificaciones |
| id_usuario_destino | int FK | Usuario destinatario |
| estado_notificacion_usuario | varchar(20) | UNREAD, READ, DELETED |
| fecha_entregada_notificacion_usuario | datetime | Cuándo se generó |
| fecha_leida_notificacion_usuario | datetime nullable | |
| fecha_eliminada_notificacion_usuario | datetime nullable | |

**Regla enterprise:** 1 notificación → N filas (una por usuario). Cada usuario gestiona su estado de forma independiente.

---

## Endpoints REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /notifications | Lista notificaciones (status=unread\|all, appCode, companyId) |
| GET | /notifications/unread-count | Contador de no leídas |
| POST | /notifications/:id/read | Marcar como leída |
| POST | /notifications/:id/delete | Marcar como eliminada (soft) |
| POST | /notifications/read-all | Marcar todas como leídas |

---

## WebSocket (Socket.IO)

- **Path:** /socket.io  
- **Autenticación:** Cookie `platform_token` (JWT)  
- **Eventos emitidos al cliente:**
  - `notification:new` — Nueva notificación
  - `notification:count-update` — Actualizar contador
  - `notification:list-update` — Refrescar lista  

El frontend se suscribe al conectar y recibe eventos en tiempo real para actualizar badge y lista sin refresh.

---

## Disparo Automático

Se dispara notificación `PERMISSIONS_CHANGED` cuando:

1. **Matriz de Roles** (`PUT /config/roles/:id/permissions`): Se notifica a todos los usuarios que tienen ese rol (scope ROLE).
2. **Roles por Usuario** (`PUT /config/users/:id/roles`): Se notifica al usuario afectado (scope USER).

---

## Criterios de Aceptación

- [x] Notificación a rol X → todos los usuarios con rol X la ven (UNREAD)
- [x] Usuario A marca leído → desaparece del contador de A; usuario B sigue igual
- [x] Usuario A elimina → ya no la ve; usuario B sí
- [x] Badge de campanita actualizado correctamente
- [x] Tiempo real: al crear notificación, aparece sin refresh
- [x] Mensaje "Tiene un nuevo mensaje, revise en la campanita" implícito en el título

---

## Archivos Principales

- **API:** `api/src/modules/notifications/`
- **Migración:** `api/src/database/migrations/1708532600000-CreateSysNotificaciones.ts`
- **Frontend:** `frontend/src/components/ui/AppHeader/NotificationBell.tsx`
- **Hook WebSocket:** `frontend/src/hooks/useNotificationSocket.ts`
