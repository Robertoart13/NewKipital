import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPositionsPermissions1708535500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
        ('config:puestos', 'Ver puestos', 'Permite listar y consultar puestos organizacionales', 'config', 1, '${now}'),
        ('position:create', 'Crear puestos', 'Permite crear nuevos puestos', 'position', 1, '${now}'),
        ('position:edit', 'Editar puestos', 'Permite editar puestos', 'position', 1, '${now}'),
        ('position:inactivate', 'Inactivar puestos', 'Permite inactivar puestos', 'position', 1, '${now}'),
        ('position:reactivate', 'Reactivar puestos', 'Permite reactivar puestos', 'position', 1, '${now}')
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
        'config:puestos',
        'position:create',
        'position:edit',
        'position:inactivate',
        'position:reactivate'
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
        'config:puestos',
        'position:create',
        'position:edit',
        'position:inactivate',
        'position:reactivate'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'config:puestos',
        'position:create',
        'position:edit',
        'position:inactivate',
        'position:reactivate'
      )
    `);
  }
}
