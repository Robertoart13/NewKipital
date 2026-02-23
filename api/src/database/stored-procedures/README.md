# Convención de Stored Procedures — KPITAL 360

## Reglas

- Un archivo SQL por stored procedure.
- Nombre del archivo: `sp_nombre_del_procedure.sql`
- Cada archivo incluye `DROP PROCEDURE IF EXISTS` + `CREATE PROCEDURE`.
- Versionado: si un SP cambia significativamente, crear nuevo archivo `sp_nombre_v2.sql` y documentar en el changelog.
- Los SPs se ejecutan manualmente o via script de setup. No se ejecutan con las migraciones de TypeORM.
- Todo SP debe tener un header comentado: autor, fecha, propósito, parámetros.

## Formato del Header

```sql
-- ============================================
-- Autor:       [Nombre]
-- Fecha:       [YYYY-MM-DD]
-- Propósito:   [Descripción breve]
-- Parámetros:
--   @param1    [tipo] - [descripción]
--   @param2    [tipo] - [descripción]
-- Changelog:
--   [YYYY-MM-DD] - Creación inicial
-- ============================================
```

## Ejecución desde NestJS

Los stored procedures se llaman via `DataSource.query()`:

```typescript
const result = await this.dataSource.query(
  'CALL sp_generar_planilla(?, ?, ?)',
  [companyId, periodStart, periodEnd],
);
```

## Cuándo Usar Stored Procedures vs TypeORM

| Usar SP | Usar TypeORM |
|---------|-------------|
| Lógica masiva (generar planilla) | CRUD simple (crear empleado) |
| Operaciones ACID complejas | Consultas con filtros |
| Recálculos batch | Paginación + ordenamiento |
| Movimientos entre empresas | Relaciones simples |
