/**
 * Diagnóstico y corrección: Ana María con rol MASTER no ve opciones como Roberto.
 * Asegura que Ana tenga el mismo esquema de roles que Roberto (sys_usuario_rol).
 * Ejecutar: npm run script:fix-ana-master
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

const ANA_EMAIL = 'ana.garcia@roccacr.com';
const ROBERTO_EMAIL = 'roberto@roccacr.com';

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

  const [roberto] = (await ds.query(
    `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = ?`,
    [ROBERTO_EMAIL],
  )) as unknown as { id_usuario: number }[];
  const [ana] = (await ds.query(
    `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = ?`,
    [ANA_EMAIL],
  )) as unknown as { id_usuario: number }[];

  if (!roberto?.id_usuario || !ana?.id_usuario) {
    console.log('No se encontraron ambos usuarios. Verifica emails.');
    await ds.destroy();
    return;
  }

  const robertoId = roberto.id_usuario;
  const anaId = ana.id_usuario;

  const robertoRoles = (await ds.query(
    `SELECT ur.id_usuario, ur.id_rol, ur.id_empresa, ur.id_app, r.codigo_rol
     FROM sys_usuario_rol ur
     JOIN sys_roles r ON r.id_rol = ur.id_rol
     WHERE ur.id_usuario = ? AND ur.estado_usuario_rol = 1`,
    [robertoId],
  )) as unknown as { id_rol: number; id_empresa: number; id_app: number }[];
  const rowsR = Array.isArray(robertoRoles) ? robertoRoles[0] : robertoRoles;
  const robertoRolesList = Array.isArray(rowsR) ? rowsR : [rowsR].filter(Boolean);

  const anaRoles = (await ds.query(
    `SELECT ur.id_usuario, ur.id_rol, ur.id_empresa, ur.id_app
     FROM sys_usuario_rol ur
     WHERE ur.id_usuario = ? AND ur.estado_usuario_rol = 1`,
    [anaId],
  )) as unknown;
  const rowsA = Array.isArray(anaRoles) ? anaRoles[0] : anaRoles;
  const anaRolesList = (Array.isArray(rowsA) ? rowsA : [rowsA]).filter(Boolean) as { id_rol: number; id_empresa: number; id_app: number }[];

  const anaCompanies = (await ds.query(
    `SELECT id_empresa FROM sys_usuario_empresa WHERE id_usuario = ? AND estado_usuario_empresa = 1`,
    [anaId],
  )) as unknown;
  const acRows = Array.isArray(anaCompanies) ? anaCompanies[0] : anaCompanies;
  const anaCompaniesList = (Array.isArray(acRows) ? acRows : [acRows]).filter(Boolean) as { id_empresa: number }[];

  const [masterRole] = (await ds.query(
    `SELECT id_rol FROM sys_roles WHERE codigo_rol = 'MASTER' AND estado_rol = 1 LIMIT 1`,
  )) as unknown as { id_rol: number }[];
  const masterId = Array.isArray(masterRole) ? masterRole[0]?.id_rol : (masterRole as { id_rol: number })?.id_rol;

  const [kpitalApp] = (await ds.query(
    `SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital' AND estado_app = 1 LIMIT 1`,
  )) as unknown as { id_app: number }[];
  const kpitalId = Array.isArray(kpitalApp) ? kpitalApp[0]?.id_app : (kpitalApp as { id_app: number })?.id_app;

  console.log('Roberto roles (sys_usuario_rol):', robertoRolesList?.length ?? 0);
  console.log('Ana roles (sys_usuario_rol):', anaRolesList?.length ?? 0);
  console.log('Ana empresas:', anaCompaniesList?.length ?? 0);
  console.log('MASTER id:', masterId, 'KPITAL id:', kpitalId);

  if (!masterId || !kpitalId || anaCompaniesList.length === 0) {
    console.log('Faltan datos esenciales. Revisa BD.');
    await ds.destroy();
    return;
  }

  let added = 0;
  for (const { id_empresa } of anaCompaniesList) {
    const exists = anaRolesList?.some(
      (r) => r.id_rol === masterId && r.id_empresa === id_empresa && r.id_app === kpitalId,
    );
    if (!exists) {
      await ds.query(
        `INSERT INTO sys_usuario_rol (id_usuario, id_rol, id_empresa, id_app, estado_usuario_rol, fecha_asignacion_usuario_rol, fecha_modificacion_usuario_rol, creado_por_usuario_rol, modificado_por_usuario_rol)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW(), 1, 1)`,
        [anaId, masterId, id_empresa, kpitalId],
      );
      added++;
    }
  }

  console.log(`Listo. Se agregaron ${added} asignaciones de rol MASTER a Ana María en sys_usuario_rol.`);
  console.log('Ana debe cerrar sesión y volver a entrar para que se apliquen los permisos.');
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
