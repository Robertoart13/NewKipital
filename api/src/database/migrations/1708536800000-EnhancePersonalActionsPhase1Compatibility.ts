import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Fase 1 - Acciones de Personal + Planilla (compatibilidad incremental).
 *
 * Reglas:
 * - No reemplaza tablas legacy.
 * - No crea consumed_run_id nuevo: reutiliza id_calendario_nomina.
 * - Agrega metadata operativa/auditoria y permisos hr_action:*.
 * - Activa blindaje anti-delete en DB.
 */
export class EnhancePersonalActionsPhase1Compatibility1708536800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('acc_acciones_personal');
    if (!hasTable) {
      return;
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const addColumnIfMissing = async (name: string, ddl: string) => {
      const has = await queryRunner.hasColumn('acc_acciones_personal', name);
      if (!has) {
        await queryRunner.query(
          `ALTER TABLE acc_acciones_personal ADD COLUMN ${ddl}`,
        );
      }
    };

    await addColumnIfMissing(
      'group_id_accion',
      '`group_id_accion` VARCHAR(50) NULL AFTER `tipo_accion`',
    );
    await addColumnIfMissing(
      'origen_accion',
      "`origen_accion` ENUM('RRHH','IMPORT','TIMEWISE') NOT NULL DEFAULT 'RRHH' AFTER `group_id_accion`",
    );
    await addColumnIfMissing(
      'moneda_accion',
      "`moneda_accion` CHAR(3) NOT NULL DEFAULT 'CRC' AFTER `monto_accion`",
    );
    await addColumnIfMissing(
      'fecha_inicio_efecto_accion',
      '`fecha_inicio_efecto_accion` DATE NULL AFTER `fecha_efecto_accion`',
    );
    await addColumnIfMissing(
      'fecha_fin_efecto_accion',
      '`fecha_fin_efecto_accion` DATE NULL AFTER `fecha_inicio_efecto_accion`',
    );
    await addColumnIfMissing(
      'version_lock_accion',
      '`version_lock_accion` INT NOT NULL DEFAULT 1 AFTER `modificado_por_accion`',
    );
    await addColumnIfMissing(
      'invalidated_at_accion',
      '`invalidated_at_accion` DATETIME NULL AFTER `version_lock_accion`',
    );
    await addColumnIfMissing(
      'invalidated_reason_accion',
      '`invalidated_reason_accion` VARCHAR(255) NULL AFTER `invalidated_at_accion`',
    );
    await addColumnIfMissing(
      'expired_at_accion',
      '`expired_at_accion` DATETIME NULL AFTER `invalidated_reason_accion`',
    );
    await addColumnIfMissing(
      'expired_reason_accion',
      '`expired_reason_accion` VARCHAR(255) NULL AFTER `expired_at_accion`',
    );
    await addColumnIfMissing(
      'cancelled_at_accion',
      '`cancelled_at_accion` DATETIME NULL AFTER `expired_reason_accion`',
    );
    await addColumnIfMissing(
      'cancel_reason_accion',
      '`cancel_reason_accion` VARCHAR(255) NULL AFTER `cancelled_at_accion`',
    );

    await queryRunner.query(`
      UPDATE acc_acciones_personal
      SET fecha_inicio_efecto_accion = COALESCE(fecha_inicio_efecto_accion, fecha_efecto_accion),
          fecha_fin_efecto_accion = COALESCE(fecha_fin_efecto_accion, fecha_efecto_accion)
    `);

    const table = await queryRunner.getTable('acc_acciones_personal');
    const hasLookupIndex = table?.indices.some(
      (idx) => idx.name === 'IDX_accion_lookup_v2',
    );
    if (!hasLookupIndex) {
      await queryRunner.createIndex(
        'acc_acciones_personal',
        new TableIndex({
          name: 'IDX_accion_lookup_v2',
          columnNames: ['id_empresa', 'id_empleado', 'estado_accion'],
        }),
      );
    }

    const hasEffectiveIndex = table?.indices.some(
      (idx) => idx.name === 'IDX_accion_effective_range_v2',
    );
    if (!hasEffectiveIndex) {
      await queryRunner.createIndex(
        'acc_acciones_personal',
        new TableIndex({
          name: 'IDX_accion_effective_range_v2',
          columnNames: ['fecha_inicio_efecto_accion', 'fecha_fin_efecto_accion'],
        }),
      );
    }

    const hasGroupIndex = table?.indices.some(
      (idx) => idx.name === 'IDX_accion_group_v2',
    );
    if (!hasGroupIndex) {
      await queryRunner.createIndex(
        'acc_acciones_personal',
        new TableIndex({
          name: 'IDX_accion_group_v2',
          columnNames: ['group_id_accion'],
        }),
      );
    }

    const hasConsumedIndex = table?.indices.some(
      (idx) => idx.name === 'IDX_accion_consumed',
    );
    if (!hasConsumedIndex) {
      await queryRunner.createIndex(
        'acc_acciones_personal',
        new TableIndex({
          name: 'IDX_accion_consumed',
          columnNames: ['id_calendario_nomina'],
        }),
      );
    }

    await queryRunner.query(
      'DROP TRIGGER IF EXISTS TRG_acc_acciones_personal_no_delete',
    );
    await queryRunner.query(`
      CREATE TRIGGER TRG_acc_acciones_personal_no_delete
      BEFORE DELETE ON acc_acciones_personal
      FOR EACH ROW
      BEGIN
        IF OLD.estado_accion > 1 OR OLD.id_calendario_nomina IS NOT NULL THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'No se permite eliminar acciones no borrador o asociadas a planilla';
        END IF;
      END
    `);

    await queryRunner.query(`
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      ) VALUES
        ('hr_action:view', 'Ver acciones de personal', 'Permite ver y listar acciones de personal', 'hr_action', 1, '${now}'),
        ('hr_action:create', 'Crear acciones de personal', 'Permite registrar acciones de personal', 'hr_action', 1, '${now}'),
        ('hr_action:approve', 'Aprobar acciones de personal', 'Permite aprobar acciones de personal', 'hr_action', 1, '${now}'),
        ('hr_action:cancel', 'Cancelar acciones de personal', 'Permite cancelar acciones de personal no consumidas', 'hr_action', 1, '${now}')
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
          'hr_action:view',
          'hr_action:create',
          'hr_action:approve',
          'hr_action:cancel'
        )
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'hr_action:view',
        'hr_action:create'
      )
      WHERE r.codigo_rol = 'OPERADOR_NOMINA' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'hr_action:view',
        'hr_action:create',
        'hr_action:approve',
        'hr_action:cancel'
      )
      WHERE r.codigo_rol = 'GERENTE_NOMINA' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'hr_action:view',
        'hr_action:create',
        'hr_action:approve',
        'hr_action:cancel'
      )
      WHERE r.codigo_rol = 'MASTER' AND r.estado_rol = 1 AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS TRG_acc_acciones_personal_no_delete',
    );

    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN (
        'hr_action:view',
        'hr_action:create',
        'hr_action:approve',
        'hr_action:cancel'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'hr_action:view',
        'hr_action:create',
        'hr_action:approve',
        'hr_action:cancel'
      )
    `);

    const table = await queryRunner.getTable('acc_acciones_personal');
    const dropIndexIfExists = async (indexName: string) => {
      if (table?.indices.some((idx) => idx.name === indexName)) {
        await queryRunner.dropIndex('acc_acciones_personal', indexName);
      }
    };

    await dropIndexIfExists('IDX_accion_consumed');
    await dropIndexIfExists('IDX_accion_group_v2');
    await dropIndexIfExists('IDX_accion_effective_range_v2');
    await dropIndexIfExists('IDX_accion_lookup_v2');

    const dropColumnIfExists = async (columnName: string) => {
      const has = await queryRunner.hasColumn('acc_acciones_personal', columnName);
      if (has) {
        await queryRunner.query(
          `ALTER TABLE acc_acciones_personal DROP COLUMN \`${columnName}\``,
        );
      }
    };

    await dropColumnIfExists('cancel_reason_accion');
    await dropColumnIfExists('cancelled_at_accion');
    await dropColumnIfExists('expired_reason_accion');
    await dropColumnIfExists('expired_at_accion');
    await dropColumnIfExists('invalidated_reason_accion');
    await dropColumnIfExists('invalidated_at_accion');
    await dropColumnIfExists('version_lock_accion');
    await dropColumnIfExists('fecha_fin_efecto_accion');
    await dropColumnIfExists('fecha_inicio_efecto_accion');
    await dropColumnIfExists('moneda_accion');
    await dropColumnIfExists('origen_accion');
    await dropColumnIfExists('group_id_accion');
  }
}

