require('dotenv').config({ path: require('path').join(__dirname, 'api', '.env') });
const mysql = require('mysql2/promise');

const SQL = `INSERT INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol) VALUES ('SUPERVISOR_TIMEWISE', 'Supervisor TimeWise', 'Supervisor en TimeWise. Gestiona empleados y asistencia en el contexto de la aplicacion TimeWise.', 1, NOW(), NOW(), 1, 1)`;

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  try {
    const [result] = await conn.execute(SQL);
    console.log(JSON.stringify({ success: true, affectedRows: result.affectedRows, insertId: result.insertId }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message, code: err.code }, null, 2));
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
