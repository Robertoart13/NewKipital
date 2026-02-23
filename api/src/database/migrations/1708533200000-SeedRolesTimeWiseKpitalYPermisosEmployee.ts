import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Doc 27 — Roles KPITAL + TimeWise y permisos employee.
 *
 * KPITAL: MASTER (existente), GERENTE_NOMINA, OPERADOR_NOMINA
 * TimeWise: MASTER (compartido), SUPERVISOR_GLOBAL_TIMEWISE, SUPERVISOR_TIMEWISE, EMPLEADO_TIMEWISE
 *
 * Permisos: employee:create, employee:view, employee:edit, employee:inactivate, employee:reactivate,
 *           employee:assign-kpital-role, employee:assign-timewise-role
 *
 * MASTER conserva todos los permisos (incl. los nuevos).
 * GERENTE_NOMINA y OPERADOR_NOMINA: permisos employee según Doc 27.
 * Roles TimeWise: solo se crean; permisos específicos se definen cuando se implemente TimeWise.
 */
export class SeedRolesTimeWiseKpitalYPermisosEmployee1708533200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Insertar permisos employee
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
      await queryRunner.query(`
        INSERT IGNORE INTO sys_permisos (codigo_permiso, nombre_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso)
        VALUES ('${codigo}', '${nombre}', '${modulo}', 1, '${now}')
      `);
    }

    // 2. Roles KPITAL
    const rolesKpital = [
      ['GERENTE_NOMINA', 'Gerente de Nómina', 'Gestión estratégica de nómina, supervisión y validación. Sin control total de configuración técnica.'],
      ['OPERADOR_NOMINA', 'Operador de Nómina', 'Tareas operativas: aplicar nóminas, revisar datos, gestión de registros a nivel operativo.'],
    ];

    for (const [codigo, nombre, desc] of rolesKpital) {
      await queryRunner.query(`
        INSERT IGNORE INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol)
        VALUES ('${codigo}', '${nombre}', '${desc}', 1, '${now}', '${now}', 1, 1)
      `);
    }

    // 3. Roles TimeWise
    const rolesTimewise = [
      ['SUPERVISOR_GLOBAL_TIMEWISE', 'Supervisor Global TimeWise', 'Dueño o cabeza de la empresa. Ver y aprobar todo en su alcance.'],
      ['SUPERVISOR_TIMEWISE', 'Supervisor TimeWise', 'Empleados con permisos para gestionar a sus empleados (jefes de área).'],
      ['EMPLEADO_TIMEWISE', 'Empleado TimeWise', 'Solo autoservicio: asistencia, vacaciones, ausencias propias.'],
    ];

    for (const [codigo, nombre, desc] of rolesTimewise) {
      await queryRunner.query(`
        INSERT IGNORE INTO sys_roles (codigo_rol, nombre_rol, descripcion_rol, estado_rol, fecha_creacion_rol, fecha_modificacion_rol, creado_por_rol, modificado_por_rol)
        VALUES ('${codigo}', '${nombre}', '${desc}', 1, '${now}', '${now}', 1, 1)
      `);
    }

    // 4. Asignar permisos employee a MASTER (todos los employee:*)
    const masterRows = await queryRunner.query(`SELECT id_rol FROM sys_roles WHERE codigo_rol = 'MASTER' AND estado_rol = 1 LIMIT 1`);
    if (masterRows.length > 0) {
      const masterRoleId = masterRows[0].id_rol;
      const employeePermIds = await queryRunner.query(`
        SELECT id_permiso FROM sys_permisos WHERE modulo_permiso = 'employee' AND estado_permiso = 1
      `);
      for (const { id_permiso } of employeePermIds) {
        const exists = await queryRunner.query(
          `SELECT 1 FROM sys_rol_permiso WHERE id_rol = ${masterRoleId} AND id_permiso = ${id_permiso}`,
        );
        if (exists.length === 0) {
          await queryRunner.query(
            `INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso) VALUES (${masterRoleId}, ${id_permiso}, '${now}')`,
          );
        }
      }
    }

    // 5. Asignar permisos a GERENTE_NOMINA
    const gerenteRows = await queryRunner.query(`SELECT id_rol FROM sys_roles WHERE codigo_rol = 'GERENTE_NOMINA' LIMIT 1`);
    const gerenteRow = gerenteRows[0];
    if (gerenteRow) {
      const gerentePerms = ['employee:create', 'employee:view', 'employee:edit', 'employee:inactivate', 'employee:reactivate', 'employee:assign-kpital-role', 'employee:assign-timewise-role'];
      for (const cod of gerentePerms) {
        const pRows = await queryRunner.query(`SELECT id_permiso FROM sys_permisos WHERE codigo_permiso = '${cod}' LIMIT 1`);
        if (pRows.length > 0) {
          const p = pRows[0];
          const ex = await queryRunner.query(`SELECT 1 FROM sys_rol_permiso WHERE id_rol = ${gerenteRow.id_rol} AND id_permiso = ${p.id_permiso}`);
          if (ex.length === 0) {
            await queryRunner.query(
              `INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso) VALUES (${gerenteRow.id_rol}, ${p.id_permiso}, '${now}')`,
            );
          }
        }
      }
    }

    // 6. Asignar permisos a OPERADOR_NOMINA (sin assign roles)
    const operadorRows = await queryRunner.query(`SELECT id_rol FROM sys_roles WHERE codigo_rol = 'OPERADOR_NOMINA' LIMIT 1`);
    const operadorRow = operadorRows[0];
    if (operadorRow) {
      const operadorPerms = ['employee:view', 'employee:edit'];
      for (const cod of operadorPerms) {
        const pRows = await queryRunner.query(`SELECT id_permiso FROM sys_permisos WHERE codigo_permiso = '${cod}' LIMIT 1`);
        if (pRows.length > 0) {
          const p = pRows[0];
          const ex = await queryRunner.query(`SELECT 1 FROM sys_rol_permiso WHERE id_rol = ${operadorRow.id_rol} AND id_permiso = ${p.id_permiso}`);
          if (ex.length === 0) {
            await queryRunner.query(
              `INSERT INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso) VALUES (${operadorRow.id_rol}, ${p.id_permiso}, '${now}')`,
            );
          }
        }
      }
    }

    // Roles TimeWise: permisos específicos se definirán cuando se implemente la lógica.
    // Por ahora solo existen los roles; MASTER ya tiene employee:* que aplica si opera en KPITAL.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rolesToRemove = ['GERENTE_NOMINA', 'OPERADOR_NOMINA', 'SUPERVISOR_GLOBAL_TIMEWISE', 'SUPERVISOR_TIMEWISE', 'EMPLEADO_TIMEWISE'];
    for (const cod of rolesToRemove) {
      const rows = await queryRunner.query(`SELECT id_rol FROM sys_roles WHERE codigo_rol = '${cod}'`);
      for (const r of rows) {
        if (await queryRunner.hasTable('sys_usuario_rol')) {
          await queryRunner.query(`DELETE FROM sys_usuario_rol WHERE id_rol = ${r.id_rol}`);
        }
        if (await queryRunner.hasTable('sys_usuario_rol_global')) {
          await queryRunner.query(`DELETE FROM sys_usuario_rol_global WHERE id_rol = ${r.id_rol}`);
        }
        await queryRunner.query(`DELETE FROM sys_rol_permiso WHERE id_rol = ${r.id_rol}`);
        await queryRunner.query(`DELETE FROM sys_roles WHERE id_rol = ${r.id_rol}`);
      }
    }
    const empPerms = await queryRunner.query(`SELECT id_permiso FROM sys_permisos WHERE modulo_permiso = 'employee'`);
    for (const p of empPerms) {
      await queryRunner.query(`DELETE FROM sys_rol_permiso WHERE id_permiso = ${p.id_permiso}`);
      await queryRunner.query(`DELETE FROM sys_permisos WHERE id_permiso = ${p.id_permiso}`);
    }
  }
}
