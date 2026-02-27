import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Seed: Usuario roberto@roccacr.com para login local.
 * Password: Kpital2026!
 * (Auth por Microsoft se implementará después)
 */
export class SeedUsuarioRobertoRocca1708532000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const password = 'Kpital2026!';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Verificar que existan empresa, apps, rol
    const companies = await queryRunner.query(
      `SELECT id_empresa FROM sys_empresas WHERE estado_empresa = 1 LIMIT 1`,
    );
    const apps = await queryRunner.query(
      `SELECT id_app, codigo_app FROM sys_apps WHERE estado_app = 1`,
    );
    const roles = await queryRunner.query(
      `SELECT id_rol FROM sys_roles WHERE codigo_rol = 'ADMIN_SISTEMA' LIMIT 1`,
    );

    if (!companies?.length || !apps?.length || !roles?.length) {
      return;
    }

    const companyId = companies[0].id_empresa;
    const adminRoleId = roles[0].id_rol;
    const kpitalApp = apps.find(
      (a: { codigo_app: string }) => a.codigo_app === 'kpital',
    );
    const timewiseApp = apps.find(
      (a: { codigo_app: string }) => a.codigo_app === 'timewise',
    );

    const existing = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'roberto@roccacr.com' LIMIT 1`,
    );
    if (existing?.length) {
      await queryRunner.query(
        `UPDATE sys_usuarios SET password_hash_usuario = '${hash}', password_updated_at_usuario = '${now}', estado_usuario = 1 WHERE email_usuario = 'roberto@roccacr.com'`,
      );
      return;
    }

    await queryRunner.query(`
      INSERT INTO sys_usuarios (
        email_usuario, nombre_usuario, apellido_usuario, password_hash_usuario,
        password_updated_at_usuario, requires_password_reset_usuario,
        estado_usuario, failed_attempts_usuario,
        fecha_creacion_usuario, fecha_modificacion_usuario
      ) VALUES (
        'roberto@roccacr.com', 'Roberto Carlos', 'Zuniga Altamirano', '${hash}',
        '${now}', 0,
        1, 0,
        '${now}', '${now}'
      )
    `);
    const [user] = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'roberto@roccacr.com'`,
    );
    const userId = user.id_usuario;

    if (kpitalApp) {
      await queryRunner.query(`
        INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
        VALUES (${userId}, ${kpitalApp.id_app}, 1, '${now}')
      `);
    }
    if (timewiseApp) {
      await queryRunner.query(`
        INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
        VALUES (${userId}, ${timewiseApp.id_app}, 1, '${now}')
      `);
    }

    await queryRunner.query(`
      INSERT INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
      VALUES (${userId}, ${companyId}, 1, '${now}')
    `);

    if (kpitalApp) {
      await queryRunner.query(`
        INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
        VALUES (${userId}, ${adminRoleId}, ${companyId}, ${kpitalApp.id_app}, 1, '${now}', '${now}', ${userId}, ${userId})
      `);
    }
    if (timewiseApp) {
      await queryRunner.query(`
        INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
        VALUES (${userId}, ${adminRoleId}, ${companyId}, ${timewiseApp.id_app}, 1, '${now}', '${now}', ${userId}, ${userId})
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [u] = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'roberto@roccacr.com' LIMIT 1`,
    );
    if (!u) return;
    const uid = u.id_usuario;
    await queryRunner.query(
      `DELETE FROM sys_usuario_rol WHERE id_usuario = ${uid}`,
    );
    await queryRunner.query(
      `DELETE FROM sys_usuario_empresa WHERE id_usuario = ${uid}`,
    );
    await queryRunner.query(
      `DELETE FROM sys_usuario_app WHERE id_usuario = ${uid}`,
    );
    await queryRunner.query(
      `DELETE FROM sys_usuarios WHERE id_usuario = ${uid}`,
    );
  }
}
