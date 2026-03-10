import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ExtendPayrollEmployeeVerificationForSelection1708539800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('nomina_empleado_verificado');
    if (!hasTable) return;

    const hasIncludedColumn = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'incluido_planilla_empleado',
    );
    if (!hasIncludedColumn) {
      await queryRunner.addColumn(
        'nomina_empleado_verificado',
        new TableColumn({
          name: 'incluido_planilla_empleado',
          type: 'tinyint',
          width: 1,
          default: 1,
        }),
      );
    }

    const hasRevalidationColumn = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'requiere_revalidacion_empleado',
    );
    if (!hasRevalidationColumn) {
      await queryRunner.addColumn(
        'nomina_empleado_verificado',
        new TableColumn({
          name: 'requiere_revalidacion_empleado',
          type: 'tinyint',
          width: 1,
          default: 0,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('nomina_empleado_verificado');
    if (!hasTable) return;

    const hasRevalidationColumn = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'requiere_revalidacion_empleado',
    );
    if (hasRevalidationColumn) {
      await queryRunner.dropColumn(
        'nomina_empleado_verificado',
        'requiere_revalidacion_empleado',
      );
    }

    const hasIncludedColumn = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'incluido_planilla_empleado',
    );
    if (hasIncludedColumn) {
      await queryRunner.dropColumn(
        'nomina_empleado_verificado',
        'incluido_planilla_empleado',
      );
    }
  }
}

