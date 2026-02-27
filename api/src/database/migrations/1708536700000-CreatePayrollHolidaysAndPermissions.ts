import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePayrollHolidaysAndPermissions1708536700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('nom_feriados_planilla');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'nom_feriados_planilla',
          columns: [
            {
              name: 'id_feriado_planilla',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'nombre_feriado_planilla', type: 'varchar', length: '200', isNullable: false },
            { name: 'tipo_feriado_planilla', type: 'varchar', length: '50', isNullable: false },
            { name: 'fecha_inicio_feriado_planilla', type: 'date', isNullable: false },
            { name: 'fecha_fin_feriado_planilla', type: 'date', isNullable: false },
            { name: 'descripcion_feriado_planilla', type: 'text', isNullable: true },
            { name: 'fecha_creacion_feriado_planilla', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion_feriado_planilla',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nom_feriados_planilla',
        new TableIndex({ name: 'IDX_feriado_fecha_inicio', columnNames: ['fecha_inicio_feriado_planilla'] }),
      );
      await queryRunner.createIndex(
        'nom_feriados_planilla',
        new TableIndex({ name: 'IDX_feriado_fecha_fin', columnNames: ['fecha_fin_feriado_planilla'] }),
      );
      await queryRunner.createIndex(
        'nom_feriados_planilla',
        new TableIndex({ name: 'IDX_feriado_tipo', columnNames: ['tipo_feriado_planilla'] }),
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
      ) VALUES
        ('payroll-holiday:view', 'Ver/listar feriados de planilla', 'Permite ver y listar feriados de planilla', 'payroll-holiday', 1, '${now}'),
        ('payroll-holiday:create', 'Crear feriados de planilla', 'Permite crear feriados de planilla', 'payroll-holiday', 1, '${now}'),
        ('payroll-holiday:edit', 'Editar feriados de planilla', 'Permite editar feriados de planilla', 'payroll-holiday', 1, '${now}'),
        ('payroll-holiday:delete', 'Eliminar feriados de planilla', 'Permite eliminar feriados de planilla', 'payroll-holiday', 1, '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
    `);

    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_roles r ON r.id_rol = rp.id_rol
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE r.codigo_rol IN ('MASTER', 'GERENTE_NOMINA', 'OPERADOR_NOMINA')
        AND p.codigo_permiso IN (
          'payroll-holiday:view',
          'payroll-holiday:create',
          'payroll-holiday:edit',
          'payroll-holiday:delete'
        )
    `);

    // Operador: solo lectura.
    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN ('payroll-holiday:view')
      WHERE r.codigo_rol = 'OPERADOR_NOMINA' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);

    // Gerente: lectura y mantenimiento.
    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'payroll-holiday:view',
        'payroll-holiday:create',
        'payroll-holiday:edit',
        'payroll-holiday:delete'
      )
      WHERE r.codigo_rol = 'GERENTE_NOMINA' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);

    // Master: todo.
    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'payroll-holiday:view',
        'payroll-holiday:create',
        'payroll-holiday:edit',
        'payroll-holiday:delete'
      )
      WHERE r.codigo_rol = 'MASTER' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN (
        'payroll-holiday:view',
        'payroll-holiday:create',
        'payroll-holiday:edit',
        'payroll-holiday:delete'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'payroll-holiday:view',
        'payroll-holiday:create',
        'payroll-holiday:edit',
        'payroll-holiday:delete'
      )
    `);

    if (await queryRunner.hasTable('nom_feriados_planilla')) {
      await queryRunner.dropTable('nom_feriados_planilla', true);
    }
  }
}

