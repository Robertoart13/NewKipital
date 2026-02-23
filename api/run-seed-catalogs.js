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


    // ========== 1. ORG_DEPARTAMENTOS ==========
    console.log('Insertando departamentos en org_departamentos...');
    const departamentos = [
      'Recursos Humanos',
      'Finanzas',
      'Contabilidad',
      'Tecnología / TI',
      'Operaciones',
      'Ventas',
      'Marketing',
      'Administración',
      'Gerencia General',
      'Logística',
    ];
    for (const nombre of departamentos) {
      await conn.execute(
        `INSERT INTO org_departamentos (nombre_departamento, estado_departamento) 
         SELECT ?, 1 FROM DUAL 
         WHERE NOT EXISTS (SELECT 1 FROM org_departamentos WHERE nombre_departamento = ?)`,
        [nombre, nombre]
      );
    }
    console.log(`  - ${departamentos.length} departamentos insertados o ya existentes`);

    // ========== 2. ORG_PUESTOS ==========
    console.log('Insertando puestos en org_puestos...');
    const puestos = [
      { nombre: 'Gerente General', desc: 'Máxima autoridad operativa' },
      { nombre: 'Director', desc: 'Dirección de área' },
      { nombre: 'Coordinador', desc: 'Coordinación de equipo' },
      { nombre: 'Supervisor', desc: 'Supervisión de personal' },
      { nombre: 'Analista', desc: 'Análisis y gestión' },
      { nombre: 'Asistente', desc: 'Apoyo administrativo' },
      { nombre: 'Contador', desc: 'Contabilidad' },
      { nombre: 'Auxiliar Contable', desc: 'Apoyo contable' },
      { nombre: 'Analista de Recursos Humanos', desc: 'Gestión de RRHH' },
      { nombre: 'Desarrollador', desc: 'Desarrollo de software' },
      { nombre: 'Ejecutivo de Ventas', desc: 'Ventas' },
      { nombre: 'Operador', desc: 'Operaciones' },
    ];
    for (const p of puestos) {
      await conn.execute(
        `INSERT INTO org_puestos (nombre_puesto, descripcion_puesto, estado_puesto) 
         SELECT ?, ?, 1 FROM DUAL 
         WHERE NOT EXISTS (SELECT 1 FROM org_puestos WHERE nombre_puesto = ?)`,
        [p.nombre, p.desc, p.nombre]
      );
    }
    console.log(`  - ${puestos.length} puestos insertados o ya existentes`);

    // ========== 3. NOM_PERIODOS_PAGO ==========
    // Ya existen: Semanal(7), Quincenal(15), Mensual(30). Agregar los faltantes de la imagen.
    console.log('Insertando periodos de pago adicionales en nom_periodos_pago...');
    const periodos = [
      { nombre: 'Diario', dias: 1 },
      { nombre: 'Bisemanal', dias: 14 },
      { nombre: 'Trimestral', dias: 90 },
      { nombre: 'Semestral', dias: 180 },
      { nombre: 'Anual', dias: 365 },
    ];
    for (const per of periodos) {
      await conn.execute(
        `INSERT INTO nom_periodos_pago (nombre_periodo_pago, dias_periodo_pago, es_inactivo) 
         SELECT ?, ?, 0 FROM DUAL 
         WHERE NOT EXISTS (SELECT 1 FROM nom_periodos_pago WHERE nombre_periodo_pago = ?)`,
        [per.nombre, per.dias, per.nombre]
      );
    }
    console.log(`  - Periodos adicionales insertados o ya existentes`);

    console.log('\nSeed de catálogos completado correctamente.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
