import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateOrgProyectosAndPermissions1708534600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('org_proyectos');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'org_proyectos',
          columns: [
            {
              name: 'id_proyecto',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_empresa', type: 'int', isNullable: false },
            { name: 'nombre_proyecto', type: 'varchar', length: '255', isNullable: false },
            { name: 'descripcion_proyecto', type: 'text', isNullable: true },
            { name: 'codigo_proyecto', type: 'varchar', length: '50', isNullable: false },
            { name: 'id_externo_proyecto', type: 'varchar', length: '45', isNullable: true },
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
        'org_proyectos',
        new TableIndex({ name: 'IDX_proyecto_empresa', columnNames: ['id_empresa'] }),
      );
      await queryRunner.createIndex(
        'org_proyectos',
        new TableIndex({ name: 'UQ_proyecto_codigo', columnNames: ['codigo_proyecto'], isUnique: true }),
      );
      await queryRunner.createIndex(
        'org_proyectos',
        new TableIndex({ name: 'UQ_proyecto_id_externo', columnNames: ['id_externo_proyecto'], isUnique: true }),
      );
      await queryRunner.createIndex(
        'org_proyectos',
        new TableIndex({ name: 'IDX_proyecto_inactivo', columnNames: ['es_inactivo'] }),
      );

      await queryRunner.createForeignKey(
        'org_proyectos',
        new TableForeignKey({
          name: 'FK_proyecto_empresa',
          columnNames: ['id_empresa'],
          referencedTableName: 'sys_empresas',
          referencedColumnNames: ['id_empresa'],
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
        ('config:proyectos', 'Ver proyectos', 'Permite listar y consultar proyectos organizacionales', 'config', 1, '${now}'),
        ('project:create', 'Crear proyectos', 'Permite crear nuevos proyectos organizacionales', 'project', 1, '${now}'),
        ('project:edit', 'Editar proyectos', 'Permite editar proyectos organizacionales', 'project', 1, '${now}'),
        ('project:inactivate', 'Inactivar proyectos', 'Permite inactivar proyectos organizacionales', 'project', 1, '${now}'),
        ('project:reactivate', 'Reactivar proyectos', 'Permite reactivar proyectos organizacionales', 'project', 1, '${now}')
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
        'config:proyectos',
        'project:create',
        'project:edit',
        'project:inactivate',
        'project:reactivate'
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
        'config:proyectos',
        'project:create',
        'project:edit',
        'project:inactivate',
        'project:reactivate'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'config:proyectos',
        'project:create',
        'project:edit',
        'project:inactivate',
        'project:reactivate'
      )
    `);

    const hasTable = await queryRunner.hasTable('org_proyectos');
    if (hasTable) {
      await queryRunner.dropTable('org_proyectos', true);
    }
  }
}
