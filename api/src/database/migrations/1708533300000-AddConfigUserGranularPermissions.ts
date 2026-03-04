import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade permisos granulares para la configuración de usuarios.
 * Permite separar: asignar empresas, asignar apps, asignar roles, denegar permisos.
 */
export class AddConfigUserGranularPermissions1708533300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryRunner.query(`
      INSERT INTO sys_permisos (codigo_permiso, nombre_permiso, descripcion_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso)
      VALUES
        ('config:users:assign-companies', 'Asignar empresas a usuarios', 'Permite marcar o desmarcar empresas para un usuario en la pestaña Empresas', 'config', 1, '${now}'),
        ('config:users:assign-apps', 'Asignar aplicaciones a usuarios', 'Permite asignar o revocar KPITAL 360 y TimeWise a un usuario', 'config', 1, '${now}'),
        ('config:users:assign-roles', 'Asignar roles a usuarios', 'Permite asignar roles globales y por contexto a un usuario', 'config', 1, '${now}'),
        ('config:users:deny-permissions', 'Denegar permisos globalmente', 'Permite configurar excepciones de permisos que el usuario no tendrá en ninguna empresa', 'config', 1, '${now}')
      ON DUPLICATE KEY UPDATE nombre_permiso = VALUES(nombre_permiso), descripcion_permiso = VALUES(descripcion_permiso)
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      CROSS JOIN sys_permisos p
      WHERE r.codigo_rol = 'MASTER'
        AND p.codigo_permiso IN ('config:users:assign-companies', 'config:users:assign-apps', 'config:users:assign-roles', 'config:users:deny-permissions')
        AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN ('config:users:assign-companies', 'config:users:assign-apps', 'config:users:assign-roles', 'config:users:deny-permissions')
    `);
    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN ('config:users:assign-companies', 'config:users:assign-apps', 'config:users:assign-roles', 'config:users:deny-permissions')
    `);
  }
}
