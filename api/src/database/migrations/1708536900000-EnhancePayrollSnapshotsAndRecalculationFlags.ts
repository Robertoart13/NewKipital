import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Dia 3 - Snapshot enriquecido + flags de recalculo en planilla.
 */
export class EnhancePayrollSnapshotsAndRecalculationFlags1708536900000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const addPayrollColumnIfMissing = async (name: string, ddl: string) => {
      const has = await queryRunner.hasColumn('nom_calendarios_nomina', name);
      if (!has) {
        await queryRunner.query(
          `ALTER TABLE nom_calendarios_nomina ADD COLUMN ${ddl}`,
        );
      }
    };

    await addPayrollColumnIfMissing(
      'requires_recalculation_calendario_nomina',
      '`requires_recalculation_calendario_nomina` TINYINT(1) NOT NULL DEFAULT 0 AFTER `version_lock_calendario_nomina`',
    );
    await addPayrollColumnIfMissing(
      'last_snapshot_at_calendario_nomina',
      '`last_snapshot_at_calendario_nomina` DATETIME NULL AFTER `requires_recalculation_calendario_nomina`',
    );

    const addInputColumnIfMissing = async (name: string, ddl: string) => {
      const has = await queryRunner.hasColumn('nomina_inputs_snapshot', name);
      if (!has) {
        await queryRunner.query(
          `ALTER TABLE nomina_inputs_snapshot ADD COLUMN ${ddl}`,
        );
      }
    };

    await addInputColumnIfMissing(
      'movement_id_input',
      '`movement_id_input` INT NULL AFTER `source_id_input`',
    );
    await addInputColumnIfMissing(
      'tipo_accion_input',
      '`tipo_accion_input` VARCHAR(50) NULL AFTER `concepto_codigo_input`',
    );
    await addInputColumnIfMissing(
      'unidades_input',
      "`unidades_input` DECIMAL(10,4) NOT NULL DEFAULT '1.0000' AFTER `tipo_accion_input`",
    );
    await addInputColumnIfMissing(
      'monto_base_input',
      "`monto_base_input` DECIMAL(18,6) NOT NULL DEFAULT '0.000000' AFTER `unidades_input`",
    );
    await addInputColumnIfMissing(
      'monto_final_input',
      "`monto_final_input` DECIMAL(18,2) NOT NULL DEFAULT '0.00' AFTER `monto_base_input`",
    );
    await addInputColumnIfMissing(
      'is_retro_input',
      '`is_retro_input` TINYINT(1) NOT NULL DEFAULT 0 AFTER `monto_final_input`',
    );
    await addInputColumnIfMissing(
      'original_period_input',
      '`original_period_input` VARCHAR(7) NULL AFTER `is_retro_input`',
    );

    const table = await queryRunner.getTable('nomina_inputs_snapshot');
    const hasRetroIndex = table?.indices.some(
      (idx) => idx.name === 'IDX_input_retro_v2',
    );
    if (!hasRetroIndex) {
      await queryRunner.createIndex(
        'nomina_inputs_snapshot',
        new TableIndex({
          name: 'IDX_input_retro_v2',
          columnNames: ['id_nomina', 'is_retro_input'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('nomina_inputs_snapshot');
    if (table?.indices.some((idx) => idx.name === 'IDX_input_retro_v2')) {
      await queryRunner.dropIndex('nomina_inputs_snapshot', 'IDX_input_retro_v2');
    }

    const dropInputColumnIfExists = async (name: string) => {
      const has = await queryRunner.hasColumn('nomina_inputs_snapshot', name);
      if (has) {
        await queryRunner.query(
          `ALTER TABLE nomina_inputs_snapshot DROP COLUMN \`${name}\``,
        );
      }
    };

    await dropInputColumnIfExists('original_period_input');
    await dropInputColumnIfExists('is_retro_input');
    await dropInputColumnIfExists('monto_final_input');
    await dropInputColumnIfExists('monto_base_input');
    await dropInputColumnIfExists('unidades_input');
    await dropInputColumnIfExists('tipo_accion_input');
    await dropInputColumnIfExists('movement_id_input');

    const dropPayrollColumnIfExists = async (name: string) => {
      const has = await queryRunner.hasColumn('nom_calendarios_nomina', name);
      if (has) {
        await queryRunner.query(
          `ALTER TABLE nom_calendarios_nomina DROP COLUMN \`${name}\``,
        );
      }
    };

    await dropPayrollColumnIfExists('last_snapshot_at_calendario_nomina');
    await dropPayrollColumnIfExists('requires_recalculation_calendario_nomina');
  }
}

