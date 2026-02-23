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

    console.log('Insertando 4 empresas en sys_empresas...');
    const sqlEmpresas = "INSERT INTO sys_empresas (nombre_empresa, nombre_legal_empresa, cedula_empresa, prefijo_empresa, estado_empresa, fecha_creacion_empresa, fecha_modificacion_empresa, creado_por_empresa, modificado_por_empresa) VALUES ('Empresa Beta', 'Empresa Beta S.A.', '3-101-111111', 'EB', 1, ?, ?, 1, 1), ('Empresa Gamma', 'Empresa Gamma S.A.', '3-101-222222', 'EG', 1, ?, ?, 1, 1), ('Empresa Delta', 'Empresa Delta S.A.', '3-101-333333', 'ED', 1, ?, ?, 1, 1), ('Empresa Omega', 'Empresa Omega S.A.', '3-101-444444', 'EO', 1, ?, ?, 1, 1)";
    await conn.execute(sqlEmpresas, [now, now, now, now, now, now, now, now]);

    const [empresas] = await conn.execute("SELECT id_empresa, prefijo_empresa FROM sys_empresas WHERE prefijo_empresa IN ('EB','EG')");

    const adminId = 1;
    const adminRolId = 1;
    const kpitalAppId = 1;

    console.log('Insertando sys_usuario_empresa para admin (id_usuario=1) en EB y EG...');
    const sqlUe = "INSERT IGNORE INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa) VALUES (?, ?, 1, ?)";
    for (const e of empresas) {
      await conn.execute(sqlUe, [adminId, e.id_empresa, now]);
    }

    console.log('Asignando rol ADMIN_SISTEMA al admin en empresas EB y EG (sys_usuario_rol)...');
    const sqlUr = `INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
      SELECT ?, ?, ?, ?, 1, ?, ?, 1, 1 FROM DUAL
      WHERE NOT EXISTS (SELECT 1 FROM sys_usuario_rol WHERE id_usuario=? AND id_rol=? AND id_empresa=? AND id_app=?)`;
    for (const e of empresas) {
      await conn.execute(sqlUr, [adminId, adminRolId, e.id_empresa, kpitalAppId, now, now, adminId, adminRolId, e.id_empresa, kpitalAppId]);
    }

    console.log('Seed completado correctamente.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();