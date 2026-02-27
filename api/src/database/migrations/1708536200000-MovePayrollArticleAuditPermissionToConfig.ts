import { MigrationInterface, QueryRunner } from 'typeorm';

export class MovePayrollArticleAuditPermissionToConfig1708536200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryRunner.query(`
      UPDATE sys_permisos
      SET
        codigo_permiso = 'config:payroll-articles:audit',
        nombre_permiso = 'Ver bitacora articulos de nomina',
        descripcion_permiso = 'Permite ver la bitacora de articulos de nomina',
        modulo_permiso = 'config',
        estado_permiso = 1
      WHERE codigo_permiso = 'payroll-article:audit'
    `);

    await queryRunner.query(`
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      )
      SELECT
        'config:payroll-articles:audit',
        'Ver bitacora articulos de nomina',
        'Permite ver la bitacora de articulos de nomina',
        'config',
        1,
        '${now}'
      WHERE NOT EXISTS (
        SELECT 1 FROM sys_permisos WHERE codigo_permiso = 'config:payroll-articles:audit'
      )
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso = 'config:payroll-articles:audit'
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
        AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE sys_permisos
      SET
        codigo_permiso = 'payroll-article:audit',
        nombre_permiso = 'Ver bitacora articulos de nomina',
        descripcion_permiso = 'Permite ver la bitacora de articulos de nomina',
        modulo_permiso = 'payroll-article',
        estado_permiso = 1
      WHERE codigo_permiso = 'config:payroll-articles:audit'
    `);
  }
}
