import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPermissionAuditColumns1708532500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasFechaModificacion = await queryRunner.hasColumn(
      'sys_permisos',
      'fecha_modificacion_permiso',
    );
    if (!hasFechaModificacion) {
      await queryRunner.addColumn(
        'sys_permisos',
        new TableColumn({
          name: 'fecha_modificacion_permiso',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          onUpdate: 'CURRENT_TIMESTAMP',
          isNullable: false,
        }),
      );
    }

    const hasCreadoPor = await queryRunner.hasColumn(
      'sys_permisos',
      'creado_por_permiso',
    );
    if (!hasCreadoPor) {
      await queryRunner.addColumn(
        'sys_permisos',
        new TableColumn({
          name: 'creado_por_permiso',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    const hasModificadoPor = await queryRunner.hasColumn(
      'sys_permisos',
      'modificado_por_permiso',
    );
    if (!hasModificadoPor) {
      await queryRunner.addColumn(
        'sys_permisos',
        new TableColumn({
          name: 'modificado_por_permiso',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasModificadoPor = await queryRunner.hasColumn(
      'sys_permisos',
      'modificado_por_permiso',
    );
    if (hasModificadoPor) {
      await queryRunner.dropColumn('sys_permisos', 'modificado_por_permiso');
    }

    const hasCreadoPor = await queryRunner.hasColumn(
      'sys_permisos',
      'creado_por_permiso',
    );
    if (hasCreadoPor) {
      await queryRunner.dropColumn('sys_permisos', 'creado_por_permiso');
    }

    const hasFechaModificacion = await queryRunner.hasColumn(
      'sys_permisos',
      'fecha_modificacion_permiso',
    );
    if (hasFechaModificacion) {
      await queryRunner.dropColumn(
        'sys_permisos',
        'fecha_modificacion_permiso',
      );
    }
  }
}
