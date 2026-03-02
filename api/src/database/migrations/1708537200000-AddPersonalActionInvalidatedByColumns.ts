import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPersonalActionInvalidatedByColumns1708537200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasType = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_by_type_accion',
    );
    if (!hasType) {
      await queryRunner.addColumn(
        'acc_acciones_personal',
        new TableColumn({
          name: 'invalidated_by_type_accion',
          type: 'varchar',
          length: '16',
          isNullable: true,
        }),
      );
    }

    const hasUserId = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_by_user_id_accion',
    );
    if (!hasUserId) {
      await queryRunner.addColumn(
        'acc_acciones_personal',
        new TableColumn({
          name: 'invalidated_by_user_id_accion',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUserId = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_by_user_id_accion',
    );
    if (hasUserId) {
      await queryRunner.dropColumn(
        'acc_acciones_personal',
        'invalidated_by_user_id_accion',
      );
    }

    const hasType = await queryRunner.hasColumn(
      'acc_acciones_personal',
      'invalidated_by_type_accion',
    );
    if (hasType) {
      await queryRunner.dropColumn(
        'acc_acciones_personal',
        'invalidated_by_type_accion',
      );
    }
  }
}

