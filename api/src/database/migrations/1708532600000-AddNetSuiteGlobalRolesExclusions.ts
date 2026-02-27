import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Modelo NetSuite: roles globales + excepciones por empresa.
 * - sys_usuario_rol_global: rol aplica a TODAS las empresas del usuario
 * - sys_usuario_rol_exclusion: excluir rol global de una empresa específica
 */
export class AddNetSuiteGlobalRolesExclusions1708532600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('sys_usuario_rol_global'))) {
      await queryRunner.createTable(
        new Table({
          name: 'sys_usuario_rol_global',
          columns: [
            {
              name: 'id_usuario_rol_global',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_usuario', type: 'int', isNullable: false },
            { name: 'id_app', type: 'int', isNullable: false },
            { name: 'id_rol', type: 'int', isNullable: false },
            { name: 'estado_usuario_rol_global', type: 'tinyint', width: 1, default: 1 },
            { name: 'fecha_creacion_usuario_rol_global', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion_usuario_rol_global',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
            { name: 'creado_por_usuario_rol_global', type: 'int', isNullable: false },
            { name: 'modificado_por_usuario_rol_global', type: 'int', isNullable: false },
          ],
          uniques: [{ name: 'UQ_usuario_rol_global', columnNames: ['id_usuario', 'id_app', 'id_rol'] }],
        }),
      );

      await queryRunner.createForeignKey(
        'sys_usuario_rol_global',
        new TableForeignKey({
          name: 'FK_usuario_rol_global_usuario',
          columnNames: ['id_usuario'],
          referencedTableName: 'sys_usuarios',
          referencedColumnNames: ['id_usuario'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'sys_usuario_rol_global',
        new TableForeignKey({
          name: 'FK_usuario_rol_global_app',
          columnNames: ['id_app'],
          referencedTableName: 'sys_apps',
          referencedColumnNames: ['id_app'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'sys_usuario_rol_global',
        new TableForeignKey({
          name: 'FK_usuario_rol_global_rol',
          columnNames: ['id_rol'],
          referencedTableName: 'sys_roles',
          referencedColumnNames: ['id_rol'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    if (!(await queryRunner.hasTable('sys_usuario_rol_exclusion'))) {
      await queryRunner.createTable(
        new Table({
          name: 'sys_usuario_rol_exclusion',
          columns: [
            {
              name: 'id_usuario_rol_exclusion',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_usuario', type: 'int', isNullable: false },
            { name: 'id_empresa', type: 'int', isNullable: false },
            { name: 'id_app', type: 'int', isNullable: false },
            { name: 'id_rol', type: 'int', isNullable: false },
            { name: 'estado_usuario_rol_exclusion', type: 'tinyint', width: 1, default: 1 },
            { name: 'fecha_creacion_usuario_rol_exclusion', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion_usuario_rol_exclusion',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
            { name: 'creado_por_usuario_rol_exclusion', type: 'int', isNullable: false },
            { name: 'modificado_por_usuario_rol_exclusion', type: 'int', isNullable: false },
          ],
          uniques: [{
            name: 'UQ_usuario_rol_exclusion',
            columnNames: ['id_usuario', 'id_empresa', 'id_app', 'id_rol'],
          }],
        }),
      );

      await queryRunner.createForeignKey(
        'sys_usuario_rol_exclusion',
        new TableForeignKey({
          name: 'FK_usuario_rol_exclusion_usuario',
          columnNames: ['id_usuario'],
          referencedTableName: 'sys_usuarios',
          referencedColumnNames: ['id_usuario'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'sys_usuario_rol_exclusion',
        new TableForeignKey({
          name: 'FK_usuario_rol_exclusion_empresa',
          columnNames: ['id_empresa'],
          referencedTableName: 'sys_empresas',
          referencedColumnNames: ['id_empresa'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'sys_usuario_rol_exclusion',
        new TableForeignKey({
          name: 'FK_usuario_rol_exclusion_app',
          columnNames: ['id_app'],
          referencedTableName: 'sys_apps',
          referencedColumnNames: ['id_app'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'sys_usuario_rol_exclusion',
        new TableForeignKey({
          name: 'FK_usuario_rol_exclusion_rol',
          columnNames: ['id_rol'],
          referencedTableName: 'sys_roles',
          referencedColumnNames: ['id_rol'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );

      await queryRunner.createIndex(
        'sys_usuario_rol_exclusion',
        new TableIndex({ name: 'IDX_usuario_rol_exclusion_usuario', columnNames: ['id_usuario'] }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('sys_usuario_rol_exclusion')) {
      await queryRunner.dropTable('sys_usuario_rol_exclusion');
    }
    if (await queryRunner.hasTable('sys_usuario_rol_global')) {
      await queryRunner.dropTable('sys_usuario_rol_global');
    }
  }
}
