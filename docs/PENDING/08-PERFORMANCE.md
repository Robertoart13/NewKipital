# ⚡ PERFORMANCE - Issues Pendientes

**Prioridad Global:** P1 (ALTO)
**Esfuerzo Total:** 1 semana

---

## ISSUE-049: Problema N+1 en EmployeesService

**Prioridad:** P1 | **Esfuerzo:** S (1 día)

### Descripción
Carga de empleados hace múltiples queries para departamento, supervisor, puesto.

### Archivos Afectados
- `api/src/modules/employees/employees.service.ts`

### Criterios de Aceptación
- [ ] findAll() usa eager loading o DataLoader
- [ ] Query único con JOINs
- [ ] Tests de performance: 100 empleados < 200ms

### Implementación

```typescript
// employees.service.ts
async findAll(userId: number, idEmpresa?: number): Promise<Employee[]> {
  const qb = this.repo.createQueryBuilder('e')
    .leftJoinAndSelect('e.departamento', 'dept')
    .leftJoinAndSelect('e.puesto', 'puesto')
    .leftJoinAndSelect('e.supervisor', 'sup')
    .where('1=1');

  // ...filtros

  return qb.getMany();
}
```

---

## ISSUE-050: Caché de permisos con Redis

**Prioridad:** P1 | **Esfuerzo:** M (2-3 días)

### Descripción
PermissionsGuard consulta BD en cada request. Necesita caché.

### Criterios de Aceptación
- [ ] Redis configurado
- [ ] Cache de permisos por (userId, companyId, appCode)
- [ ] TTL: 5 minutos
- [ ] Invalidar cache al cambiar permisos
- [ ] Reducción latencia: 200ms → 20ms

---

## ISSUE-051: Índices de BD faltantes

**Prioridad:** P1 | **Esfuerzo:** S (1 día)

### Descripción
Queries lentos por falta de índices.

### Criterios de Aceptación
- [ ] Índice: sys_empleados(id_empresa, estado_empleado)
- [ ] Índice: nom_calendarios_nomina(id_empresa, estado_calendario_nomina)
- [ ] Índice: sys_auditoria_acciones(id_empresa_contexto_auditoria, fecha_creacion_auditoria)
- [ ] Analyze query plans antes/después

---

## ISSUE-052: Connection pooling optimization

**Prioridad:** P1 | **Esfuerzo:** XS (medio día)

### Criterios de Aceptación
- [ ] Pool size: min 5, max 20
- [ ] Idle timeout: 30s
- [ ] Acquire timeout: 10s
- [ ] Monitoreo pool usage en /metrics

---

## ISSUE-053: Paginación en endpoints sin límite

**Prioridad:** P1 | **Esfuerzo:** S (1 día)

### Descripción
GET /api/employees retorna todos los empleados sin paginación.

### Criterios de Aceptación
- [ ] Query param: ?page=1&limit=50
- [ ] Default limit: 50
- [ ] Max limit: 500
- [ ] Response incluye: `{ data, total, page, pages }`

---

## ISSUE-054: Compression middleware

**Prioridad:** P2 | **Esfuerzo:** XS (1 hora)

### Criterios de Aceptación
- [ ] Gzip compression para responses > 1KB
- [ ] Reducción bandwidth: ~60%

---

## 📊 Progreso Performance

- [ ] ISSUE-049: N+1 queries
- [ ] ISSUE-050: Caché Redis
- [ ] ISSUE-051: Índices BD
- [ ] ISSUE-052: Connection pooling
- [ ] ISSUE-053: Paginación
- [ ] ISSUE-054: Compression

**Total:** 0/6 completados (0%)
