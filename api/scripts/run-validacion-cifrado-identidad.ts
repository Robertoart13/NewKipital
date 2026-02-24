/**
 * Script: ejecuta el plan de validación de cifrado e identidad (Directiva 31).
 * Requisitos: API con worker corriendo (npm run start:dev) para que procese las colas.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/run-validacion-cifrado-identidad.ts
 *   npx ts-node -r tsconfig-paths/register scripts/run-validacion-cifrado-identidad.ts --prueba=2   # solo prueba 2
 *   npx ts-node -r tsconfig-paths/register scripts/run-validacion-cifrado-identidad.ts --stress=400 # 400 inserts
 *
 * Variables de entorno: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE (o .env)
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

const args = process.argv.slice(2);
const getArg = (name: string): string | null => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.split('=')[1] ?? null : null;
};
const onlyPrueba = getArg('prueba') ? parseInt(getArg('prueba')!, 10) : null;
const stressCount = getArg('stress') ? parseInt(getArg('stress')!, 10) : null;

function createDataSource(): DataSource {
  return new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'kpital360',
    synchronize: false,
    charset: 'utf8mb4',
  });
}

async function getFirstEmpresaId(ds: DataSource): Promise<number> {
  const rows = await ds.query(
    `SELECT id_empresa FROM sys_empresas WHERE estado_empresa = 1 LIMIT 1`,
  );
  const r = Array.isArray(rows) ? rows[0] : rows;
  const id = (r as { id_empresa?: number })?.id_empresa;
  if (id == null) throw new Error('No hay empresa activa en sys_empresas');
  return id;
}

async function runPrueba2(ds: DataSource): Promise<void> {
  console.log('\n--- Prueba 2: Insert manual (id_usuario NULL, plaintext, datos_encriptados=0) ---');
  const idEmpresa = await getFirstEmpresaId(ds);
  const ts = Date.now();
  const codigo = `VAL-${ts}-1`;
  const email = `validacion.${ts}@test.local`;
  const cedula = `9${String(ts).slice(-8)}`;

  await ds.query(
    `INSERT INTO sys_empleados (
      id_empresa, codigo_empleado, cedula_empleado, nombre_empleado, apellido1_empleado,
      email_empleado, fecha_ingreso_empleado, estado_empleado, id_usuario,
      datos_encriptados_empleado, moneda_salario_empleado
    ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1, NULL, 0, 'CRC')`,
    [idEmpresa, codigo, cedula, 'Validacion', 'Prueba2', email],
  );

  const [row] = await ds.query(
    `SELECT id_empleado FROM sys_empleados WHERE email_empleado = ? LIMIT 1`,
    [email],
  ) as { id_empleado: number }[];
  const idEmpleado = row?.id_empleado;
  console.log(`Insertado empleado id_empleado=${idEmpleado}. Esperar workers (~30s) y verificar colas/empleado.`);
}

async function runPrueba3(ds: DataSource): Promise<void> {
  console.log('\n--- Prueba 3: Insert con email ya existente en sys_usuarios ---');
  const [existing] = await ds.query(
    `SELECT id_usuario, email_usuario FROM sys_usuarios WHERE estado_usuario = 1 LIMIT 1`,
  ) as { id_usuario: number; email_usuario: string }[];
  if (!existing) {
    console.log('No hay usuarios en sys_usuarios. Crear uno antes o usar prueba 2.');
    return;
  }
  const idEmpresa = await getFirstEmpresaId(ds);
  const ts = Date.now();
  const codigo = `VAL-DUP-${ts}`;
  const cedula = `8${String(ts).slice(-8)}`;

  await ds.query(
    `INSERT INTO sys_empleados (
      id_empresa, codigo_empleado, cedula_empleado, nombre_empleado, apellido1_empleado,
      email_empleado, fecha_ingreso_empleado, estado_empleado, id_usuario,
      datos_encriptados_empleado, moneda_salario_empleado
    ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1, NULL, 0, 'CRC')`,
    [idEmpresa, codigo, cedula, 'Dup', 'Email', existing.email_usuario],
  );
  console.log(`Insertado empleado con email=${existing.email_usuario}. Verificar cola identity (DONE o ERROR_DUPLICATE).`);
}

async function runPrueba9(ds: DataSource): Promise<void> {
  console.log('\n--- Prueba 9: Empleado inactivo (estado_empleado=0), id_usuario NULL ---');
  const idEmpresa = await getFirstEmpresaId(ds);
  const ts = Date.now();
  const codigo = `VAL-INACT-${ts}`;
  const email = `inactivo.${ts}@test.local`;
  const cedula = `7${String(ts).slice(-8)}`;

  await ds.query(
    `INSERT INTO sys_empleados (
      id_empresa, codigo_empleado, cedula_empleado, nombre_empleado, apellido1_empleado,
      email_empleado, fecha_ingreso_empleado, estado_empleado, id_usuario,
      datos_encriptados_empleado, moneda_salario_empleado
    ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 0, NULL, 0, 'CRC')`,
    [idEmpresa, codigo, cedula, 'Inactivo', 'Prueba9', email],
  );
  console.log('Insertado empleado inactivo. No debe crearse usuario ni quedar en loop.');
}

async function runStress(ds: DataSource, count: number): Promise<void> {
  console.log(`\n--- Stress test: ${count} inserts ---`);
  const idEmpresa = await getFirstEmpresaId(ds);
  const start = Date.now();

  for (let i = 0; i < count; i++) {
    const ts = Date.now();
    const codigo = `STRESS-${ts}-${i}`;
    const email = `stress.${ts}.${i}@test.local`;
    const cedula = `${i}${String(ts).slice(-7)}`;

    await ds.query(
      `INSERT INTO sys_empleados (
        id_empresa, codigo_empleado, cedula_empleado, nombre_empleado, apellido1_empleado,
        email_empleado, fecha_ingreso_empleado, estado_empleado, id_usuario,
        datos_encriptados_empleado, moneda_salario_empleado
      ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 1, NULL, 0, 'CRC')`,
      [idEmpresa, codigo, cedula, `Stress${i}`, `Apellido`, email],
    );
    if ((i + 1) % 50 === 0) console.log(`  Insertados ${i + 1}/${count}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Inserts terminados en ${elapsed}s. Esperar workers (< 8 min para 400).`);
}

async function runVerificacion(ds: DataSource): Promise<void> {
  console.log('\n--- Verificación en BD ---');

  const idRows = await ds.query(
    `SELECT estado_queue, COUNT(*) as cnt FROM sys_empleado_identity_queue GROUP BY estado_queue`,
  ) as { estado_queue: string; cnt: number }[];
  console.log('Cola identity:', idRows.length ? idRows : 'vacía');

  const encRows = await ds.query(
    `SELECT estado_queue, COUNT(*) as cnt FROM sys_empleado_encrypt_queue GROUP BY estado_queue`,
  ) as { estado_queue: string; cnt: number }[];
  console.log('Cola encrypt:', encRows.length ? encRows : 'vacía');

  const [plain] = await ds.query(
    `SELECT COUNT(*) as c FROM sys_empleados WHERE (datos_encriptados_empleado = 0 OR datos_encriptados_empleado IS NULL) AND estado_empleado = 1`,
  ) as { c: number }[];
  console.log('Empleados activos con datos no cifrados:', plain?.c ?? 0);

  const [orphan] = await ds.query(
    `SELECT COUNT(*) as c FROM sys_empleados WHERE estado_empleado = 1 AND id_usuario IS NULL`,
  ) as { c: number }[];
  console.log('Activos sin id_usuario (huérfanos):', orphan?.c ?? 0);
}

async function main(): Promise<void> {
  const ds = createDataSource();
  await ds.initialize();

  try {
    if (stressCount && stressCount > 0) {
      await runStress(ds, stressCount);
      await runVerificacion(ds);
      return;
    }

    if (onlyPrueba === 2 || !onlyPrueba) await runPrueba2(ds);
    if (onlyPrueba === 3 || !onlyPrueba) await runPrueba3(ds);
    if (onlyPrueba === 9 || !onlyPrueba) await runPrueba9(ds);

    await runVerificacion(ds);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
