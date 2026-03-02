import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPersonalActionInvalidationMetadata1708537100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasReasonCode = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_reason_code_accion',
    );
    if (!hasReasonCode) {
      await queryRunner.addColumn(
        'acc_acciones_personal',
        new TableColumn({
          name: 'invalidated_reason_code_accion',
          type: 'varchar',
          length: '64',
          isNullable: true,
        }),
      );
    }

    const hasMeta = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_meta_accion',
    );
    if (!hasMeta) {
      await queryRunner.addColumn(
        'acc_acciones_personal',
        new TableColumn({
          name: 'invalidated_meta_accion',
          type: 'json',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasMeta = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_meta_accion',
    );
    if (hasMeta) {
      await queryRunner.dropColumn(
        'acc_acciones_personal',
        'invalidated_meta_accion',
      );
    }

    const hasReasonCode = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_reason_code_accion',
    );
    if (hasReasonCode) {
      await queryRunner.dropColumn(
        'acc_acciones_personal',
        'invalidated_reason_code_accion',
      );
    }
  }
}

