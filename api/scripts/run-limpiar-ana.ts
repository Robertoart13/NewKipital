/**
 * Limpia toda la configuración de Ana (empresas, roles, excepciones).
 * Deja solo el usuario en sys_usuarios para reconfigurar desde cero.
 * Ejecutar: npm run script:limpiar-ana
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

const ANA_ID = 2;

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

  const tables = [
    ['sys_usuario_permiso', 'id_usuario'],
    ['sys_usuario_permiso_global', 'id_usuario'],
    ['sys_usuario_rol', 'id_usuario'],
    ['sys_usuario_empresa', 'id_usuario'],
    ['sys_usuario_app', 'id_usuario'],
  ];

  for (const [table, col] of tables) {
    try {
      const r = await ds.query(`DELETE FROM ${table} WHERE ${col} = ?`, [ANA_ID]);
      const affected = (r as { affectedRows?: number })?.affectedRows ?? 0;
      if (affected > 0) {
        console.log(`  ${table}: ${affected} fila(s) eliminada(s)`);
      }
    } catch (e) {
      if ((e as { code?: string }).code === 'ER_NO_SUCH_TABLE') {
        console.log(`  ${table}: tabla no existe, omitiendo`);
      } else {
        throw e;
      }
    }
  }

  try {
    const r = await ds.query(`DELETE FROM sys_usuario_rol_global WHERE id_usuario = ?`, [ANA_ID]);
    const affected = (r as { affectedRows?: number })?.affectedRows ?? 0;
    if (affected > 0) {
      console.log(`  sys_usuario_rol_global: ${affected} fila(s) eliminada(s)`);
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_NO_SUCH_TABLE') {
      console.log('  sys_usuario_rol_global: tabla no existe, omitiendo');
    } else {
      throw e;
    }
  }

  console.log('\nAna limpiada. Puede reconfigurar desde Usuarios > Configurar.');
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
