import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

/**
 * Agrega id_app a sys_roles para separar roles por aplicación.
 * MASTER: id_app NULL (global, aparece en ambas apps).
 * Roles KPITAL: id_app = kpital. Roles TimeWise: id_app = timewise.
 */
export class AddIdAppToSysRoles1708533300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sys_roles',
      new TableColumn({
        name: 'id_app',
        type: 'int',
        isNullable: true,
      }),
    );

    const [kpital] = await queryRunner.query(
      "SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital' AND estado_app = 1 LIMIT 1",
    );
    const [timewise] = await queryRunner.query(
      "SELECT id_app FROM sys_apps WHERE codigo_app = 'timewise' AND estado_app = 1 LIMIT 1",
    );
    const kpitalId = (kpital as { id_app: number } | undefined)?.id_app;
    const timewiseId = (timewise as { id_app: number } | undefined)?.id_app;

    if (kpitalId) {
      await queryRunner.query(
        `UPDATE sys_roles SET id_app = ${kpitalId} WHERE codigo_rol IN ('GERENTE_NOMINA', 'OPERADOR_NOMINA')`,
      );
    }
    if (timewiseId) {
      await queryRunner.query(
        `UPDATE sys_roles SET id_app = ${timewiseId} WHERE codigo_rol IN ('EMPLEADO_TIMEWISE', 'SUPERVISOR_TIMEWISE', 'SUPERVISOR_GLOBAL_TIMEWISE')`,
      );
    }
    // MASTER queda id_app = NULL (global)

    await queryRunner.createForeignKey(
      'sys_roles',
      new TableForeignKey({
        name: 'FK_sys_roles_app',
        columnNames: ['id_app'],
        referencedTableName: 'sys_apps',
        referencedColumnNames: ['id_app'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'sys_roles',
      new TableIndex({ name: 'IDX_sys_roles_id_app', columnNames: ['id_app'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sys_roles');
    const fk = table?.foreignKeys.find((k) => k.name === 'FK_sys_roles_app');
    if (fk) {
      await queryRunner.dropForeignKey('sys_roles', fk);
    }
    await queryRunner.dropIndex('sys_roles', 'IDX_sys_roles_id_app');
    await queryRunner.dropColumn('sys_roles', 'id_app');
  }
}
