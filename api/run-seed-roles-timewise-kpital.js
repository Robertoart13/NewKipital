/**
 * Doc 27 — Inserta roles KPITAL + TimeWise y permisos employee.
 * Equivalente a la migración 1708533200000.
 *
 * Ejecutar: node run-seed-roles-timewise-kpital.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'kpital360',
};

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Permisos employee
    const employeePerms = [
      ['employee:create', 'Crear empleados', 'employee'],
      ['employee:view', 'Ver/listar empleados', 'employee'],
      ['employee:edit', 'Editar empleados', 'employee'],
      ['employee:inactivate', 'Inactivar empleados', 'employee'],
      ['employee:reactivate', 'Reactivar empleados', 'employee'],
      ['employee:assign-kpital-role', 'Asignar roles KPITAL al crear empleado', 'employee'],
      ['employee:assign-timewise-role', 'Asignar roles TimeWise al crear empleado', 'employee'],
    ];

    for (const [codigo, nombre, modulo] of employeePerms) {
      await conn.execute(
        `INSERT IGNORE INTO sys_permisos (codigo_permiso, nombre_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso)
         VALUES (?, ?, ?, 1, ?)`,
        [codigo, nombre, modulo, now]
      );
    }
    console.log('Permisos employee insertados.');

    // 2. Roles KPITAL
    const rolesKpital = [
      ['GERENTE_NOMINA', 'Gerente de Nómina', 'Gestión estratégica de nómina, supervisión y validación.'],
      ['OPERADOR_NOMINA', 'Operador de Nómina', 'Tareas operativas: aplicar nóminas, revisar datos.'],
    ];

    for (const [codigo, nombre, desc] of rolesKpital) {
      await conn.execute(
        `INSERT IGNORE INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol)
         VALUES (?, ?, ?, 1, ?, ?, 1, 1)`,
        [codigo, nombre, desc, now, now]
      );
    }

    // 3. Roles TimeWise
    const rolesTimewise = [
      ['SUPERVISOR_GLOBAL_TIMEWISE', 'Supervisor Global TimeWise', 'Dueño o cabeza de la empresa. Ver y aprobar todo.'],
      ['SUPERVISOR_TIMEWISE', 'Supervisor TimeWise', 'Empleados con permisos para gestionar a sus empleados.'],
      ['EMPLEADO_TIMEWISE', 'Empleado TimeWise', 'Solo autoservicio: asistencia, vacaciones, ausencias propias.'],
    ];

    for (const [codigo, nombre, desc] of rolesTimewise) {
      await conn.execute(
        `INSERT IGNORE INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol)
         VALUES (?, ?, ?, 1, ?, ?, 1, 1)`,
        [codigo, nombre, desc, now, now]
      );
    }
    console.log('Roles KPITAL y TimeWise insertados.');

    // 4. Asignar permisos employee a MASTER
    const [masterRows] = await conn.execute(
      "SELECT id_rol FROM sys_roles WHERE codigo_rol = 'MASTER' AND estado_rol = 1 LIMIT 1"
    );
    if (masterRows.length > 0) {
      const masterRoleId = masterRows[0].id_rol;
      const [employeePermIds] = await conn.execute(
        "SELECT id_permiso FROM sys_permisos WHERE modulo_permiso = 'employee' AND estado_permiso = 1"
      );
      for (const { id_permiso } of employeePermIds) {
        const [ex] = await conn.execute(
          'SELECT 1 FROM sys_rol_permiso WHERE id_rol = ? AND id_permiso = ?',
          [masterRoleId, id_permiso]
        );
        if (ex.length === 0) {
          await conn.execute(
            'INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso) VALUES (?, ?, ?)',
            [masterRoleId, id_permiso, now]
          );
        }
      }
      console.log('Permisos asignados a MASTER.');
    }

    // 5. Asignar permisos a GERENTE_NOMINA
    const [gerenteRows] = await conn.execute("SELECT id_rol FROM sys_roles WHERE codigo_rol = 'GERENTE_NOMINA' LIMIT 1");
    if (gerenteRows.length > 0) {
      const gerentePerms = [
        'employee:create', 'employee:view', 'employee:edit', 'employee:inactivate',
        'employee:reactivate', 'employee:assign-kpital-role', 'employee:assign-timewise-role',
      ];
      for (const cod of gerentePerms) {
        const [pRows] = await conn.execute(
          "SELECT id_permiso FROM sys_permisos WHERE codigo_permiso = ? LIMIT 1",
          [cod]
        );
        if (pRows.length > 0) {
          const [ex] = await conn.execute(
            'SELECT 1 FROM sys_rol_permiso WHERE id_rol = ? AND id_permiso = ?',
            [gerenteRows[0].id_rol, pRows[0].id_permiso]
          );
          if (ex.length === 0) {
            await conn.execute(
              'INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso) VALUES (?, ?, ?)',
              [gerenteRows[0].id_rol, pRows[0].id_permiso, now]
            );
          }
        }
      }
      console.log('Permisos asignados a GERENTE_NOMINA.');
    }

    // 6. Asignar permisos a OPERADOR_NOMINA
    const [operadorRows] = await conn.execute("SELECT id_rol FROM sys_roles WHERE codigo_rol = 'OPERADOR_NOMINA' LIMIT 1");
    if (operadorRows.length > 0) {
      const operadorPerms = ['employee:view', 'employee:edit'];
      for (const cod of operadorPerms) {
        const [pRows] = await conn.execute(
          "SELECT id_permiso FROM sys_permisos WHERE codigo_permiso = ? LIMIT 1",
          [cod]
        );
        if (pRows.length > 0) {
          const [ex] = await conn.execute(
            'SELECT 1 FROM sys_rol_permiso WHERE id_rol = ? AND id_permiso = ?',
            [operadorRows[0].id_rol, pRows[0].id_permiso]
          );
          if (ex.length === 0) {
            await conn.execute(
              'INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso) VALUES (?, ?, ?)',
              [operadorRows[0].id_rol, pRows[0].id_permiso, now]
            );
          }
        }
      }
      console.log('Permisos asignados a OPERADOR_NOMINA.');
    }

    console.log('\n--- Verificación ---');
    const [roles] = await conn.execute(
      "SELECT id_rol, codigo_rol, nombre_rol FROM sys_roles WHERE codigo_rol IN ('EMPLEADO_TIMEWISE','SUPERVISOR_TIMEWISE','GERENTE_NOMINA','OPERADOR_NOMINA') ORDER BY codigo_rol"
    );
    console.log('Roles encontrados:', roles);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
