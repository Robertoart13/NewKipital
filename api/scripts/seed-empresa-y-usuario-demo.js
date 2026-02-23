/**
 * Script: Agregar empresa "Rocca Subsidiaria" y usuario demo "Ana García".
 * Ejecutar: node scripts/seed-empresa-y-usuario-demo.js
 * Requiere: .env con DB_*
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Empresa Rocca Subsidiaria
    console.log('Insertando empresa Rocca Subsidiaria...');
    await conn.execute(
      `INSERT IGNORE INTO sys_empresas
        (nombre_empresa, nombre_legal_empresa, cedula_empresa, prefijo_empresa,
         estado_empresa, fecha_creacion_empresa, fecha_modificacion_empresa,
         creado_por_empresa, modificado_por_empresa)
       VALUES ('Rocca Subsidiaria', 'Rocca Subsidiaria S.A.', '3-101-555555', 'RS', 1, ?, ?, 1, 1)`,
      [now, now],
    );
    const [[sigmaRow]] = await conn.query(
      `SELECT id_empresa FROM sys_empresas WHERE prefijo_empresa = 'RS' LIMIT 1`,
    );
    if (!sigmaRow) {
      console.log('No se pudo obtener id de Rocca Subsidiaria.');
      return;
    }
    const sigmaId = sigmaRow.id_empresa;

    // Asignar admin (id 1) a Rocca Subsidiaria
    await conn.execute(
      `INSERT IGNORE INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
       VALUES (1, ?, 1, ?)`,
      [sigmaId, now],
    );

    // 2. Usuario demo
    const [[existing]] = await conn.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'ana.garcia@roccacr.com' LIMIT 1`,
    );
    if (existing) {
      console.log('Usuario ana.garcia@roccacr.com ya existe. Asignando empresas si falta...');
      const demoUserId = existing.id_usuario;
      const [[hasSigma]] = await conn.query(
        `SELECT 1 FROM sys_usuario_empresa WHERE id_usuario = ? AND id_empresa = ? LIMIT 1`,
        [demoUserId, sigmaId],
      );
      if (!hasSigma) {
        await conn.execute(
          `INSERT INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
           VALUES (?, ?, 1, ?)`,
          [demoUserId, sigmaId, now],
        );
        console.log('Usuario demo asignado a Rocca Subsidiaria.');
      }
      return;
    }

    const hash = await bcrypt.hash('Demo2026!', 12);
    await conn.execute(
      `INSERT INTO sys_usuarios (email_usuario, nombre_usuario, apellido_usuario, password_hash_usuario,
        password_updated_at_usuario, requires_password_reset_usuario, estado_usuario, failed_attempts_usuario,
        fecha_creacion_usuario, fecha_modificacion_usuario)
       VALUES ('ana.garcia@roccacr.com', 'Ana María', 'García López', ?, ?, 0, 1, 0, ?, ?)`,
      [hash, now, now, now],
    );
    const [[userRow]] = await conn.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'ana.garcia@roccacr.com'`,
    );
    const demoUserId = userRow.id_usuario;

    const [[kpital]] = await conn.query(`SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital' LIMIT 1`);
    const [[master]] = await conn.query(`SELECT id_rol FROM sys_roles WHERE codigo_rol = 'MASTER' LIMIT 1`);
    if (!kpital || !master) {
      console.log('No se encontró app kpital o rol MASTER.');
      return;
    }

    const kpitalAppId = kpital.id_app;
    const masterRoleId = master.id_rol;

    await conn.execute(
      `INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
       VALUES (?, ?, 1, ?)`,
      [demoUserId, kpitalAppId, now],
    );

    const [companies] = await conn.query(
      `SELECT id_empresa FROM sys_empresas WHERE estado_empresa = 1 AND prefijo_empresa != 'RS' ORDER BY id_empresa LIMIT 1`,
    );
    const firstCompanyId = companies?.[0]?.id_empresa;

    if (firstCompanyId) {
      await conn.execute(
        `INSERT INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
         VALUES (?, ?, 1, ?)`,
        [demoUserId, firstCompanyId, now],
      );
    }
    await conn.execute(
      `INSERT INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
       VALUES (?, ?, 1, ?)`,
      [demoUserId, sigmaId, now],
    );

    if (firstCompanyId) {
      await conn.execute(
        `INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
         VALUES (?, ?, ?, ?, 1, ?, ?, 1, 1)`,
        [demoUserId, masterRoleId, firstCompanyId, kpitalAppId, now, now],
      );
    }
    await conn.execute(
      `INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
       VALUES (?, ?, ?, ?, 1, ?, ?, 1, 1)`,
      [demoUserId, masterRoleId, sigmaId, kpitalAppId, now, now],
    );

    console.log('OK: Empresa Rocca Subsidiaria y usuario ana.garcia@roccacr.com creados.');
    console.log('Usuario demo: ana.garcia@roccacr.com / Demo2026!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
