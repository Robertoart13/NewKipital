import { Table, TableColumn, TableIndex } from 'typeorm';

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendPayrollResultsAndSnapshotJson1708539400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const resultsTable = await queryRunner.getTable('nomina_resultados');
    if (resultsTable) {
      const addColumn = async (column: TableColumn) => {
        const exists = resultsTable.columns.find((col) => col.name === column.name);
        if (!exists) {
          await queryRunner.addColumn('nomina_resultados', column);
        }
      };

      await addColumn(
        new TableColumn({
          name: 'salario_bruto_periodo_resultado',
          type: 'decimal',
          precision: 18,
          scale: 2,
          default: '0',
        }),
      );
      await addColumn(
        new TableColumn({
          name: 'devengado_dias_resultado',
          type: 'decimal',
          precision: 10,
          scale: 4,
          isNullable: true,
        }),
      );
      await addColumn(
        new TableColumn({
          name: 'devengado_horas_resultado',
          type: 'decimal',
          precision: 10,
          scale: 4,
          isNullable: true,
        }),
      );
      await addColumn(
        new TableColumn({
          name: 'cargas_sociales_resultado',
          type: 'decimal',
          precision: 18,
          scale: 2,
          default: '0',
        }),
      );
      await addColumn(
        new TableColumn({
          name: 'impuesto_renta_resultado',
          type: 'decimal',
          precision: 18,
          scale: 2,
          default: '0',
        }),
      );
    }

    const hasSnapshotTable = await queryRunner.hasTable('nomina_planilla_snapshot_json');
    if (!hasSnapshotTable) {
      await queryRunner.createTable(
        new Table({
          name: 'nomina_planilla_snapshot_json',
          columns: [
            {
              name: 'id_snapshot_json',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_nomina', type: 'int' },
            { name: 'snapshot_json', type: 'json' },
            {
              name: 'fecha_creacion_snapshot',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );
      await queryRunner.createIndex(
        'nomina_planilla_snapshot_json',
        new TableIndex({
          name: 'IDX_snapshot_json_nomina',
          columnNames: ['id_nomina'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasSnapshotTable = await queryRunner.hasTable('nomina_planilla_snapshot_json');
    if (hasSnapshotTable) {
      await queryRunner.dropTable('nomina_planilla_snapshot_json', true);
    }
    const resultsTable = await queryRunner.getTable('nomina_resultados');
    if (resultsTable) {
      const columns = [
        'salario_bruto_periodo_resultado',
        'devengado_dias_resultado',
        'devengado_horas_resultado',
        'cargas_sociales_resultado',
        'impuesto_renta_resultado',
      ];
      for (const name of columns) {
        const exists = resultsTable.columns.find((col) => col.name === name);
        if (exists) {
          await queryRunner.dropColumn('nomina_resultados', name);
        }
      }
    }
  }
}
