/**
 * Asigna el rol ADMIN_SISTEMA al admin en empresas EB y EG.
 * Necesario para que el admin tenga permisos (employee:view, etc.) al cambiar de empresa.
 * Ejecutar: node run-seed-roles-empresas.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST,
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

    const [empresas] = await conn.execute(
      "SELECT id_empresa FROM sys_empresas WHERE prefijo_empresa IN ('EB','EG')"
    );
    if (empresas.length === 0) {
      console.log('No hay empresas EB/EG. Ejecute primero run-seed-empresas.js');
      return;
    }

    const adminId = 1;
    const adminRolId = 1;
    const kpitalAppId = 1;

    const sqlUr = `INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
      SELECT ?, ?, ?, ?, 1, ?, ?, 1, 1 FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM sys_usuario_rol WHERE id_usuario=? AND id_rol=? AND id_empresa=? AND id_app=?)`;

    for (const e of empresas) {
      await conn.execute(sqlUr, [adminId, adminRolId, e.id_empresa, kpitalAppId, now, now, adminId, adminRolId, e.id_empresa, kpitalAppId]);
    }

    console.log('Roles asignados correctamente. El admin ahora tiene permisos en empresas EB y EG.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
