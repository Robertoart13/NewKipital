import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Sistema de notificaciones enterprise.
 * Tablas: sys_notificaciones (evento global) + sys_notificacion_usuarios (estado por destinatario).
 */
export class CreateSysNotificaciones1708532600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sys_notificaciones',
        columns: [
          { name: 'id_notificacion', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'tipo_notificacion', type: 'varchar', length: '60', isNullable: false },
          { name: 'titulo_notificacion', type: 'varchar', length: '200', isNullable: false },
          { name: 'mensaje_notificacion', type: 'text', isNullable: true },
          { name: 'payload_notificacion', type: 'json', isNullable: true },
          { name: 'scope_notificacion', type: 'varchar', length: '20', isNullable: false, default: "'ROLE'" },
          { name: 'id_app', type: 'int', isNullable: true },
          { name: 'id_empresa', type: 'int', isNullable: true },
          { name: 'creado_por_notificacion', type: 'int', isNullable: false },
          { name: 'fecha_creacion_notificacion', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'fecha_expira_notificacion', type: 'datetime', isNullable: true },
          { name: 'estado_notificacion', type: 'tinyint', width: 1, default: 1 },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('sys_notificaciones', new TableIndex({
      name: 'IDX_notif_tipo',
      columnNames: ['tipo_notificacion'],
    }));
    await queryRunner.createIndex('sys_notificaciones', new TableIndex({
      name: 'IDX_notif_fecha',
      columnNames: ['fecha_creacion_notificacion'],
    }));

    await queryRunner.createForeignKey('sys_notificaciones', new TableForeignKey({
      name: 'FK_notif_app',
      columnNames: ['id_app'],
      referencedTableName: 'sys_apps',
      referencedColumnNames: ['id_app'],
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('sys_notificaciones', new TableForeignKey({
      name: 'FK_notif_empresa',
      columnNames: ['id_empresa'],
      referencedTableName: 'sys_empresas',
      referencedColumnNames: ['id_empresa'],
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('sys_notificaciones', new TableForeignKey({
      name: 'FK_notif_creador',
      columnNames: ['creado_por_notificacion'],
      referencedTableName: 'sys_usuarios',
      referencedColumnNames: ['id_usuario'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createTable(
      new Table({
        name: 'sys_notificacion_usuarios',
        columns: [
          { name: 'id_notificacion_usuario', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'id_notificacion', type: 'int', isNullable: false },
          { name: 'id_usuario_destino', type: 'int', isNullable: false },
          { name: 'estado_notificacion_usuario', type: 'varchar', length: '20', isNullable: false, default: "'UNREAD'" },
          { name: 'fecha_entregada_notificacion_usuario', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'fecha_leida_notificacion_usuario', type: 'datetime', isNullable: true },
          { name: 'fecha_eliminada_notificacion_usuario', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('sys_notificacion_usuarios', new TableIndex({
      name: 'UQ_notif_usuario',
      columnNames: ['id_notificacion', 'id_usuario_destino'],
      isUnique: true,
    }));
    await queryRunner.createIndex('sys_notificacion_usuarios', new TableIndex({
      name: 'IDX_notif_user_usuario',
      columnNames: ['id_usuario_destino'],
    }));
    await queryRunner.createIndex('sys_notificacion_usuarios', new TableIndex({
      name: 'IDX_notif_user_estado',
      columnNames: ['estado_notificacion_usuario'],
    }));

    await queryRunner.createForeignKey('sys_notificacion_usuarios', new TableForeignKey({
      name: 'FK_notif_user_notif',
      columnNames: ['id_notificacion'],
      referencedTableName: 'sys_notificaciones',
      referencedColumnNames: ['id_notificacion'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('sys_notificacion_usuarios', new TableForeignKey({
      name: 'FK_notif_user_usuario',
      columnNames: ['id_usuario_destino'],
      referencedTableName: 'sys_usuarios',
      referencedColumnNames: ['id_usuario'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sys_notificacion_usuarios');
    await queryRunner.dropTable('sys_notificaciones');
  }
}
