import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reset completo: elimina TODOS los roles y permisos.
 * Crea solo permisos esenciales y rol MASTER para empezar de cero.
 * Asigna rol MASTER al usuario admin (roberto@kpital360.com).
 */
export class ResetToEssentialPermissionsOnly1708532800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Limpiar asignaciones (orden por FKs)
    if (await queryRunner.hasTable('sys_usuario_rol_global')) {
      await queryRunner.query(`DELETE FROM sys_usuario_rol_global`);
    }
    if (await queryRunner.hasTable('sys_usuario_rol_exclusion')) {
      await queryRunner.query(`DELETE FROM sys_usuario_rol_exclusion`);
    }
    if (await queryRunner.hasTable('sys_usuario_permiso')) {
      await queryRunner.query(`DELETE FROM sys_usuario_permiso`);
    }
    await queryRunner.query(`DELETE FROM sys_usuario_rol`);
    await queryRunner.query(`DELETE FROM sys_rol_permiso`);
    await queryRunner.query(`DELETE FROM sys_roles`);
    await queryRunner.query(`DELETE FROM sys_permisos`);

    // 2. Permisos esenciales (solo config)
    const essentialPerms = [
      ['config:permissions', 'Gestionar permisos', 'config'],
      ['config:roles', 'Gestionar roles', 'config'],
      ['config:users', 'Gestionar usuarios', 'config'],
    ];

    for (const [codigo, nombre, modulo] of essentialPerms) {
      await queryRunner.query(`
        INSERT INTO sys_permisos (codigo_permiso, nombre_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso)
        VALUES ('${codigo}', '${nombre}', '${modulo}', 1, '${now}')
      `);
    }

    // 3. Rol MASTER
    await queryRunner.query(`
      INSERT INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol)
      VALUES ('MASTER', 'Master Administrator', 'Permisos esenciales para configurar el sistema desde cero', 1, '${now}', '${now}', 1, 1)
    `);

    const [{ id_rol: masterRoleId }] = await queryRunner.query(
      `SELECT id_rol FROM sys_roles WHERE codigo_rol = 'MASTER' LIMIT 1`,
    );

    // 4. Asignar permisos al rol MASTER
    const perms = await queryRunner.query(
      `SELECT id_permiso FROM sys_permisos WHERE estado_permiso = 1`,
    );
    for (const { id_permiso } of perms) {
      await queryRunner.query(`
        INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
        VALUES (${masterRoleId}, ${id_permiso}, '${now}')
      `);
    }

    // 5. Asignar rol MASTER al usuario admin (roberto@kpital360.com)
    const masterUser = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'roberto@kpital360.com' AND estado_usuario = 1 LIMIT 1`,
    );
    if (masterUser.length === 0) {
      return; // No hay usuario admin, no asignamos
    }
    const adminUserId = masterUser[0].id_usuario;

    const companies = await queryRunner.query(
      `SELECT ue.id_empresa FROM sys_usuario_empresa ue WHERE ue.id_usuario = ${adminUserId} AND ue.estado_usuario_empresa = 1 LIMIT 1`,
    );
    const apps = await queryRunner.query(
      `SELECT id_app FROM sys_apps WHERE estado_app = 1`,
    );
    if (companies.length === 0 || apps.length === 0) {
      return;
    }
    const companyId = companies[0].id_empresa;

    for (const { id_app } of apps) {
      await queryRunner.query(`
        INSERT INTO sys_usuario_rol (
          id_usuario, id_rol, id_empresa, id_app,
          estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol,
          creado_por_usuario_rol, modificado_por_usuario_rol
        ) VALUES (
          ${adminUserId}, ${masterRoleId}, ${companyId}, ${id_app},
          1, '${now}', '${now}',
          ${adminUserId}, ${adminUserId}
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No revertir automáticamente: el reset es destructivo.
    // Para restaurar, ejecutar las migraciones de seed anteriores.
  }
}
