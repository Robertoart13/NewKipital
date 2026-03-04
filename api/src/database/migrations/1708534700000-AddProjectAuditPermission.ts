import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectAuditPermission1708534700000 implements MigrationInterface {
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
      VALUES (
        'config:proyectos:audit',
        'Ver bitacora de proyectos',
        'Permite ver la bitacora de cambios de proyectos organizacionales',
        'config',
        1,
        '${now}'
      )
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
      `,
    );

    await queryRunner.query(
      `
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p
        ON p.codigo_permiso = 'config:proyectos:audit'
        AND p.estado_permiso = 1
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso = 'config:proyectos:audit'
      `,
    );

    await queryRunner.query(
      `
      DELETE FROM sys_permisos
      WHERE codigo_permiso = 'config:proyectos:audit'
      `,
    );
  }
}
