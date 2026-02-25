import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentsPermissions1708534800000 implements MigrationInterface {
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
        ('config:departamentos', 'Ver departamentos', 'Permite listar y consultar departamentos', 'config', 1, '${now}'),
        ('department:create', 'Crear departamentos', 'Permite crear nuevos departamentos', 'department', 1, '${now}'),
        ('department:edit', 'Editar departamentos', 'Permite editar departamentos', 'department', 1, '${now}'),
        ('department:inactivate', 'Inactivar departamentos', 'Permite inactivar departamentos', 'department', 1, '${now}'),
        ('department:reactivate', 'Reactivar departamentos', 'Permite reactivar departamentos', 'department', 1, '${now}')
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
        'config:departamentos',
        'department:create',
        'department:edit',
        'department:inactivate',
        'department:reactivate'
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
        'config:departamentos',
        'department:create',
        'department:edit',
        'department:inactivate',
        'department:reactivate'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'config:departamentos',
        'department:create',
        'department:edit',
        'department:inactivate',
        'department:reactivate'
      )
    `);
  }
}
