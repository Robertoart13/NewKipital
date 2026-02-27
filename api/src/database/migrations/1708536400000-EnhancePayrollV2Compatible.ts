import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Directiva 40 - Blueprint Planilla v2 compatible (fase 1 incremental).
 *
 * Objetivo:
 * - Mantener compatibilidad con nom_calendarios_nomina existente.
 * - Agregar catalogo de tipos de planilla con color.
 * - Agregar columnas operativas nuevas sin renames destructivos.
 * - Implementar slot_key + is_active para unicidad operativa sin bloquear historicos.
 * - Sembrar permisos core payroll:* en entornos donde no existen.
 */
export class EnhancePayrollV2Compatible1708536400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const hasTiposPlanilla = await queryRunner.hasTable('nom_tipos_planilla');
    if (!hasTiposPlanilla) {
      await queryRunner.createTable(
        new Table({
          name: 'nom_tipos_planilla',
          columns: [
            {
              name: 'id_tipo_planilla',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'codigo_tipo_planilla', type: 'varchar', length: '20', isNullable: false },
            { name: 'nombre_tipo_planilla', type: 'varchar', length: '50', isNullable: false },
            { name: 'color_hex_tipo_planilla', type: 'varchar', length: '7', isNullable: false },
            { name: 'es_inactivo_tipo_planilla', type: 'tinyint', width: 1, default: 0 },
            { name: 'fecha_creacion_tipo_planilla', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion_tipo_planilla',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
          uniques: [
            { name: 'UQ_tipo_planilla_codigo', columnNames: ['codigo_tipo_planilla'] },
          ],
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO nom_tipos_planilla (
        codigo_tipo_planilla,
        nombre_tipo_planilla,
        color_hex_tipo_planilla,
        es_inactivo_tipo_planilla,
        fecha_creacion_tipo_planilla,
        fecha_modificacion_tipo_planilla
      ) VALUES
        ('REGULAR', 'Regular', '#1E88E5', 0, '${now}', '${now}'),
        ('AGUINALDO', 'Aguinaldo', '#2E7D32', 0, '${now}', '${now}'),
        ('LIQUIDACION', 'Liquidacion', '#C62828', 0, '${now}', '${now}'),
        ('EXTRAORDINARIA', 'Extraordinaria', '#F57C00', 0, '${now}', '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_tipo_planilla = VALUES(nombre_tipo_planilla),
        color_hex_tipo_planilla = VALUES(color_hex_tipo_planilla),
        es_inactivo_tipo_planilla = VALUES(es_inactivo_tipo_planilla),
        fecha_modificacion_tipo_planilla = VALUES(fecha_modificacion_tipo_planilla)
    `);

    const addColumnIfMissing = async (name: string, ddl: string) => {
      const has = await queryRunner.hasColumn('nom_calendarios_nomina', name);
      if (!has) {
        await queryRunner.query(`ALTER TABLE nom_calendarios_nomina ADD COLUMN ${ddl}`);
      }
    };

    await addColumnIfMissing(
      'id_tipo_planilla',
      '`id_tipo_planilla` INT NULL AFTER `id_periodos_pago`',
    );
    await addColumnIfMissing(
      'nombre_planilla_calendario_nomina',
      '`nombre_planilla_calendario_nomina` VARCHAR(150) NULL AFTER `id_tipo_planilla`',
    );
    await addColumnIfMissing(
      'fecha_corte_calendario_nomina',
      '`fecha_corte_calendario_nomina` DATE NULL AFTER `fecha_fin_periodo`',
    );
    await addColumnIfMissing(
      'fecha_pago_programada_calendario_nomina',
      '`fecha_pago_programada_calendario_nomina` DATE NULL AFTER `fecha_fin_pago`',
    );
    await addColumnIfMissing(
      'referencia_netsuite_calendario_nomina',
      '`referencia_netsuite_calendario_nomina` VARCHAR(100) NULL AFTER `version_lock_calendario_nomina`',
    );
    await addColumnIfMissing(
      'slot_key_calendario_nomina',
      '`slot_key_calendario_nomina` VARCHAR(255) NULL AFTER `referencia_netsuite_calendario_nomina`',
    );
    await addColumnIfMissing(
      'is_active_slot_calendario_nomina',
      '`is_active_slot_calendario_nomina` TINYINT(1) NOT NULL DEFAULT 1 AFTER `slot_key_calendario_nomina`',
    );

    const hasFkTipoPlanilla = (await queryRunner.getTable('nom_calendarios_nomina'))
      ?.foreignKeys.some((fk) => fk.name === 'FK_calendario_tipo_planilla');

    if (!hasFkTipoPlanilla) {
      await queryRunner.createForeignKey(
        'nom_calendarios_nomina',
        new TableForeignKey({
          name: 'FK_calendario_tipo_planilla',
          columnNames: ['id_tipo_planilla'],
          referencedTableName: 'nom_tipos_planilla',
          referencedColumnNames: ['id_tipo_planilla'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    await queryRunner.query(`
      UPDATE nom_calendarios_nomina c
      INNER JOIN nom_tipos_planilla t
        ON t.codigo_tipo_planilla =
          CASE UPPER(TRIM(c.tipo_planilla))
            WHEN 'REGULAR' THEN 'REGULAR'
            WHEN 'AGUINALDO' THEN 'AGUINALDO'
            WHEN 'LIQUIDACION' THEN 'LIQUIDACION'
            WHEN 'LIQUIDACIÓN' THEN 'LIQUIDACION'
            WHEN 'EXTRAORDINARIA' THEN 'EXTRAORDINARIA'
            ELSE 'REGULAR'
          END
      SET c.id_tipo_planilla = t.id_tipo_planilla
      WHERE c.id_tipo_planilla IS NULL
    `);

    await queryRunner.query(`
      UPDATE nom_calendarios_nomina
      SET nombre_planilla_calendario_nomina = COALESCE(
        nombre_planilla_calendario_nomina,
        CONCAT('Planilla ', tipo_planilla, ' ', DATE_FORMAT(fecha_inicio_periodo, '%Y-%m-%d'))
      )
      WHERE nombre_planilla_calendario_nomina IS NULL
         OR TRIM(nombre_planilla_calendario_nomina) = ''
    `);

    await queryRunner.query(`
      UPDATE nom_calendarios_nomina
      SET fecha_corte_calendario_nomina = COALESCE(fecha_corte_calendario_nomina, fecha_fin_periodo),
          fecha_pago_programada_calendario_nomina = COALESCE(fecha_pago_programada_calendario_nomina, fecha_fin_pago)
    `);

    await queryRunner.query(`
      UPDATE nom_calendarios_nomina
      SET is_active_slot_calendario_nomina =
        CASE
          WHEN estado_calendario_nomina IN (1, 2, 3) AND es_inactivo = 0 THEN 1
          ELSE 0
        END
    `);

    await queryRunner.query(`
      UPDATE nom_calendarios_nomina
      SET slot_key_calendario_nomina = CONCAT(
        id_empresa, '|',
        DATE_FORMAT(fecha_inicio_periodo, '%Y-%m-%d'), '|',
        DATE_FORMAT(fecha_fin_periodo, '%Y-%m-%d'), '|',
        COALESCE(id_tipo_planilla, 0), '|',
        moneda_calendario_nomina
      )
      WHERE slot_key_calendario_nomina IS NULL
         OR slot_key_calendario_nomina = ''
    `);

    const table = await queryRunner.getTable('nom_calendarios_nomina');
    const oldIndex = table?.indices.find((idx) => idx.name === 'UQ_calendario_slot_operativo');
    if (oldIndex) {
      await queryRunner.dropIndex('nom_calendarios_nomina', 'UQ_calendario_slot_operativo');
    }

    const hasUniqueSlot = table?.indices.some((idx) => idx.name === 'UQ_calendario_slot_key_active');
    if (!hasUniqueSlot) {
      await queryRunner.createIndex(
        'nom_calendarios_nomina',
        new TableIndex({
          name: 'UQ_calendario_slot_key_active',
          columnNames: ['slot_key_calendario_nomina', 'is_active_slot_calendario_nomina'],
          isUnique: true,
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      ) VALUES
        ('payroll:view', 'Ver planillas', 'Permite ver y listar planillas', 'payroll', 1, '${now}'),
        ('payroll:create', 'Crear planilla', 'Permite abrir planillas', 'payroll', 1, '${now}'),
        ('payroll:edit', 'Editar planilla', 'Permite editar o reabrir planillas en estados permitidos', 'payroll', 1, '${now}'),
        ('payroll:verify', 'Verificar planilla', 'Permite verificar planillas', 'payroll', 1, '${now}'),
        ('payroll:apply', 'Aplicar planilla', 'Permite aplicar planillas', 'payroll', 1, '${now}'),
        ('payroll:cancel', 'Cancelar planilla', 'Permite inactivar planillas', 'payroll', 1, '${now}'),
        ('payroll:send_netsuite', 'Enviar planilla a NetSuite', 'Permite enviar una planilla aplicada a NetSuite', 'payroll', 1, '${now}'),
        ('payroll:retry_netsuite', 'Reintentar envio NetSuite', 'Permite reintentar envios fallidos de planilla a NetSuite', 'payroll', 1, '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'payroll:view',
        'payroll:create',
        'payroll:edit',
        'payroll:verify',
        'payroll:apply',
        'payroll:cancel',
        'payroll:send_netsuite',
        'payroll:retry_netsuite'
      )
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
        AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN (
        'payroll:view',
        'payroll:create',
        'payroll:edit',
        'payroll:verify',
        'payroll:apply',
        'payroll:cancel',
        'payroll:send_netsuite',
        'payroll:retry_netsuite'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'payroll:view',
        'payroll:create',
        'payroll:edit',
        'payroll:verify',
        'payroll:apply',
        'payroll:cancel',
        'payroll:send_netsuite',
        'payroll:retry_netsuite'
      )
    `);

    const table = await queryRunner.getTable('nom_calendarios_nomina');
    if (table?.indices.some((idx) => idx.name === 'UQ_calendario_slot_key_active')) {
      await queryRunner.dropIndex('nom_calendarios_nomina', 'UQ_calendario_slot_key_active');
    }

    const dropColumnIfExists = async (name: string) => {
      if (await queryRunner.hasColumn('nom_calendarios_nomina', name)) {
        await queryRunner.query(`ALTER TABLE nom_calendarios_nomina DROP COLUMN ${name}`);
      }
    };

    const hasFkTipoPlanilla = table?.foreignKeys.some((fk) => fk.name === 'FK_calendario_tipo_planilla');
    if (hasFkTipoPlanilla) {
      await queryRunner.dropForeignKey('nom_calendarios_nomina', 'FK_calendario_tipo_planilla');
    }

    await dropColumnIfExists('is_active_slot_calendario_nomina');
    await dropColumnIfExists('slot_key_calendario_nomina');
    await dropColumnIfExists('referencia_netsuite_calendario_nomina');
    await dropColumnIfExists('fecha_pago_programada_calendario_nomina');
    await dropColumnIfExists('fecha_corte_calendario_nomina');
    await dropColumnIfExists('nombre_planilla_calendario_nomina');
    await dropColumnIfExists('id_tipo_planilla');

    if (await queryRunner.hasTable('nom_tipos_planilla')) {
      await queryRunner.dropTable('nom_tipos_planilla');
    }
  }
}

