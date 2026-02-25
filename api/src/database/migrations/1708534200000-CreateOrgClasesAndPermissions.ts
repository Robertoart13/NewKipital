import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOrgClasesAndPermissions1708534200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('org_clases');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'org_clases',
          columns: [
            {
              name: 'id_clase',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'nombre_clase', type: 'varchar', length: '255', isNullable: false },
            { name: 'descripcion_clase', type: 'text', isNullable: true },
            { name: 'codigo_clase', type: 'varchar', length: '50', isNullable: false },
            { name: 'id_externos_clase', type: 'varchar', length: '45', isNullable: true },
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
        'org_clases',
        new TableIndex({ name: 'UQ_clase_codigo', columnNames: ['codigo_clase'], isUnique: true }),
      );
      await queryRunner.createIndex(
        'org_clases',
        new TableIndex({
          name: 'UQ_clase_id_externo',
          columnNames: ['id_externos_clase'],
          isUnique: true,
        }),
      );
      await queryRunner.createIndex(
        'org_clases',
        new TableIndex({ name: 'IDX_clase_inactivo', columnNames: ['es_inactivo'] }),
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
        ('config:clases', 'Ver clases', 'Permite listar y consultar clases organizacionales', 'config', 1, '${now}'),
        ('class:create', 'Crear clases', 'Permite crear nuevas clases organizacionales', 'class', 1, '${now}'),
        ('class:edit', 'Editar clases', 'Permite editar clases organizacionales', 'class', 1, '${now}'),
        ('class:inactivate', 'Inactivar clases', 'Permite inactivar clases organizacionales', 'class', 1, '${now}'),
        ('class:reactivate', 'Reactivar clases', 'Permite reactivar clases organizacionales', 'class', 1, '${now}')
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
        'config:clases',
        'class:create',
        'class:edit',
        'class:inactivate',
        'class:reactivate'
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
        'config:clases',
        'class:create',
        'class:edit',
        'class:inactivate',
        'class:reactivate'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'config:clases',
        'class:create',
        'class:edit',
        'class:inactivate',
        'class:reactivate'
      )
    `);

    const hasTable = await queryRunner.hasTable('org_clases');
    if (hasTable) {
      await queryRunner.dropTable('org_clases', true);
    }
  }
}

