import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Tabla sys_usuario_permiso_global: denegación de permisos a nivel global.
 * Si un permiso está aquí, el usuario NO lo tendrá en ninguna empresa.
 * Resuelve: "Quiero quitar X a este usuario en todas las empresas".
 */
export class AddUserPermissionGlobalDeny1708533000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('sys_usuario_permiso_global');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'sys_usuario_permiso_global',
        columns: [
          {
            name: 'id_usuario_permiso_global',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_usuario', type: 'int', isNullable: false },
          { name: 'id_app', type: 'int', isNullable: false },
          { name: 'id_permiso', type: 'int', isNullable: false },
          {
            name: 'estado_usuario_permiso_global',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          {
            name: 'fecha_creacion_usuario_permiso_global',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_usuario_permiso_global',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'creado_por_usuario_permiso_global',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'modificado_por_usuario_permiso_global',
            type: 'int',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: 'UQ_usuario_permiso_global',
            columnNames: ['id_usuario', 'id_app', 'id_permiso'],
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'sys_usuario_permiso_global',
      new TableIndex({
        name: 'IDX_usuario_permiso_global_usuario',
        columnNames: ['id_usuario'],
      }),
    );

    await queryRunner.createForeignKey(
      'sys_usuario_permiso_global',
      new TableForeignKey({
        name: 'FK_usuario_permiso_global_usuario',
        columnNames: ['id_usuario'],
        referencedTableName: 'sys_usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_usuario_permiso_global',
      new TableForeignKey({
        name: 'FK_usuario_permiso_global_app',
        columnNames: ['id_app'],
        referencedTableName: 'sys_apps',
        referencedColumnNames: ['id_app'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_usuario_permiso_global',
      new TableForeignKey({
        name: 'FK_usuario_permiso_global_permiso',
        columnNames: ['id_permiso'],
        referencedTableName: 'sys_permisos',
        referencedColumnNames: ['id_permiso'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('sys_usuario_permiso_global')) {
      await queryRunner.dropTable('sys_usuario_permiso_global');
    }
  }
}
