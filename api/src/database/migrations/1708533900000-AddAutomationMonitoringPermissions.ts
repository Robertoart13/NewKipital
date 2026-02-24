import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutomationMonitoringPermissions1708533900000 implements MigrationInterface {
  name = 'AddAutomationMonitoringPermissions1708533900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryRunner.query(
      `
      INSERT INTO sys_permisos
        (codigo_permiso, nombre_permiso, descripcion_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso, fecha_modificacion_permiso)
      VALUES
        ('automation:monitor', 'Monitoreo de Automatizaciones', 'Permite visualizar métricas operativas de workers y colas sin exponer PII', 'ops', 1, '${now}', '${now}'),
        ('automation:admin', 'Administración de Automatizaciones', 'Permite ejecutar acciones operativas sobre colas: re-scan, release-stuck, requeue', 'ops', 1, '${now}', '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = 1,
        fecha_modificacion_permiso = '${now}'
    `,
    );

    await queryRunner.query(
      `
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, NOW()
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN ('automation:monitor', 'automation:admin')
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA', 'DEVOPS')
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN ('automation:monitor', 'automation:admin')
    `,
    );

    await queryRunner.query(
      `
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN ('automation:monitor', 'automation:admin')
    `,
    );
  }
}
