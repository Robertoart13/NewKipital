import { MigrationInterface, QueryRunner } from 'typeorm';

export class DefaultEmployeeSelectionUnchecked1708539900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('nomina_empleado_verificado');
    if (!hasTable) return;

    const hasIncluded = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'incluido_planilla_empleado',
    );
    if (hasIncluded) {
      await queryRunner.query(
        'ALTER TABLE nomina_empleado_verificado MODIFY incluido_planilla_empleado tinyint(1) NOT NULL DEFAULT 0',
      );
    }

    const hasVerified = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'verificado_empleado',
    );
    if (hasVerified) {
      await queryRunner.query(
        'ALTER TABLE nomina_empleado_verificado MODIFY verificado_empleado tinyint(1) NOT NULL DEFAULT 0',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('nomina_empleado_verificado');
    if (!hasTable) return;

    const hasIncluded = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'incluido_planilla_empleado',
    );
    if (hasIncluded) {
      await queryRunner.query(
        'ALTER TABLE nomina_empleado_verificado MODIFY incluido_planilla_empleado tinyint(1) NOT NULL DEFAULT 1',
      );
    }

    const hasVerified = await queryRunner.hasColumn(
      'nomina_empleado_verificado',
      'verificado_empleado',
    );
    if (hasVerified) {
      await queryRunner.query(
        'ALTER TABLE nomina_empleado_verificado MODIFY verificado_empleado tinyint(1) NOT NULL DEFAULT 1',
      );
    }
  }
}

