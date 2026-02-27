import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Directiva 40 (sin NetSuite) - Snapshot y resultados de corrida de planilla.
 *
 * Crea tablas:
 * - nomina_empleados_snapshot
 * - nomina_inputs_snapshot
 * - nomina_resultados
 */
export class CreatePayrollRunSnapshots1708536500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasEmployeeSnapshot = await queryRunner.hasTable('nomina_empleados_snapshot');
    if (!hasEmployeeSnapshot) {
      await queryRunner.createTable(
        new Table({
          name: 'nomina_empleados_snapshot',
          columns: [
            { name: 'id_snapshot', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'id_nomina', type: 'int', isNullable: false },
            { name: 'id_empleado', type: 'int', isNullable: false },
            { name: 'salario_base_snapshot', type: 'decimal', precision: 18, scale: 2, default: '0' },
            { name: 'jornada_snapshot', type: 'varchar', length: '50', isNullable: true },
            { name: 'moneda_snapshot', type: 'enum', enum: ['CRC', 'USD'], default: "'CRC'" },
            { name: 'centro_costo_snapshot', type: 'varchar', length: '50', isNullable: true },
            { name: 'cuenta_banco_snapshot', type: 'varchar', length: '100', isNullable: true },
            { name: 'fecha_creacion_snapshot', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nomina_empleados_snapshot',
        new TableIndex({ name: 'IDX_snapshot_nomina', columnNames: ['id_nomina'] }),
      );
      await queryRunner.createIndex(
        'nomina_empleados_snapshot',
        new TableIndex({ name: 'IDX_snapshot_empleado', columnNames: ['id_empleado'] }),
      );
      await queryRunner.createIndex(
        'nomina_empleados_snapshot',
        new TableIndex({
          name: 'UQ_snapshot_nomina_empleado',
          columnNames: ['id_nomina', 'id_empleado'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'nomina_empleados_snapshot',
        new TableForeignKey({
          name: 'FK_snapshot_nomina',
          columnNames: ['id_nomina'],
          referencedTableName: 'nom_calendarios_nomina',
          referencedColumnNames: ['id_calendario_nomina'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'nomina_empleados_snapshot',
        new TableForeignKey({
          name: 'FK_snapshot_empleado',
          columnNames: ['id_empleado'],
          referencedTableName: 'sys_empleados',
          referencedColumnNames: ['id_empleado'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    const hasInputSnapshot = await queryRunner.hasTable('nomina_inputs_snapshot');
    if (!hasInputSnapshot) {
      await queryRunner.createTable(
        new Table({
          name: 'nomina_inputs_snapshot',
          columns: [
            { name: 'id_input', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'id_nomina', type: 'int', isNullable: false },
            { name: 'id_empleado', type: 'int', isNullable: false },
            { name: 'source_type_input', type: 'enum', enum: ['HR_ACTION', 'TIME', 'MANUAL'], default: "'HR_ACTION'" },
            { name: 'source_id_input', type: 'int', isNullable: true },
            { name: 'concepto_codigo_input', type: 'varchar', length: '50', isNullable: true },
            { name: 'monto_input', type: 'decimal', precision: 18, scale: 4, default: '0' },
            { name: 'fecha_creacion_input', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nomina_inputs_snapshot',
        new TableIndex({ name: 'IDX_input_nomina', columnNames: ['id_nomina'] }),
      );
      await queryRunner.createIndex(
        'nomina_inputs_snapshot',
        new TableIndex({ name: 'IDX_input_empleado', columnNames: ['id_empleado'] }),
      );
      await queryRunner.createIndex(
        'nomina_inputs_snapshot',
        new TableIndex({ name: 'IDX_input_source', columnNames: ['source_type_input', 'source_id_input'] }),
      );

      await queryRunner.createForeignKey(
        'nomina_inputs_snapshot',
        new TableForeignKey({
          name: 'FK_input_nomina',
          columnNames: ['id_nomina'],
          referencedTableName: 'nom_calendarios_nomina',
          referencedColumnNames: ['id_calendario_nomina'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'nomina_inputs_snapshot',
        new TableForeignKey({
          name: 'FK_input_empleado',
          columnNames: ['id_empleado'],
          referencedTableName: 'sys_empleados',
          referencedColumnNames: ['id_empleado'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    const hasResults = await queryRunner.hasTable('nomina_resultados');
    if (!hasResults) {
      await queryRunner.createTable(
        new Table({
          name: 'nomina_resultados',
          columns: [
            { name: 'id_resultado', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'id_nomina', type: 'int', isNullable: false },
            { name: 'id_empleado', type: 'int', isNullable: false },
            { name: 'total_bruto_resultado', type: 'decimal', precision: 18, scale: 2, default: '0' },
            { name: 'total_deducciones_resultado', type: 'decimal', precision: 18, scale: 2, default: '0' },
            { name: 'total_neto_resultado', type: 'decimal', precision: 18, scale: 2, default: '0' },
            { name: 'fecha_creacion_resultado', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nomina_resultados',
        new TableIndex({ name: 'IDX_resultado_nomina', columnNames: ['id_nomina'] }),
      );
      await queryRunner.createIndex(
        'nomina_resultados',
        new TableIndex({ name: 'IDX_resultado_empleado', columnNames: ['id_empleado'] }),
      );
      await queryRunner.createIndex(
        'nomina_resultados',
        new TableIndex({ name: 'UQ_resultado_nomina_empleado', columnNames: ['id_nomina', 'id_empleado'], isUnique: true }),
      );

      await queryRunner.createForeignKey(
        'nomina_resultados',
        new TableForeignKey({
          name: 'FK_resultado_nomina',
          columnNames: ['id_nomina'],
          referencedTableName: 'nom_calendarios_nomina',
          referencedColumnNames: ['id_calendario_nomina'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'nomina_resultados',
        new TableForeignKey({
          name: 'FK_resultado_empleado',
          columnNames: ['id_empleado'],
          referencedTableName: 'sys_empleados',
          referencedColumnNames: ['id_empleado'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('nomina_resultados')) {
      await queryRunner.dropTable('nomina_resultados', true);
    }
    if (await queryRunner.hasTable('nomina_inputs_snapshot')) {
      await queryRunner.dropTable('nomina_inputs_snapshot', true);
    }
    if (await queryRunner.hasTable('nomina_empleados_snapshot')) {
      await queryRunner.dropTable('nomina_empleados_snapshot', true);
    }
  }
}

