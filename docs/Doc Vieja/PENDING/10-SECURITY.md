# 🔒 SECURITY - Issues Pendientes

**Prioridad Global:** P1 (ALTO)
**Esfuerzo Total:** 1 semana

---

## ISSUE-058: Implementar CSRF token validation

**Prioridad:** P0 | **Esfuerzo:** S (1 día)

### Descripción
CsrfGuard existe pero no está integrado. Vulnerable a CSRF attacks.

### Archivos Afectados
- `api/src/common/guards/csrf.guard.ts` (verificar/completar)
- `api/src/app.module.ts`
- `frontend/src/api/*.ts` (añadir header)

### Criterios de Aceptación
- [ ] CsrfGuard global en app.module
- [ ] Login retorna csrfToken en cookie
- [ ] Requests POST/PUT/DELETE requieren header X-CSRF-Token
- [ ] Frontend envía token en cada request
- [ ] Test: request sin token → 403

---

## ISSUE-059: Helmet security headers

**Prioridad:** P1 | **Esfuerzo:** XS (1 hora)

### Criterios de Aceptación
- [ ] Helmet middleware instalado
- [ ] Headers:
  - Strict-Transport-Security
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy

### Implementación

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
```

---

## ISSUE-060: Secrets rotation policy

**Prioridad:** P1 | **Esfuerzo:** M (2 días)

### Descripción
JWT_SECRET, ENCRYPTION_MASTER_SECRET nunca rotan.

### Criterios de Aceptación
- [ ] Documentar proceso de rotación de secrets
- [ ] Script: `npm run rotate-jwt-secret`
- [ ] Script: `npm run rotate-encryption-key`
- [ ] Soporte dual keys durante transición (old + new)
- [ ] Runbook para emergencias

---

## ISSUE-061: Input sanitization mejorado

**Prioridad:** P1 | **Esfuerzo:** S (1 día)

### Descripción
Validación anti-SQL en frontend, pero backend confía en prepared statements solamente.

### Criterios de Aceptación
- [ ] Librería: class-validator + class-sanitizer
- [ ] Sanitizar HTML en strings
- [ ] Validar tipos estrictamente
- [ ] Blacklist de caracteres peligrosos

---

## ISSUE-062: Audit logging de acciones sensibles

**Prioridad:** P1 | **Esfuerzo:** M (2 días)

### Descripción
AuditOutbox funciona, pero falta loguear acciones de seguridad.

### Criterios de Aceptación
- [ ] Log en cada cambio de permisos
- [ ] Log en cada cambio de contraseña
- [ ] Log en login fallido (ya existe)
- [ ] Log en logout
- [ ] Reporte: GET /api/audit/security-events

---

## 📊 Progreso Security

- [ ] ISSUE-058: CSRF validation
- [ ] ISSUE-059: Helmet headers
- [ ] ISSUE-060: Secrets rotation
- [ ] ISSUE-061: Input sanitization
- [ ] ISSUE-062: Audit logging

**Total:** 0/5 completados (0%)
