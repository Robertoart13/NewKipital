import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSysAuditoriaAcciones1708533500000 implements MigrationInterface {
  name = 'CreateSysAuditoriaAcciones1708533500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('sys_auditoria_acciones');
    if (exists) return;

    await queryRunner.createTable(
      new Table({
        name: 'sys_auditoria_acciones',
        columns: [
          {
            name: 'id_auditoria_accion',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            unsigned: true,
          },
          { name: 'modulo_auditoria', type: 'varchar', length: '80' },
          { name: 'accion_auditoria', type: 'varchar', length: '80' },
          { name: 'entidad_auditoria', type: 'varchar', length: '80' },
          {
            name: 'id_entidad_auditoria',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          { name: 'id_usuario_actor_auditoria', type: 'int', isNullable: true },
          {
            name: 'id_empresa_contexto_auditoria',
            type: 'int',
            isNullable: true,
          },
          { name: 'descripcion_auditoria', type: 'varchar', length: '500' },
          { name: 'payload_before_auditoria', type: 'json', isNullable: true },
          { name: 'payload_after_auditoria', type: 'json', isNullable: true },
          { name: 'metadata_auditoria', type: 'json', isNullable: true },
          {
            name: 'ip_auditoria',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'user_agent_auditoria',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fecha_creacion_auditoria',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('sys_auditoria_acciones', [
      new TableIndex({
        name: 'IDX_auditoria_modulo_entidad',
        columnNames: ['modulo_auditoria', 'entidad_auditoria'],
      }),
      new TableIndex({
        name: 'IDX_auditoria_entidad_id',
        columnNames: ['entidad_auditoria', 'id_entidad_auditoria'],
      }),
      new TableIndex({
        name: 'IDX_auditoria_actor',
        columnNames: ['id_usuario_actor_auditoria'],
      }),
      new TableIndex({
        name: 'IDX_auditoria_fecha',
        columnNames: ['fecha_creacion_auditoria'],
      }),
    ]);

    // Backfill: asignar todas las empresas existentes a usuarios MASTER activos.
    await queryRunner.query(`
      INSERT INTO sys_usuario_empresa (
        id_usuario,
        id_empresa,
        estado_usuario_empresa,
        fecha_asignacion_usuario_empresa
      )
      SELECT DISTINCT u.id_usuario, e.id_empresa, 1, NOW()
      FROM sys_usuarios u
      INNER JOIN sys_roles r ON r.codigo_rol = 'MASTER' AND r.estado_rol = 1
      INNER JOIN sys_empresas e
      LEFT JOIN sys_usuario_rol ur
        ON ur.id_usuario = u.id_usuario
       AND ur.id_rol = r.id_rol
       AND ur.estado_usuario_rol = 1
      LEFT JOIN sys_usuario_rol_global urg
        ON urg.id_usuario = u.id_usuario
       AND urg.id_rol = r.id_rol
       AND urg.estado_usuario_rol_global = 1
      WHERE u.estado_usuario = 1
        AND (ur.id_usuario_rol IS NOT NULL OR urg.id_usuario_rol_global IS NOT NULL)
      ON DUPLICATE KEY UPDATE estado_usuario_empresa = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('sys_auditoria_acciones');
    if (!exists) return;
    await queryRunner.dropTable('sys_auditoria_acciones');
  }
}
