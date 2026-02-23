import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

/**
 * Seed: Empresa adicional + Usuario de ejemplo para probar gestión multi-empresa.
 *
 * 1. Nueva empresa: "Rocca Subsidiaria S.A." (prefijo RS)
 * 2. Usuario demo: Ana García (ana.garcia@roccacr.com) — Password: Demo2026!
 * 3. Admin (id 1) asignado a Rocca Subsidiaria
 * 4. Usuario demo asignado a 2 empresas: primera existente + Rocca Subsidiaria
 * 5. Usuario demo con acceso KPITAL y rol MASTER
 */
export class SeedEmpresaSigmaYUsuarioDemo1708532900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const password = 'Demo2026!';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Nueva empresa
    await queryRunner.query(`
      INSERT IGNORE INTO sys_empresas
        (nombre_empresa, nombre_legal_empresa, cedula_empresa, prefijo_empresa,
         estado_empresa, fecha_creacion_empresa, fecha_modificacion_empresa,
         creado_por_empresa, modificado_por_empresa)
      VALUES
        ('Rocca Subsidiaria', 'Rocca Subsidiaria S.A.', '3-101-555555', 'RS', 1, '${now}', '${now}', 1, 1)
    `);

    const [sigmaRow] = await queryRunner.query(
      `SELECT id_empresa FROM sys_empresas WHERE prefijo_empresa = 'RS' LIMIT 1`,
    );
    if (!sigmaRow) return;
    const sigmaId = sigmaRow.id_empresa;

    // Apps y rol MASTER
    const [kpitalRow] = await queryRunner.query(`SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital' LIMIT 1`);
    const [masterRow] = await queryRunner.query(`SELECT id_rol FROM sys_roles WHERE codigo_rol = 'MASTER' LIMIT 1`);
    if (!kpitalRow || !masterRow) return;
    const kpitalAppId = kpitalRow.id_app;
    const masterRoleId = masterRow.id_rol;

    // 2. Asignar admin (id 1) a Rocca Subsidiaria
    await queryRunner.query(`
      INSERT IGNORE INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
      VALUES (1, ${sigmaId}, 1, '${now}')
    `);

    // 3. Crear usuario demo
    const existing = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'ana.garcia@roccacr.com' LIMIT 1`,
    );
    if (existing?.length) return;

    await queryRunner.query(`
      INSERT INTO sys_usuarios (
        email_usuario, nombre_usuario, apellido_usuario, password_hash_usuario,
        password_updated_at_usuario, requires_password_reset_usuario,
        estado_usuario, failed_attempts_usuario,
        fecha_creacion_usuario, fecha_modificacion_usuario
      ) VALUES (
        'ana.garcia@roccacr.com', 'Ana María', 'García López', '${hash}',
        '${now}', 0, 1, 0, '${now}', '${now}'
      )
    `);
    const [userRow] = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'ana.garcia@roccacr.com'`,
    );
    const demoUserId = userRow.id_usuario;

    // 4. App KPITAL
    await queryRunner.query(`
      INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
      VALUES (${demoUserId}, ${kpitalAppId}, 1, '${now}')
    `);

    // 5. Empresas: primera existente + Rocca Subsidiaria
    const companies = await queryRunner.query(
      `SELECT id_empresa FROM sys_empresas WHERE estado_empresa = 1 AND prefijo_empresa != 'RS' ORDER BY id_empresa LIMIT 1`,
    );
    const firstCompanyId = companies?.[0]?.id_empresa;

    if (firstCompanyId) {
      await queryRunner.query(`
        INSERT INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
        VALUES (${demoUserId}, ${firstCompanyId}, 1, '${now}')
      `);
    }
    await queryRunner.query(`
      INSERT INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
      VALUES (${demoUserId}, ${sigmaId}, 1, '${now}')
    `);

    // 6. Rol MASTER en ambas empresas
    if (firstCompanyId) {
      await queryRunner.query(`
        INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
        VALUES (${demoUserId}, ${masterRoleId}, ${firstCompanyId}, ${kpitalAppId}, 1, '${now}', '${now}', 1, 1)
      `);
    }
    await queryRunner.query(`
      INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
      VALUES (${demoUserId}, ${masterRoleId}, ${sigmaId}, ${kpitalAppId}, 1, '${now}', '${now}', 1, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [u] = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'ana.garcia@roccacr.com' LIMIT 1`,
    );
    if (u) {
      const uid = u.id_usuario;
      await queryRunner.query(`DELETE FROM sys_usuario_rol WHERE id_usuario = ${uid}`);
      await queryRunner.query(`DELETE FROM sys_usuario_empresa WHERE id_usuario = ${uid}`);
      await queryRunner.query(`DELETE FROM sys_usuario_app WHERE id_usuario = ${uid}`);
      await queryRunner.query(`DELETE FROM sys_usuarios WHERE id_usuario = ${uid}`);
    }
    const [sigma] = await queryRunner.query(
      `SELECT id_empresa FROM sys_empresas WHERE prefijo_empresa = 'RS' LIMIT 1`,
    );
    if (sigma) {
      await queryRunner.query(`DELETE FROM sys_usuario_empresa WHERE id_empresa = ${sigma.id_empresa}`);
      await queryRunner.query(`DELETE FROM sys_empresas WHERE id_empresa = ${sigma.id_empresa}`);
    }
  }
}
