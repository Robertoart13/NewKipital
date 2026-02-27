import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePayrollArticlesAndPermissions1708536100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTipoArticulo = await queryRunner.hasTable('nom_tipo_articulo_nomina');
    if (!hasTipoArticulo) {
      await queryRunner.createTable(
        new Table({
          name: 'nom_tipo_articulo_nomina',
          columns: [
            {
              name: 'id_tipo_articulo_nomina',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'nombre_tipo_articulo_nomina', type: 'varchar', length: '150', isNullable: false },
            { name: 'descripcion_tipo_articulo_nomina', type: 'text', isNullable: true },
            { name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 },
            { name: 'fecha_creacion', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nom_tipo_articulo_nomina',
        new TableIndex({ name: 'IDX_tipo_articulo_nomina_inactivo', columnNames: ['es_inactivo'] }),
      );
    }

    const hasArticulos = await queryRunner.hasTable('nom_articulos_nomina');
    if (!hasArticulos) {
      await queryRunner.createTable(
        new Table({
          name: 'nom_articulos_nomina',
          columns: [
            {
              name: 'id_articulo_nomina',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_empresa', type: 'int', isNullable: false },
            { name: 'nombre_articulo_nomina', type: 'varchar', length: '200', isNullable: false },
            { name: 'descripcion_articulo_nomina', type: 'text', isNullable: true },
            { name: 'id_tipo_accion_personal', type: 'int', isNullable: false },
            { name: 'id_tipo_articulo_nomina', type: 'int', isNullable: false },
            { name: 'id_cuenta_gasto', type: 'int', isNullable: false },
            { name: 'id_cuenta_pasivo', type: 'int', isNullable: true },
            { name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 },
            { name: 'fecha_creacion', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nom_articulos_nomina',
        new TableIndex({ name: 'IDX_articulo_nomina_empresa', columnNames: ['id_empresa'] }),
      );
      await queryRunner.createIndex(
        'nom_articulos_nomina',
        new TableIndex({ name: 'IDX_articulo_nomina_tipo', columnNames: ['id_tipo_articulo_nomina'] }),
      );
      await queryRunner.createIndex(
        'nom_articulos_nomina',
        new TableIndex({ name: 'IDX_articulo_nomina_accion', columnNames: ['id_tipo_accion_personal'] }),
      );
      await queryRunner.createIndex(
        'nom_articulos_nomina',
        new TableIndex({ name: 'IDX_articulo_nomina_inactivo', columnNames: ['es_inactivo'] }),
      );

      await queryRunner.createForeignKey(
        'nom_articulos_nomina',
        new TableForeignKey({
          name: 'FK_articulo_nomina_empresa',
          columnNames: ['id_empresa'],
          referencedTableName: 'sys_empresas',
          referencedColumnNames: ['id_empresa'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_articulos_nomina',
        new TableForeignKey({
          name: 'FK_articulo_nomina_tipo',
          columnNames: ['id_tipo_articulo_nomina'],
          referencedTableName: 'nom_tipo_articulo_nomina',
          referencedColumnNames: ['id_tipo_articulo_nomina'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_articulos_nomina',
        new TableForeignKey({
          name: 'FK_articulo_nomina_accion',
          columnNames: ['id_tipo_accion_personal'],
          referencedTableName: 'nom_tipos_accion_personal',
          referencedColumnNames: ['id_tipo_accion_personal'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_articulos_nomina',
        new TableForeignKey({
          name: 'FK_articulo_nomina_cuenta_gasto',
          columnNames: ['id_cuenta_gasto'],
          referencedTableName: 'erp_cuentas_contables',
          referencedColumnNames: ['id_cuenta_contable'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_articulos_nomina',
        new TableForeignKey({
          name: 'FK_articulo_nomina_cuenta_pasivo',
          columnNames: ['id_cuenta_pasivo'],
          referencedTableName: 'erp_cuentas_contables',
          referencedColumnNames: ['id_cuenta_contable'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO nom_tipo_articulo_nomina
        (id_tipo_articulo_nomina, nombre_tipo_articulo_nomina, descripcion_tipo_articulo_nomina, es_inactivo)
      VALUES
        (1, 'Ingreso', 'Ingreso: Incluye salario, bonificaciones, comisiones, horas extras, pago de vacaciones.', 0),
        (2, 'Deduccion', 'Descuentos del salario del empleado, como CCSS, Impuesto sobre la Renta, Prestamos.', 0),
        (9, 'Gasto Empleado', 'Reembolsos por gastos realizados por el trabajador.', 0),
        (10, 'Aporte Patronal', 'Obligaciones del empleador, como CCSS, INS, Banco Popular y provisiones.', 0)
      ON DUPLICATE KEY UPDATE
        nombre_tipo_articulo_nomina = VALUES(nombre_tipo_articulo_nomina),
        descripcion_tipo_articulo_nomina = VALUES(descripcion_tipo_articulo_nomina),
        es_inactivo = VALUES(es_inactivo)
    `);

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
        ('payroll-article:view', 'Ver/listar articulos de nomina', 'Permite ver y listar articulos de nomina', 'payroll-article', 1, '${now}'),
        ('payroll-article:create', 'Crear articulos de nomina', 'Permite crear articulos de nomina', 'payroll-article', 1, '${now}'),
        ('payroll-article:edit', 'Editar articulos de nomina', 'Permite editar articulos de nomina', 'payroll-article', 1, '${now}'),
        ('payroll-article:inactivate', 'Inactivar articulos de nomina', 'Permite inactivar articulos de nomina', 'payroll-article', 1, '${now}'),
        ('payroll-article:reactivate', 'Reactivar articulos de nomina', 'Permite reactivar articulos de nomina', 'payroll-article', 1, '${now}'),
        ('payroll-article:audit', 'Ver bitacora articulos de nomina', 'Permite ver la bitacora de articulos de nomina', 'payroll-article', 1, '${now}')
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
        'payroll-article:view',
        'payroll-article:create',
        'payroll-article:edit',
        'payroll-article:inactivate',
        'payroll-article:reactivate',
        'payroll-article:audit'
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
        'payroll-article:view',
        'payroll-article:create',
        'payroll-article:edit',
        'payroll-article:inactivate',
        'payroll-article:reactivate',
        'payroll-article:audit'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'payroll-article:view',
        'payroll-article:create',
        'payroll-article:edit',
        'payroll-article:inactivate',
        'payroll-article:reactivate',
        'payroll-article:audit'
      )
    `);

    const hasArticulos = await queryRunner.hasTable('nom_articulos_nomina');
    if (hasArticulos) {
      await queryRunner.dropTable('nom_articulos_nomina', true);
    }

    const hasTipoArticulo = await queryRunner.hasTable('nom_tipo_articulo_nomina');
    if (hasTipoArticulo) {
      await queryRunner.dropTable('nom_tipo_articulo_nomina', true);
    }
  }
}
