import 'dotenv/config';

import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';

import { EmployeeSensitiveDataService } from '../src/common/services/employee-sensitive-data.service';

type ConfigMap = Record<string, string>;

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

function createSensitiveService(config: ConfigMap): EmployeeSensitiveDataService {
  const configService = {
    get: (key: string, defaultValue?: string) => config[key] ?? defaultValue ?? '',
  } as any;
  return new EmployeeSensitiveDataService(configService);
}

function parseCurrentKeyring(): { keyring: Record<string, string>; activeKid: string } {
  const rawKeys = (process.env.EMPLOYEE_ENCRYPTION_KEYS || '').trim();
  const rawSingle = (process.env.EMPLOYEE_ENCRYPTION_KEY || '').trim();
  const activeKid = (process.env.EMPLOYEE_ENCRYPTION_ACTIVE_KID || 'default').trim() || 'default';

  if (rawKeys) {
    const parsed = JSON.parse(rawKeys) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('EMPLOYEE_ENCRYPTION_KEYS invalido: debe ser objeto JSON');
    }
    return { keyring: parsed, activeKid };
  }

  if (rawSingle) {
    return { keyring: { default: rawSingle }, activeKid: 'default' };
  }

  throw new Error(
    'No hay keyring configurado en entorno (EMPLOYEE_ENCRYPTION_KEYS o EMPLOYEE_ENCRYPTION_KEY).',
  );
}

function extractKid(cipher: string | null | undefined): string | null {
  if (!cipher || !cipher.startsWith('enc:v1:')) return null;
  const parts = cipher.split(':');
  return parts.length >= 3 ? parts[2] : null;
}

async function getFirstEmpresaId(ds: DataSource): Promise<number> {
  const rows = await ds.query(`SELECT id_empresa FROM sys_empresas WHERE estado_empresa = 1 ORDER BY id_empresa ASC LIMIT 1`);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No hay empresa activa para ejecutar la prueba controlada.');
  }
  return Number(rows[0].id_empresa);
}

async function main(): Promise<void> {
  const ds = createDataSource();
  await ds.initialize();

  const startedAt = new Date();
  const ts = Date.now();

  let idEmpleado: number | null = null;

  try {
    const { keyring: currentKeyring, activeKid: currentActiveKid } = parseCurrentKeyring();
    if (!currentKeyring[currentActiveKid]) {
      throw new Error(`activeKid actual (${currentActiveKid}) no existe en keyring configurado.`);
    }

    const newKid = `krot_${startedAt.toISOString().slice(0, 10).replace(/-/g, '')}`;
    const newKey = randomBytes(32).toString('base64url');

    const rotatedKeyring = { ...currentKeyring, [newKid]: newKey };

    const oldService = createSensitiveService({
      NODE_ENV: process.env.NODE_ENV || 'staging',
      EMPLOYEE_ENCRYPTION_KEYS: JSON.stringify(currentKeyring),
      EMPLOYEE_ENCRYPTION_ACTIVE_KID: currentActiveKid,
      EMPLOYEE_HASH_KEY: process.env.EMPLOYEE_HASH_KEY || '',
    });

    const rotatedService = createSensitiveService({
      NODE_ENV: process.env.NODE_ENV || 'staging',
      EMPLOYEE_ENCRYPTION_KEYS: JSON.stringify(rotatedKeyring),
      EMPLOYEE_ENCRYPTION_ACTIVE_KID: newKid,
      EMPLOYEE_HASH_KEY: process.env.EMPLOYEE_HASH_KEY || '',
    });

    const rollbackService = createSensitiveService({
      NODE_ENV: process.env.NODE_ENV || 'staging',
      EMPLOYEE_ENCRYPTION_KEYS: JSON.stringify(rotatedKeyring),
      EMPLOYEE_ENCRYPTION_ACTIVE_KID: currentActiveKid,
      EMPLOYEE_HASH_KEY: process.env.EMPLOYEE_HASH_KEY || '',
    });

    const idEmpresa = await getFirstEmpresaId(ds);

    const nombreBefore = oldService.encrypt(`ROTACION_PRUEBA_${ts}`);
    const apellidoBefore = oldService.encrypt('CONTROLADO');
    const cedulaBefore = oldService.encrypt(`9${String(ts).slice(-8)}`);
    const emailPlain = `rotacion.controlada.${ts}@test.local`;
    const emailBefore = oldService.encrypt(emailPlain);
    const telefonoBefore = oldService.encrypt('70000001');
    const direccionBefore = oldService.encrypt('Direccion antes de rotacion');

    const codigoEmpleado = `ROT-${ts}`;

    await ds.query(
      `INSERT INTO sys_empleados (
        id_empresa,
        codigo_empleado,
        cedula_empleado,
        nombre_empleado,
        apellido1_empleado,
        email_empleado,
        telefono_empleado,
        direccion_empleado,
        fecha_ingreso_empleado,
        estado_empleado,
        id_usuario,
        datos_encriptados_empleado,
        version_encriptacion_empleado,
        fecha_encriptacion_empleado,
        moneda_salario_empleado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1, NULL, 1, 'v1', NOW(), 'CRC')`,
      [
        idEmpresa,
        codigoEmpleado,
        cedulaBefore,
        nombreBefore,
        apellidoBefore,
        emailBefore,
        telefonoBefore,
        direccionBefore,
      ],
    );

    const insertedRows = await ds.query(
      `SELECT id_empleado, nombre_empleado, telefono_empleado, direccion_empleado FROM sys_empleados WHERE codigo_empleado = ? LIMIT 1`,
      [codigoEmpleado],
    );
    if (!Array.isArray(insertedRows) || insertedRows.length === 0) {
      throw new Error('No se pudo recuperar empleado de prueba insertado.');
    }

    idEmpleado = Number(insertedRows[0].id_empleado);

    const beforeNombreKid = extractKid(insertedRows[0].nombre_empleado);
    const beforeTelefonoKid = extractKid(insertedRows[0].telefono_empleado);

    const beforeReadWithOld = oldService.decrypt(insertedRows[0].telefono_empleado);
    const beforeReadWithRotated = rotatedService.decrypt(insertedRows[0].telefono_empleado);

    const telefonoDuring = rotatedService.encrypt('70000002');
    await ds.query(
      `UPDATE sys_empleados SET telefono_empleado = ?, fecha_modificacion_empleado = NOW() WHERE id_empleado = ?`,
      [telefonoDuring, idEmpleado],
    );

    const duringRows = await ds.query(
      `SELECT telefono_empleado FROM sys_empleados WHERE id_empleado = ? LIMIT 1`,
      [idEmpleado],
    );
    const duringCipher = Array.isArray(duringRows) && duringRows.length > 0 ? duringRows[0].telefono_empleado : null;
    const duringTelefonoKid = extractKid(duringCipher);
    const duringRead = rotatedService.decrypt(duringCipher);

    const direccionAfterRollback = rollbackService.encrypt('Direccion tras rollback controlado');
    await ds.query(
      `UPDATE sys_empleados SET direccion_empleado = ?, fecha_modificacion_empleado = NOW() WHERE id_empleado = ?`,
      [direccionAfterRollback, idEmpleado],
    );

    const afterRows = await ds.query(
      `SELECT telefono_empleado, direccion_empleado FROM sys_empleados WHERE id_empleado = ? LIMIT 1`,
      [idEmpleado],
    );

    const afterTelefonoCipher = Array.isArray(afterRows) && afterRows.length > 0 ? afterRows[0].telefono_empleado : null;
    const afterDireccionCipher = Array.isArray(afterRows) && afterRows.length > 0 ? afterRows[0].direccion_empleado : null;

    const afterTelefonoKid = extractKid(afterTelefonoCipher);
    const afterDireccionKid = extractKid(afterDireccionCipher);

    const afterReadTelefonoWithRollback = rollbackService.decrypt(afterTelefonoCipher);
    const afterReadDireccionWithRollback = rollbackService.decrypt(afterDireccionCipher);

    console.log('\n=== EVIDENCIA PEND-001: ROTACION CONTROLADA DE LLAVES ===');
    console.log(`Entorno BD objetivo: ${process.env.DB_DATABASE}`);
    console.log(`Empleado prueba id: ${idEmpleado} (se elimina al final)`);
    console.log('');
    console.log('[ANTES]');
    console.log(`- activeKid actual: ${currentActiveKid}`);
    console.log(`- kid(nombre_empleado): ${beforeNombreKid}`);
    console.log(`- kid(telefono_empleado): ${beforeTelefonoKid}`);
    console.log(`- lectura con oldService: ${beforeReadWithOld}`);
    console.log(`- lectura con rotatedService (keyring old+new): ${beforeReadWithRotated}`);
    console.log('');
    console.log('[DURANTE ROTACION]');
    console.log(`- nuevo activeKid simulado: ${newKid}`);
    console.log(`- escritura telefono con key nueva -> kid almacenado: ${duringTelefonoKid}`);
    console.log(`- lectura telefono durante rotacion: ${duringRead}`);
    console.log('');
    console.log('[DESPUES / ROLLBACK CONTROLADO]');
    console.log(`- activeKid revertido a: ${currentActiveKid}`);
    console.log(`- kid(telefono) permanece: ${afterTelefonoKid}`);
    console.log(`- lectura telefono tras rollback: ${afterReadTelefonoWithRollback}`);
    console.log(`- escritura direccion con kid rollback -> kid(direccion): ${afterDireccionKid}`);
    console.log(`- lectura direccion tras rollback: ${afterReadDireccionWithRollback}`);
    console.log('');

    const pass =
      beforeTelefonoKid === currentActiveKid &&
      duringTelefonoKid === newKid &&
      afterTelefonoKid === newKid &&
      afterDireccionKid === currentActiveKid &&
      beforeReadWithOld === '70000001' &&
      beforeReadWithRotated === '70000001' &&
      duringRead === '70000002' &&
      afterReadTelefonoWithRollback === '70000002' &&
      afterReadDireccionWithRollback === 'Direccion tras rollback controlado';

    console.log(pass ? '[RESULTADO] OK - Rotacion controlada validada.' : '[RESULTADO] FAIL - Validacion incompleta.');

    if (!pass) {
      throw new Error('La evidencia de rotacion controlada no cumplio todos los checks esperados.');
    }
  } finally {
    if (idEmpleado != null) {
      await ds.query(`DELETE FROM sys_empleados WHERE id_empleado = ?`, [idEmpleado]);
      console.log(`\n[LIMPIEZA] Empleado de prueba eliminado id=${idEmpleado}.`);
    }
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error('\n[ERROR] Rotacion controlada fallo:', error?.message || error);
  process.exit(1);
});
