import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Directiva 14 — Core Identity Schema.
 * Crea las 7 tablas del modelo de identidad enterprise:
 * sys_usuarios, sys_apps, sys_usuario_app, sys_usuario_empresa,
 * sys_roles, sys_permisos, sys_rol_permiso, sys_usuario_rol.
 *
 * Orden de creación respeta dependencias de FK.
 * NO delete físico. Solo inactivación lógica.
 */
export class CreateIdentitySchema1708531300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. sys_usuarios ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_usuarios',
        columns: [
          {
            name: 'id_usuario',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email_usuario',
            type: 'varchar',
            length: '150',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'password_hash_usuario',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'nombre_usuario',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'apellido_usuario',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'telefono_usuario',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'avatar_url_usuario',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          { name: 'estado_usuario', type: 'tinyint', width: 1, default: 1 },
          { name: 'ultimo_login_usuario', type: 'datetime', isNullable: true },
          {
            name: 'fecha_creacion_usuario',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_usuario',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_inactivacion_usuario',
            type: 'datetime',
            isNullable: true,
          },
          { name: 'creado_por_usuario', type: 'int', isNullable: false },
          { name: 'modificado_por_usuario', type: 'int', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_usuarios',
      new TableIndex({
        name: 'IDX_usuario_email',
        columnNames: ['email_usuario'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'sys_usuarios',
      new TableIndex({
        name: 'IDX_usuario_estado',
        columnNames: ['estado_usuario'],
      }),
    );

    // ─── 2. sys_apps ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_apps',
        columns: [
          {
            name: 'id_app',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'codigo_app',
            type: 'varchar',
            length: '20',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'nombre_app',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'descripcion_app',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          { name: 'url_app', type: 'varchar', length: '300', isNullable: true },
          {
            name: 'icono_app',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          { name: 'estado_app', type: 'tinyint', width: 1, default: 1 },
          {
            name: 'fecha_creacion_app',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_app',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_apps',
      new TableIndex({
        name: 'IDX_app_codigo',
        columnNames: ['codigo_app'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'sys_apps',
      new TableIndex({
        name: 'IDX_app_estado',
        columnNames: ['estado_app'],
      }),
    );

    // ─── 3. sys_usuario_app ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_usuario_app',
        columns: [
          {
            name: 'id_usuario_app',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_usuario', type: 'int', isNullable: false },
          { name: 'id_app', type: 'int', isNullable: false },
          { name: 'estado_usuario_app', type: 'tinyint', width: 1, default: 1 },
          {
            name: 'fecha_asignacion_usuario_app',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_usuario_app',
      new TableIndex({
        name: 'UQ_usuario_app',
        columnNames: ['id_usuario', 'id_app'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'sys_usuario_app',
      new TableForeignKey({
        name: 'FK_usuario_app_usuario',
        columnNames: ['id_usuario'],
        referencedTableName: 'sys_usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_usuario_app',
      new TableForeignKey({
        name: 'FK_usuario_app_app',
        columnNames: ['id_app'],
        referencedTableName: 'sys_apps',
        referencedColumnNames: ['id_app'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // ─── 4. sys_usuario_empresa ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_usuario_empresa',
        columns: [
          {
            name: 'id_usuario_empresa',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_usuario', type: 'int', isNullable: false },
          { name: 'id_empresa', type: 'int', isNullable: false },
          {
            name: 'estado_usuario_empresa',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          {
            name: 'fecha_asignacion_usuario_empresa',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_usuario_empresa',
      new TableIndex({
        name: 'UQ_usuario_empresa',
        columnNames: ['id_usuario', 'id_empresa'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'sys_usuario_empresa',
      new TableForeignKey({
        name: 'FK_usuario_empresa_usuario',
        columnNames: ['id_usuario'],
        referencedTableName: 'sys_usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_usuario_empresa',
      new TableForeignKey({
        name: 'FK_usuario_empresa_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // ─── 5. sys_roles ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_roles',
        columns: [
          {
            name: 'id_rol',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'codigo_rol',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'nombre_rol',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'descripcion_rol',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          { name: 'estado_rol', type: 'tinyint', width: 1, default: 1 },
          {
            name: 'fecha_creacion_rol',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_rol',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'creado_por_rol', type: 'int', isNullable: false },
          { name: 'modificado_por_rol', type: 'int', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_roles',
      new TableIndex({
        name: 'IDX_rol_codigo',
        columnNames: ['codigo_rol'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'sys_roles',
      new TableIndex({
        name: 'IDX_rol_estado',
        columnNames: ['estado_rol'],
      }),
    );

    // ─── 6. sys_permisos ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_permisos',
        columns: [
          {
            name: 'id_permiso',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'codigo_permiso',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'nombre_permiso',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'descripcion_permiso',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          {
            name: 'modulo_permiso',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          { name: 'estado_permiso', type: 'tinyint', width: 1, default: 1 },
          {
            name: 'fecha_creacion_permiso',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_permisos',
      new TableIndex({
        name: 'IDX_permiso_codigo',
        columnNames: ['codigo_permiso'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'sys_permisos',
      new TableIndex({
        name: 'IDX_permiso_modulo',
        columnNames: ['modulo_permiso'],
      }),
    );
    await queryRunner.createIndex(
      'sys_permisos',
      new TableIndex({
        name: 'IDX_permiso_estado',
        columnNames: ['estado_permiso'],
      }),
    );

    // ─── 7. sys_rol_permiso ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_rol_permiso',
        columns: [
          {
            name: 'id_rol_permiso',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_rol', type: 'int', isNullable: false },
          { name: 'id_permiso', type: 'int', isNullable: false },
          {
            name: 'fecha_asignacion_rol_permiso',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_rol_permiso',
      new TableIndex({
        name: 'UQ_rol_permiso',
        columnNames: ['id_rol', 'id_permiso'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'sys_rol_permiso',
      new TableForeignKey({
        name: 'FK_rol_permiso_rol',
        columnNames: ['id_rol'],
        referencedTableName: 'sys_roles',
        referencedColumnNames: ['id_rol'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_rol_permiso',
      new TableForeignKey({
        name: 'FK_rol_permiso_permiso',
        columnNames: ['id_permiso'],
        referencedTableName: 'sys_permisos',
        referencedColumnNames: ['id_permiso'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // ─── 8. sys_usuario_rol (TABLA CORE) ───
    await queryRunner.createTable(
      new Table({
        name: 'sys_usuario_rol',
        columns: [
          {
            name: 'id_usuario_rol',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_usuario', type: 'int', isNullable: false },
          { name: 'id_rol', type: 'int', isNullable: false },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'id_app', type: 'int', isNullable: false },
          { name: 'estado_usuario_rol', type: 'tinyint', width: 1, default: 1 },
          {
            name: 'fecha_asignacion_usuario_rol',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_usuario_rol',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'creado_por_usuario_rol', type: 'int', isNullable: false },
          {
            name: 'modificado_por_usuario_rol',
            type: 'int',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_usuario_rol',
      new TableIndex({
        name: 'UQ_usuario_rol_empresa_app',
        columnNames: ['id_usuario', 'id_rol', 'id_empresa', 'id_app'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'sys_usuario_rol',
      new TableIndex({
        name: 'IDX_usuario_rol_empresa',
        columnNames: ['id_empresa'],
      }),
    );
    await queryRunner.createIndex(
      'sys_usuario_rol',
      new TableIndex({
        name: 'IDX_usuario_rol_app',
        columnNames: ['id_app'],
      }),
    );

    await queryRunner.createForeignKey(
      'sys_usuario_rol',
      new TableForeignKey({
        name: 'FK_usuario_rol_usuario',
        columnNames: ['id_usuario'],
        referencedTableName: 'sys_usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_usuario_rol',
      new TableForeignKey({
        name: 'FK_usuario_rol_rol',
        columnNames: ['id_rol'],
        referencedTableName: 'sys_roles',
        referencedColumnNames: ['id_rol'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_usuario_rol',
      new TableForeignKey({
        name: 'FK_usuario_rol_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_usuario_rol',
      new TableForeignKey({
        name: 'FK_usuario_rol_app',
        columnNames: ['id_app'],
        referencedTableName: 'sys_apps',
        referencedColumnNames: ['id_app'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Orden inverso: primero las tablas con FK
    await queryRunner.dropTable('sys_usuario_rol');
    await queryRunner.dropTable('sys_rol_permiso');
    await queryRunner.dropTable('sys_permisos');
    await queryRunner.dropTable('sys_roles');
    await queryRunner.dropTable('sys_usuario_empresa');
    await queryRunner.dropTable('sys_usuario_app');
    await queryRunner.dropTable('sys_apps');
    await queryRunner.dropTable('sys_usuarios');
  }
}
