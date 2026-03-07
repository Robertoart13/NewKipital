import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sincroniza el catálogo de permisos con el set enterprise actual y
 * añade permisos granulares de empresas.
 *
 * Objetivos:
 * 1) Garantizar que los permisos existentes en BD queden representados por migración.
 * 2) Añadir permisos de empresa por acción (view/create/edit/inactivate/reactivate).
 * 3) Mantener compatibilidad con company:manage (legacy).
 * 4) Asignar permisos de empresa a roles administrativos y a roles que ya tenían company:manage.
 */
export class SyncPermissionCatalogAndCompanyGranular1708533400000 implements MigrationInterface {
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
        ('config:permissions', 'Gestionar permisos', 'Permite administrar el catálogo de permisos del sistema', 'config', 1, '${now}'),
        ('config:roles', 'Gestionar roles', 'Permite crear, editar y administrar roles', 'config', 1, '${now}'),
        ('config:users', 'Gestionar usuarios', 'Permite acceder a la configuración de usuarios', 'config', 1, '${now}'),
        ('config:users:assign-apps', 'Asignar aplicaciones a usuarios', 'Permite asignar o revocar KPITAL 360 y TimeWise a un usuario', 'config', 1, '${now}'),
        ('config:users:assign-companies', 'Asignar empresas a usuarios', 'Permite marcar o desmarcar empresas para un usuario en la pestaña Empresas', 'config', 1, '${now}'),
        ('config:users:assign-roles', 'Asignar roles a usuarios', 'Permite asignar roles globales y por contexto a un usuario', 'config', 1, '${now}'),
        ('config:users:deny-permissions', 'Denegar permisos globalmente', 'Permite configurar excepciones de permisos que el usuario no tendrá en ninguna empresa', 'config', 1, '${now}'),

        ('employee:assign-kpital-role', 'Asignar roles KPITAL al crear empleado', 'Permite definir roles KPITAL durante el alta de empleado', 'employee', 1, '${now}'),
        ('employee:assign-timewise-role', 'Asignar roles TimeWise al crear empleado', 'Permite definir roles TimeWise durante el alta de empleado', 'employee', 1, '${now}'),
        ('employee:create', 'Crear empleados', 'Permite crear nuevos empleados', 'employee', 1, '${now}'),
        ('employee:edit', 'Editar empleados', 'Permite editar información de empleados', 'employee', 1, '${now}'),
        ('employee:inactivate', 'Inactivar empleados', 'Permite inactivar empleados', 'employee', 1, '${now}'),
        ('employee:reactivate', 'Reactivar empleados', 'Permite reactivar empleados', 'employee', 1, '${now}'),
        ('employee:view', 'Ver/listar empleados', 'Permite ver y listar empleados', 'employee', 1, '${now}'),

        ('timewise:distribucion-costo-create', 'Crear distribución de costo', 'Permite crear reglas de distribución de costo en TimeWise', 'timewise', 1, '${now}'),
        ('timewise:distribucion-costo-edit', 'Editar distribución de costo', 'Permite editar reglas de distribución de costo en TimeWise', 'timewise', 1, '${now}'),
        ('timewise:distribucion-costo-view', 'Ver lista distribución de costo', 'Permite listar reglas de distribución de costo en TimeWise', 'timewise', 1, '${now}'),

        ('company:manage', 'Gestionar empresas (legacy)', 'Permiso legacy para gestión integral de empresas', 'company', 1, '${now}'),
        ('company:view', 'Ver empresas', 'Permite listar y consultar empresas', 'company', 1, '${now}'),
        ('company:create', 'Crear empresas', 'Permite crear nuevas empresas', 'company', 1, '${now}'),
        ('company:edit', 'Editar empresas', 'Permite editar empresas', 'company', 1, '${now}'),
        ('company:inactivate', 'Inactivar empresas', 'Permite inactivar empresas', 'company', 1, '${now}'),
        ('company:reactivate', 'Reactivar empresas', 'Permite reactivar empresas', 'company', 1, '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
    `);

    // Asignar permisos de empresa a roles administrativos base
    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p
        ON p.codigo_permiso IN ('company:view', 'company:create', 'company:edit', 'company:inactivate', 'company:reactivate')
       AND p.estado_permiso = 1
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
    `);

    // También asignar permisos granulares a cualquier rol que ya tenía company:manage
    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT legacy.id_rol, pnew.id_permiso, '${now}'
      FROM (
        SELECT DISTINCT rp.id_rol
        FROM sys_rol_permiso rp
        INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
        WHERE p.codigo_permiso = 'company:manage'
      ) legacy
      INNER JOIN sys_permisos pnew
        ON pnew.codigo_permiso IN ('company:view', 'company:create', 'company:edit', 'company:inactivate', 'company:reactivate')
       AND pnew.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN ('company:view', 'company:create', 'company:edit', 'company:inactivate', 'company:reactivate')
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN ('company:view', 'company:create', 'company:edit', 'company:inactivate', 'company:reactivate')
    `);
  }
}

