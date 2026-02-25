import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddViewPermissionsForOrgCatalogs1708535100000 implements MigrationInterface {
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
        ('class:view', 'Ver/listar clases', 'Permite ver y listar clases organizacionales', 'class', 1, '${now}'),
        ('project:view', 'Ver/listar proyectos', 'Permite ver y listar proyectos organizacionales', 'project', 1, '${now}'),
        ('department:view', 'Ver/listar departamentos', 'Permite ver y listar departamentos organizacionales', 'department', 1, '${now}')
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
      INNER JOIN sys_permisos p
        ON p.codigo_permiso IN ('class:view', 'project:view', 'department:view')
       AND p.estado_permiso = 1
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT legacy.id_rol, pnew.id_permiso, '${now}'
      FROM (
        SELECT DISTINCT rp.id_rol
        FROM sys_rol_permiso rp
        INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
        WHERE p.codigo_permiso = 'config:clases'
      ) legacy
      INNER JOIN sys_permisos pnew
        ON pnew.codigo_permiso = 'class:view'
       AND pnew.estado_permiso = 1
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT legacy.id_rol, pnew.id_permiso, '${now}'
      FROM (
        SELECT DISTINCT rp.id_rol
        FROM sys_rol_permiso rp
        INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
        WHERE p.codigo_permiso = 'config:proyectos'
      ) legacy
      INNER JOIN sys_permisos pnew
        ON pnew.codigo_permiso = 'project:view'
       AND pnew.estado_permiso = 1
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT legacy.id_rol, pnew.id_permiso, '${now}'
      FROM (
        SELECT DISTINCT rp.id_rol
        FROM sys_rol_permiso rp
        INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
        WHERE p.codigo_permiso = 'config:departamentos'
      ) legacy
      INNER JOIN sys_permisos pnew
        ON pnew.codigo_permiso = 'department:view'
       AND pnew.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN ('class:view', 'project:view', 'department:view')
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN ('class:view', 'project:view', 'department:view')
    `);
  }
}
