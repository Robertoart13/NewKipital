import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Agrega identidad Microsoft Entra ID a sys_usuarios.
 * Mapping enterprise recomendado: microsoft_oid + microsoft_tid.
 */
export class AddMicrosoftIdentityToSysUsuarios1708532100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasMicrosoftOid = await queryRunner.hasColumn(
      'sys_usuarios',
      'microsoft_oid_usuario',
    );
    if (!hasMicrosoftOid) {
      await queryRunner.addColumn(
        'sys_usuarios',
        new TableColumn({
          name: 'microsoft_oid_usuario',
          type: 'varchar',
          length: '64',
          isNullable: true,
        }),
      );
    }

    const hasMicrosoftTid = await queryRunner.hasColumn(
      'sys_usuarios',
      'microsoft_tid_usuario',
    );
    if (!hasMicrosoftTid) {
      await queryRunner.addColumn(
        'sys_usuarios',
        new TableColumn({
          name: 'microsoft_tid_usuario',
          type: 'varchar',
          length: '64',
          isNullable: true,
        }),
      );
    }

    const usuariosTable = await queryRunner.getTable('sys_usuarios');
    const hasMicrosoftIndex = usuariosTable?.indices.some(
      (index) => index.name === 'IDX_usuario_microsoft_oid_tid',
    );
    if (!hasMicrosoftIndex) {
      await queryRunner.createIndex(
        'sys_usuarios',
        new TableIndex({
          name: 'IDX_usuario_microsoft_oid_tid',
          columnNames: ['microsoft_oid_usuario', 'microsoft_tid_usuario'],
          isUnique: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usuariosTable = await queryRunner.getTable('sys_usuarios');
    const hasMicrosoftIndex = usuariosTable?.indices.some(
      (index) => index.name === 'IDX_usuario_microsoft_oid_tid',
    );
    if (hasMicrosoftIndex) {
      await queryRunner.dropIndex(
        'sys_usuarios',
        'IDX_usuario_microsoft_oid_tid',
      );
    }

    const hasMicrosoftTid = await queryRunner.hasColumn(
      'sys_usuarios',
      'microsoft_tid_usuario',
    );
    if (hasMicrosoftTid) {
      await queryRunner.dropColumn('sys_usuarios', 'microsoft_tid_usuario');
    }

    const hasMicrosoftOid = await queryRunner.hasColumn(
      'sys_usuarios',
      'microsoft_oid_usuario',
    );
    if (hasMicrosoftOid) {
      await queryRunner.dropColumn('sys_usuarios', 'microsoft_oid_usuario');
    }
  }
}
