import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Directiva 40 - Cierre de capa de permisos payroll enterprise (sin NetSuite operativo).
 *
 * Incluye:
 * - Permisos faltantes de workflow/config/sensibles/export/log.
 * - Permiso dedicado payroll:process.
 * - Matriz explícita para 3 roles operativos:
 *   MASTER, GERENTE_NOMINA, OPERADOR_NOMINA.
 */
export class SeedPayrollEnterprisePermissionsMatrix1708536600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryRunner.query(`
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      ) VALUES
        ('payroll:process', 'Procesar planilla', 'Permite pasar planilla a En Proceso y generar snapshots/resultados', 'payroll', 1, '${now}'),
        ('payroll:view_sensitive', 'Ver datos sensibles planilla', 'Permite ver montos sensibles y datos financieros de planilla', 'payroll', 1, '${now}'),
        ('payroll:export', 'Exportar planilla', 'Permite exportar reportes/listados de planilla', 'payroll', 1, '${now}'),
        ('payroll:netsuite:view_log', 'Ver bitacora NetSuite planilla', 'Permite ver logs de integracion de planilla con NetSuite', 'payroll', 1, '${now}'),
        ('payroll:calendar:view', 'Ver calendario de nomina', 'Permite ver calendario de nomina', 'payroll', 1, '${now}'),
        ('payroll:calendar:manage', 'Gestionar calendario de nomina', 'Permite crear/editar configuracion del calendario de nomina', 'payroll', 1, '${now}'),
        ('payroll:type:view', 'Ver tipos de planilla', 'Permite consultar tipos de planilla', 'payroll', 1, '${now}'),
        ('payroll:type:manage', 'Gestionar tipos de planilla', 'Permite crear/editar tipos de planilla y color', 'payroll', 1, '${now}'),
        ('payroll:pay_period:view', 'Ver periodos de pago', 'Permite consultar periodos de pago', 'payroll', 1, '${now}'),
        ('payroll:pay_period:manage', 'Gestionar periodos de pago', 'Permite administrar periodos de pago', 'payroll', 1, '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
    `);

    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_roles r ON r.id_rol = rp.id_rol
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE r.codigo_rol IN ('MASTER', 'GERENTE_NOMINA', 'OPERADOR_NOMINA')
        AND p.codigo_permiso IN (
          'payroll:view',
          'payroll:create',
          'payroll:edit',
          'payroll:process',
          'payroll:verify',
          'payroll:apply',
          'payroll:cancel',
          'payroll:reopen',
          'payroll:view_sensitive',
          'payroll:export',
          'payroll:netsuite:send',
          'payroll:netsuite:retry',
          'payroll:netsuite:view_log',
          'payroll:send_netsuite',
          'payroll:retry_netsuite',
          'payroll:calendar:view',
          'payroll:calendar:manage',
          'payroll:type:view',
          'payroll:type:manage',
          'payroll:pay_period:view',
          'payroll:pay_period:manage'
        )
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'payroll:view',
        'payroll:create',
        'payroll:process',
        'payroll:calendar:view',
        'payroll:type:view',
        'payroll:pay_period:view'
      )
      WHERE r.codigo_rol = 'OPERADOR_NOMINA' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'payroll:view',
        'payroll:create',
        'payroll:process',
        'payroll:verify',
        'payroll:edit',
        'payroll:view_sensitive',
        'payroll:netsuite:view_log',
        'payroll:calendar:view',
        'payroll:type:view',
        'payroll:pay_period:view'
      )
      WHERE r.codigo_rol = 'GERENTE_NOMINA' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'payroll:view',
        'payroll:create',
        'payroll:edit',
        'payroll:process',
        'payroll:verify',
        'payroll:apply',
        'payroll:cancel',
        'payroll:view_sensitive',
        'payroll:export',
        'payroll:send_netsuite',
        'payroll:retry_netsuite',
        'payroll:netsuite:view_log',
        'payroll:calendar:view',
        'payroll:calendar:manage',
        'payroll:type:view',
        'payroll:type:manage',
        'payroll:pay_period:view',
        'payroll:pay_period:manage'
      )
      WHERE r.codigo_rol = 'MASTER' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_roles r ON r.id_rol = rp.id_rol
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE r.codigo_rol IN ('MASTER', 'GERENTE_NOMINA', 'OPERADOR_NOMINA')
        AND p.codigo_permiso IN (
          'payroll:process',
          'payroll:view_sensitive',
          'payroll:export',
          'payroll:netsuite:view_log',
          'payroll:calendar:view',
          'payroll:calendar:manage',
          'payroll:type:view',
          'payroll:type:manage',
          'payroll:pay_period:view',
          'payroll:pay_period:manage'
        )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'payroll:process',
        'payroll:view_sensitive',
        'payroll:export',
        'payroll:netsuite:view_log',
        'payroll:calendar:view',
        'payroll:calendar:manage',
        'payroll:type:view',
        'payroll:type:manage',
        'payroll:pay_period:view',
        'payroll:pay_period:manage'
      )
    `);
  }
}
