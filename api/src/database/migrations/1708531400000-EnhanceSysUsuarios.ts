import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Directiva 15 — Enhance sys_usuarios con columnas enterprise.
 *
 * NUEVAS COLUMNAS:
 *   username_usuario, password_updated_at_usuario, requires_password_reset_usuario,
 *   motivo_inactivacion_usuario, failed_attempts_usuario, locked_until_usuario,
 *   last_login_ip_usuario
 *
 * COLUMNAS MODIFICADAS (→ nullable):
 *   password_hash_usuario, creado_por_usuario, modificado_por_usuario
 *
 * NUEVOS ÍNDICES:
 *   IDX_usuario_username (UNIQUE), IDX_usuario_ultimo_login
 *
 * ESTADOS: 1=ACTIVO, 2=INACTIVO, 3=BLOQUEADO
 */
export class EnhanceSysUsuarios1708531400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Nuevas columnas ---

    await queryRunner.addColumn('sys_usuarios', new TableColumn({
      name: 'username_usuario',
      type: 'varchar',
      length: '50',
      isNullable: true,
      isUnique: true,
    }));

    await queryRunner.addColumn('sys_usuarios', new TableColumn({
      name: 'password_updated_at_usuario',
      type: 'datetime',
      isNullable: true,
    }));

    await queryRunner.addColumn('sys_usuarios', new TableColumn({
      name: 'requires_password_reset_usuario',
      type: 'tinyint',
      width: 1,
      default: 0,
      isNullable: false,
    }));

    await queryRunner.addColumn('sys_usuarios', new TableColumn({
      name: 'motivo_inactivacion_usuario',
      type: 'varchar',
      length: '300',
      isNullable: true,
    }));

    await queryRunner.addColumn('sys_usuarios', new TableColumn({
      name: 'failed_attempts_usuario',
      type: 'int',
      default: 0,
      isNullable: false,
    }));

    await queryRunner.addColumn('sys_usuarios', new TableColumn({
      name: 'locked_until_usuario',
      type: 'datetime',
      isNullable: true,
    }));

    await queryRunner.addColumn('sys_usuarios', new TableColumn({
      name: 'last_login_ip_usuario',
      type: 'varchar',
      length: '45',
      isNullable: true,
    }));

    // --- Modificar columnas existentes → nullable ---

    await queryRunner.changeColumn('sys_usuarios', 'password_hash_usuario', new TableColumn({
      name: 'password_hash_usuario',
      type: 'varchar',
      length: '255',
      isNullable: true,
    }));

    await queryRunner.changeColumn('sys_usuarios', 'creado_por_usuario', new TableColumn({
      name: 'creado_por_usuario',
      type: 'int',
      isNullable: true,
    }));

    await queryRunner.changeColumn('sys_usuarios', 'modificado_por_usuario', new TableColumn({
      name: 'modificado_por_usuario',
      type: 'int',
      isNullable: true,
    }));

    // --- Nuevos índices ---

    await queryRunner.createIndex('sys_usuarios', new TableIndex({
      name: 'IDX_usuario_username',
      columnNames: ['username_usuario'],
      isUnique: true,
    }));

    await queryRunner.createIndex('sys_usuarios', new TableIndex({
      name: 'IDX_usuario_ultimo_login',
      columnNames: ['ultimo_login_usuario'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sys_usuarios', 'IDX_usuario_ultimo_login');
    await queryRunner.dropIndex('sys_usuarios', 'IDX_usuario_username');

    // Revertir columnas a NOT NULL
    await queryRunner.changeColumn('sys_usuarios', 'modificado_por_usuario', new TableColumn({
      name: 'modificado_por_usuario',
      type: 'int',
      isNullable: false,
    }));

    await queryRunner.changeColumn('sys_usuarios', 'creado_por_usuario', new TableColumn({
      name: 'creado_por_usuario',
      type: 'int',
      isNullable: false,
    }));

    await queryRunner.changeColumn('sys_usuarios', 'password_hash_usuario', new TableColumn({
      name: 'password_hash_usuario',
      type: 'varchar',
      length: '255',
      isNullable: false,
    }));

    // Eliminar columnas nuevas
    await queryRunner.dropColumn('sys_usuarios', 'last_login_ip_usuario');
    await queryRunner.dropColumn('sys_usuarios', 'locked_until_usuario');
    await queryRunner.dropColumn('sys_usuarios', 'failed_attempts_usuario');
    await queryRunner.dropColumn('sys_usuarios', 'motivo_inactivacion_usuario');
    await queryRunner.dropColumn('sys_usuarios', 'requires_password_reset_usuario');
    await queryRunner.dropColumn('sys_usuarios', 'password_updated_at_usuario');
    await queryRunner.dropColumn('sys_usuarios', 'username_usuario');
  }
}
