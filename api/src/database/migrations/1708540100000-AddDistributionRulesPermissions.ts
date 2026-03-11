import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDistributionRulesPermissions1708540100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryRunner.query(
      `
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      )
      VALUES
        ('config:reglas-distribucion', 'Listar reglas de distribucion', 'Permite listar reglas de distribucion en Configuracion', 'config', 1, ?),
        ('config:reglas-distribucion:view', 'Ver regla de distribucion', 'Permite ver detalle de una regla de distribucion', 'config', 1, ?),
        ('config:reglas-distribucion:edit', 'Editar regla de distribucion', 'Permite editar reglas de distribucion', 'config', 1, ?),
        ('config:reglas-distribucion:audit', 'Ver bitacora de reglas de distribucion', 'Permite consultar bitacora de cambios de reglas de distribucion', 'config', 1, ?)
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
      `,
      [now, now, now, now],
    );

    await queryRunner.query(
      `
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, ?
      FROM sys_roles r
      INNER JOIN sys_permisos p
        ON p.codigo_permiso IN (
          'config:reglas-distribucion',
          'config:reglas-distribucion:view',
          'config:reglas-distribucion:edit',
          'config:reglas-distribucion:audit'
        )
       AND p.estado_permiso = 1
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
      `,
      [now],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN (
        'config:reglas-distribucion',
        'config:reglas-distribucion:view',
        'config:reglas-distribucion:edit',
        'config:reglas-distribucion:audit'
      )
      `,
    );

    await queryRunner.query(
      `
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'config:reglas-distribucion',
        'config:reglas-distribucion:view',
        'config:reglas-distribucion:edit',
        'config:reglas-distribucion:audit'
      )
      `,
    );
  }
}
