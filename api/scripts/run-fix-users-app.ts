/**
 * Script: asigna app KPITAL a usuarios con empresas pero sin app.
 * Ejecutar: npx ts-node -r tsconfig-paths/register scripts/run-fix-users-app.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

async function run() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'kpital360',
    synchronize: false,
    charset: 'utf8mb4',
  });

  await ds.initialize();

  const kpitalRows = (await ds.query(
    `SELECT id_app as idApp FROM sys_apps WHERE codigo_app = 'kpital' AND estado_app = 1 LIMIT 1`,
  )) as unknown;
  const rows = Array.isArray(kpitalRows) ? kpitalRows[0] : kpitalRows;
  const first = Array.isArray(rows) ? rows[0] : rows;
  const appId = first && typeof first === 'object' && 'idApp' in first ? (first as { idApp: number }).idApp : null;
  if (!appId) {
    console.log('App KPITAL no encontrada. Nada que hacer.');
    await ds.destroy();
    return;
  }

  const result = await ds.query(
    `INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
     SELECT DISTINCT ue.id_usuario, ?, 1, NOW()
     FROM sys_usuario_empresa ue
     WHERE ue.estado_usuario_empresa = 1
     ON DUPLICATE KEY UPDATE estado_usuario_app = 1`,
    [appId],
  );

  const raw = Array.isArray(result) ? result[0] : result;
  const affected = (raw as { affectedRows?: number })?.affectedRows ?? 0;
  console.log(`Fix aplicado: ${affected} fila(s) en sys_usuario_app.`);
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
