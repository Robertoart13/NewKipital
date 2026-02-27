import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePayrollMovementsAndPermissions1708536300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('nom_movimientos_nomina');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'nom_movimientos_nomina',
          columns: [
            {
              name: 'id_movimiento_nomina',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_empresa_movimiento_nomina', type: 'int', isNullable: false },
            { name: 'nombre_movimiento_nomina', type: 'varchar', length: '200', isNullable: false },
            { name: 'id_articulo_nomina_movimiento_nomina', type: 'int', isNullable: false },
            { name: 'id_tipo_accion_personal_movimiento_nomina', type: 'int', isNullable: false },
            { name: 'id_clase_movimiento_nomina', type: 'int', isNullable: true },
            { name: 'id_proyecto_movimiento_nomina', type: 'int', isNullable: true },
            { name: 'descripcion_movimiento_nomina', type: 'text', isNullable: true },
            { name: 'es_monto_fijo_movimiento_nomina', type: 'tinyint', width: 1, default: 1 },
            { name: 'monto_fijo_movimiento_nomina', type: 'varchar', length: '50', default: "'0'" },
            { name: 'porcentaje_movimiento_nomina', type: 'varchar', length: '50', default: "'0'" },
            { name: 'formula_ayuda_movimiento_nomina', type: 'text', isNullable: true },
            { name: 'es_inactivo_movimiento_nomina', type: 'tinyint', width: 1, default: 0 },
            { name: 'fecha_creacion_movimiento_nomina', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion_movimiento_nomina',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nom_movimientos_nomina',
        new TableIndex({ name: 'IDX_mov_nomina_empresa', columnNames: ['id_empresa_movimiento_nomina'] }),
      );
      await queryRunner.createIndex(
        'nom_movimientos_nomina',
        new TableIndex({ name: 'IDX_mov_nomina_articulo', columnNames: ['id_articulo_nomina_movimiento_nomina'] }),
      );
      await queryRunner.createIndex(
        'nom_movimientos_nomina',
        new TableIndex({ name: 'IDX_mov_nomina_accion', columnNames: ['id_tipo_accion_personal_movimiento_nomina'] }),
      );
      await queryRunner.createIndex(
        'nom_movimientos_nomina',
        new TableIndex({ name: 'IDX_mov_nomina_clase', columnNames: ['id_clase_movimiento_nomina'] }),
      );
      await queryRunner.createIndex(
        'nom_movimientos_nomina',
        new TableIndex({ name: 'IDX_mov_nomina_proyecto', columnNames: ['id_proyecto_movimiento_nomina'] }),
      );
      await queryRunner.createIndex(
        'nom_movimientos_nomina',
        new TableIndex({ name: 'IDX_mov_nomina_inactivo', columnNames: ['es_inactivo_movimiento_nomina'] }),
      );

      await queryRunner.createForeignKey(
        'nom_movimientos_nomina',
        new TableForeignKey({
          name: 'FK_mov_nomina_empresa',
          columnNames: ['id_empresa_movimiento_nomina'],
          referencedTableName: 'sys_empresas',
          referencedColumnNames: ['id_empresa'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_movimientos_nomina',
        new TableForeignKey({
          name: 'FK_mov_nomina_articulo',
          columnNames: ['id_articulo_nomina_movimiento_nomina'],
          referencedTableName: 'nom_articulos_nomina',
          referencedColumnNames: ['id_articulo_nomina'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_movimientos_nomina',
        new TableForeignKey({
          name: 'FK_mov_nomina_accion',
          columnNames: ['id_tipo_accion_personal_movimiento_nomina'],
          referencedTableName: 'nom_tipos_accion_personal',
          referencedColumnNames: ['id_tipo_accion_personal'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_movimientos_nomina',
        new TableForeignKey({
          name: 'FK_mov_nomina_clase',
          columnNames: ['id_clase_movimiento_nomina'],
          referencedTableName: 'org_clases',
          referencedColumnNames: ['id_clase'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_movimientos_nomina',
        new TableForeignKey({
          name: 'FK_mov_nomina_proyecto',
          columnNames: ['id_proyecto_movimiento_nomina'],
          referencedTableName: 'org_proyectos',
          referencedColumnNames: ['id_proyecto'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryRunner.query(`
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      )
      VALUES
        ('payroll-movement:view', 'Ver/listar movimientos de nomina', 'Permite ver y listar movimientos de nomina', 'payroll-movement', 1, '${now}'),
        ('payroll-movement:create', 'Crear movimientos de nomina', 'Permite crear movimientos de nomina', 'payroll-movement', 1, '${now}'),
        ('payroll-movement:edit', 'Editar movimientos de nomina', 'Permite editar movimientos de nomina', 'payroll-movement', 1, '${now}'),
        ('payroll-movement:inactivate', 'Inactivar movimientos de nomina', 'Permite inactivar movimientos de nomina', 'payroll-movement', 1, '${now}'),
        ('payroll-movement:reactivate', 'Reactivar movimientos de nomina', 'Permite reactivar movimientos de nomina', 'payroll-movement', 1, '${now}'),
        ('config:payroll-movements:audit', 'Ver bitacora movimientos de nomina', 'Permite ver la bitacora de movimientos de nomina', 'config', 1, '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'payroll-movement:view',
        'payroll-movement:create',
        'payroll-movement:edit',
        'payroll-movement:inactivate',
        'payroll-movement:reactivate',
        'config:payroll-movements:audit'
      )
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
        AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN (
        'payroll-movement:view',
        'payroll-movement:create',
        'payroll-movement:edit',
        'payroll-movement:inactivate',
        'payroll-movement:reactivate',
        'config:payroll-movements:audit'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'payroll-movement:view',
        'payroll-movement:create',
        'payroll-movement:edit',
        'payroll-movement:inactivate',
        'payroll-movement:reactivate',
        'config:payroll-movements:audit'
      )
    `);

    if (await queryRunner.hasTable('nom_movimientos_nomina')) {
      await queryRunner.dropTable('nom_movimientos_nomina', true);
    }
  }
}

