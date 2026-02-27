import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddUserPermissionOverrides1708532400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('sys_usuario_permiso');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'sys_usuario_permiso',
          columns: [
            {
              name: 'id_usuario_permiso',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_usuario', type: 'int', isNullable: false },
            { name: 'id_empresa', type: 'int', isNullable: false },
            { name: 'id_app', type: 'int', isNullable: false },
            { name: 'id_permiso', type: 'int', isNullable: false },
            {
              name: 'efecto_usuario_permiso',
              type: 'varchar',
              length: '10',
              isNullable: false,
            },
            {
              name: 'estado_usuario_permiso',
              type: 'tinyint',
              width: 1,
              default: 1,
            },
            {
              name: 'fecha_creacion_usuario_permiso',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'fecha_modificacion_usuario_permiso',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'creado_por_usuario_permiso',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'modificado_por_usuario_permiso',
              type: 'int',
              isNullable: false,
            },
          ],
          uniques: [
            {
              name: 'UQ_usuario_permiso_contexto',
              columnNames: ['id_usuario', 'id_empresa', 'id_app', 'id_permiso'],
            },
          ],
        }),
      );
    }

    const table = await queryRunner.getTable('sys_usuario_permiso');
    if (!table) return;

    if (!table.indices.find((i) => i.name === 'IDX_usuario_permiso_empresa')) {
      await queryRunner.createIndex(
        'sys_usuario_permiso',
        new TableIndex({
          name: 'IDX_usuario_permiso_empresa',
          columnNames: ['id_empresa'],
        }),
      );
    }

    if (!table.indices.find((i) => i.name === 'IDX_usuario_permiso_app')) {
      await queryRunner.createIndex(
        'sys_usuario_permiso',
        new TableIndex({
          name: 'IDX_usuario_permiso_app',
          columnNames: ['id_app'],
        }),
      );
    }

    if (!table.indices.find((i) => i.name === 'IDX_usuario_permiso_estado')) {
      await queryRunner.createIndex(
        'sys_usuario_permiso',
        new TableIndex({
          name: 'IDX_usuario_permiso_estado',
          columnNames: ['estado_usuario_permiso'],
        }),
      );
    }

    if (
      !table.foreignKeys.find((fk) => fk.name === 'FK_usuario_permiso_usuario')
    ) {
      await queryRunner.createForeignKey(
        'sys_usuario_permiso',
        new TableForeignKey({
          name: 'FK_usuario_permiso_usuario',
          columnNames: ['id_usuario'],
          referencedTableName: 'sys_usuarios',
          referencedColumnNames: ['id_usuario'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    if (
      !table.foreignKeys.find((fk) => fk.name === 'FK_usuario_permiso_empresa')
    ) {
      await queryRunner.createForeignKey(
        'sys_usuario_permiso',
        new TableForeignKey({
          name: 'FK_usuario_permiso_empresa',
          columnNames: ['id_empresa'],
          referencedTableName: 'sys_empresas',
          referencedColumnNames: ['id_empresa'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    if (!table.foreignKeys.find((fk) => fk.name === 'FK_usuario_permiso_app')) {
      await queryRunner.createForeignKey(
        'sys_usuario_permiso',
        new TableForeignKey({
          name: 'FK_usuario_permiso_app',
          columnNames: ['id_app'],
          referencedTableName: 'sys_apps',
          referencedColumnNames: ['id_app'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    if (
      !table.foreignKeys.find((fk) => fk.name === 'FK_usuario_permiso_permiso')
    ) {
      await queryRunner.createForeignKey(
        'sys_usuario_permiso',
        new TableForeignKey({
          name: 'FK_usuario_permiso_permiso',
          columnNames: ['id_permiso'],
          referencedTableName: 'sys_permisos',
          referencedColumnNames: ['id_permiso'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('sys_usuario_permiso');
    if (!hasTable) return;
    await queryRunner.dropTable('sys_usuario_permiso');
  }
}
