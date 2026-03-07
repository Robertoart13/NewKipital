#  PERFORMANCE - Issues Pendientes

**Prioridad Global:** P1 (ALTO)
**Esfuerzo Total:** 1 semana

---

## ISSUE-049: Problema N+1 en EmployeesService

**Prioridad:** P1 | **Esfuerzo:** S (1 da)

### Descripcin
Carga de empleados hace mltiples queries para departamento, supervisor, puesto.

### Archivos Afectados
- `api/src/modules/employees/employees.service.ts`

### Criterios de Aceptacin
- [ ] findAll() usa eager loading o DataLoader
- [ ] Query nico con JOINs
- [ ] Tests de performance: 100 empleados < 200ms

### Implementacin

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

## ISSUE-050: Cach de permisos con Redis

**Prioridad:** P1 | **Esfuerzo:** M (2-3 das)

### Descripcin
PermissionsGuard consulta BD en cada request. Necesita cach.

### Criterios de Aceptacin
- [ ] Redis configurado
- [ ] Cache de permisos por (userId, companyId, appCode)
- [ ] TTL: 5 minutos
- [ ] Invalidar cache al cambiar permisos
- [ ] Reduccin latencia: 200ms  20ms

---

## ISSUE-051: ndices de BD faltantes

**Prioridad:** P1 | **Esfuerzo:** S (1 da)

### Descripcin
Queries lentos por falta de ndices.

### Criterios de Aceptacin
- [ ] ndice: sys_empleados(id_empresa, estado_empleado)
- [ ] ndice: nom_calendarios_nomina(id_empresa, estado_calendario_nomina)
- [ ] ndice: sys_auditoria_acciones(id_empresa_contexto_auditoria, fecha_creacion_auditoria)
- [ ] Analyze query plans antes/despus

---

## ISSUE-052: Connection pooling optimization

**Prioridad:** P1 | **Esfuerzo:** XS (medio da)

### Criterios de Aceptacin
- [ ] Pool size: min 5, max 20
- [ ] Idle timeout: 30s
- [ ] Acquire timeout: 10s
- [ ] Monitoreo pool usage en /metrics

---

## ISSUE-053: Paginacin en endpoints sin lmite

**Prioridad:** P1 | **Esfuerzo:** S (1 da)

### Descripcin
GET /api/employees retorna todos los empleados sin paginacin.

### Criterios de Aceptacin
- [ ] Query param: ?page=1&limit=50
- [ ] Default limit: 50
- [ ] Max limit: 500
- [ ] Response incluye: `{ data, total, page, pages }`

---

## ISSUE-054: Compression middleware

**Prioridad:** P2 | **Esfuerzo:** XS (1 hora)

### Criterios de Aceptacin
- [ ] Gzip compression para responses > 1KB
- [ ] Reduccin bandwidth: ~60%

---

##  Progreso Performance

- [ ] ISSUE-049: N+1 queries
- [ ] ISSUE-050: Cach Redis
- [ ] ISSUE-051: ndices BD
- [ ] ISSUE-052: Connection pooling
- [ ] ISSUE-053: Paginacin
- [ ] ISSUE-054: Compression

**Total:** 0/6 completados (0%)
