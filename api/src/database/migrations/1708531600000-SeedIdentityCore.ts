import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Seed: Identity Core — datos base para que el sistema funcione.
 *
 * 1. Empresa demo
 * 2. Apps (KPITAL, TIMEWISE)
 * 3. Permisos atómicos (module:action)
 * 4. Rol ADMIN_SISTEMA con todos los permisos
 * 5. Usuario admin (roberto@kpital360.com)
 * 6. Asignaciones: user→apps, user→company, user→role
 */
export class SeedIdentityCore1708531600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminPassword = 'Admin2026!';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(adminPassword, salt);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Empresa demo
    await queryRunner.query(`
      INSERT INTO sys_empresas (nombre_empresa, nombre_legal_empresa, cedula_empresa, prefijo_empresa, estado_empresa, fecha_creacion_empresa, fecha_modificacion_empresa, creado_por_empresa, modificado_por_empresa)
      VALUES ('KPITAL Corp', 'KPITAL Corporation S.A.', '3-101-999999', 'KC', 1, '${now}', '${now}', 1, 1)
    `);
    const [{ id_empresa: companyId }] = await queryRunner.query(`SELECT id_empresa FROM sys_empresas WHERE cedula_empresa = '3-101-999999'`);

    // 2. Apps
    await queryRunner.query(`
      INSERT INTO sys_apps (codigo_app, nombre_app, descripcion_app, url_app, estado_app, fecha_creacion_app, fecha_modificacion_app)
      VALUES
        ('kpital', 'KPITAL 360', 'ERP de Planillas y RRHH', 'https://kpital360.com', 1, '${now}', '${now}'),
        ('timewise', 'TimeWise', 'Control de asistencia y tiempo', 'https://timewise.kpital360.com', 1, '${now}', '${now}')
    `);
    const [{ id_app: kpitalAppId }] = await queryRunner.query(`SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital'`);
    const [{ id_app: timewiseAppId }] = await queryRunner.query(`SELECT id_app FROM sys_apps WHERE codigo_app = 'timewise'`);

    // 3. Permisos atómicos
    const permissions = [
      ['payroll:view', 'Ver planillas', 'payroll'],
      ['payroll:create', 'Crear planilla', 'payroll'],
      ['payroll:edit', 'Editar planilla', 'payroll'],
      ['payroll:verify', 'Verificar planilla', 'payroll'],
      ['payroll:apply', 'Aplicar planilla', 'payroll'],
      ['payroll:cancel', 'Cancelar planilla', 'payroll'],
      ['employee:view', 'Ver empleados', 'employee'],
      ['employee:create', 'Crear empleado', 'employee'],
      ['employee:edit', 'Editar empleado', 'employee'],
      ['personal-action:view', 'Ver acciones de personal', 'personal-action'],
      ['personal-action:create', 'Crear acción de personal', 'personal-action'],
      ['personal-action:approve', 'Aprobar acción de personal', 'personal-action'],
      ['company:manage', 'Gestionar empresas', 'company'],
      ['report:view', 'Ver reportes', 'report'],
      ['config:users', 'Gestionar usuarios', 'config'],
      ['config:roles', 'Gestionar roles', 'config'],
      ['config:permissions', 'Gestionar permisos', 'config'],
    ];

    for (const [codigo, nombre, modulo] of permissions) {
      await queryRunner.query(`
        INSERT INTO sys_permisos (codigo_permiso, nombre_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso)
        VALUES ('${codigo}', '${nombre}', '${modulo}', 1, '${now}')
      `);
    }

    // 4. Rol ADMIN_SISTEMA
    await queryRunner.query(`
      INSERT INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol)
      VALUES ('ADMIN_SISTEMA', 'Administrador del Sistema', 'Acceso total a todas las funciones del sistema', 1, '${now}', '${now}', 1, 1)
    `);
    const [{ id_rol: adminRoleId }] = await queryRunner.query(`SELECT id_rol FROM sys_roles WHERE codigo_rol = 'ADMIN_SISTEMA'`);

    // 5. Asignar todos los permisos al rol ADMIN_SISTEMA
    const allPerms = await queryRunner.query(`SELECT id_permiso FROM sys_permisos WHERE estado_permiso = 1`);
    for (const { id_permiso } of allPerms) {
      await queryRunner.query(`
        INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
        VALUES (${adminRoleId}, ${id_permiso}, '${now}')
      `);
    }

    // 6. Usuario admin
    await queryRunner.query(`
      INSERT INTO sys_usuarios (
        email_usuario, nombre_usuario, apellido_usuario, password_hash_usuario,
        password_updated_at_usuario, requires_password_reset_usuario,
        estado_usuario, failed_attempts_usuario,
        fecha_creacion_usuario, fecha_modificacion_usuario
      ) VALUES (
        'roberto@kpital360.com', 'Roberto Carlos', 'Zuniga Altamirano', '${hash}',
        '${now}', 0,
        1, 0,
        '${now}', '${now}'
      )
    `);
    const [{ id_usuario: adminUserId }] = await queryRunner.query(`SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'roberto@kpital360.com'`);

    // 7. Asignar apps al admin
    await queryRunner.query(`
      INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
      VALUES
        (${adminUserId}, ${kpitalAppId}, 1, '${now}'),
        (${adminUserId}, ${timewiseAppId}, 1, '${now}')
    `);

    // 8. Asignar empresa al admin
    await queryRunner.query(`
      INSERT INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
      VALUES (${adminUserId}, ${companyId}, 1, '${now}')
    `);

    // 9. Asignar rol ADMIN_SISTEMA en KPITAL para empresa demo
    await queryRunner.query(`
      INSERT INTO sys_usuario_rol (
        id_usuario, id_rol, id_empresa, id_app,
        estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol,
        creado_por_usuario_rol, modificado_por_usuario_rol
      ) VALUES (
        ${adminUserId}, ${adminRoleId}, ${companyId}, ${kpitalAppId},
        1, '${now}', '${now}',
        ${adminUserId}, ${adminUserId}
      )
    `);

    // Mismo rol en TIMEWISE
    await queryRunner.query(`
      INSERT INTO sys_usuario_rol (
        id_usuario, id_rol, id_empresa, id_app,
        estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol,
        creado_por_usuario_rol, modificado_por_usuario_rol
      ) VALUES (
        ${adminUserId}, ${adminRoleId}, ${companyId}, ${timewiseAppId},
        1, '${now}', '${now}',
        ${adminUserId}, ${adminUserId}
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM sys_usuario_rol`);
    await queryRunner.query(`DELETE FROM sys_usuario_empresa`);
    await queryRunner.query(`DELETE FROM sys_usuario_app`);
    await queryRunner.query(`DELETE FROM sys_usuarios WHERE email_usuario = 'roberto@kpital360.com'`);
    await queryRunner.query(`DELETE FROM sys_rol_permiso`);
    await queryRunner.query(`DELETE FROM sys_roles WHERE codigo_rol = 'ADMIN_SISTEMA'`);
    await queryRunner.query(`DELETE FROM sys_permisos`);
    await queryRunner.query(`DELETE FROM sys_apps`);
    await queryRunner.query(`DELETE FROM sys_empresas WHERE cedula_empresa = '3-101-999999'`);
  }
}
