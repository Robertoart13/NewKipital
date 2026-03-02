import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenRetentionLinesTableConstraints1708538200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await this.tableExists(queryRunner, 'acc_retenciones_lineas');
    if (!hasTable) return;

    await this.ensureIndex(
      queryRunner,
      'acc_retenciones_lineas',
      'IDX_ret_linea_accion',
      'id_accion',
    );
    await this.ensureIndex(
      queryRunner,
      'acc_retenciones_lineas',
      'IDX_ret_linea_cuota',
      'id_cuota',
    );
    await this.ensureIndex(
      queryRunner,
      'acc_retenciones_lineas',
      'IDX_ret_linea_empresa',
      'id_empresa',
    );
    await this.ensureIndex(
      queryRunner,
      'acc_retenciones_lineas',
      'IDX_ret_linea_empleado',
      'id_empleado',
    );
    await this.ensureIndex(
      queryRunner,
      'acc_retenciones_lineas',
      'IDX_ret_linea_calendario',
      'id_calendario_nomina',
    );
    await this.ensureIndex(
      queryRunner,
      'acc_retenciones_lineas',
      'IDX_ret_linea_movimiento',
      'id_movimiento_nomina',
    );

    await this.ensureFk(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_accion',
      'id_accion',
      'acc_acciones_personal',
      'id_accion',
    );
    await this.ensureFk(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_cuota',
      'id_cuota',
      'acc_cuotas_accion',
      'id_cuota',
    );
    await this.ensureFk(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_empresa',
      'id_empresa',
      'sys_empresas',
      'id_empresa',
    );
    await this.ensureFk(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_empleado',
      'id_empleado',
      'sys_empleados',
      'id_empleado',
    );
    await this.ensureFk(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_calendario',
      'id_calendario_nomina',
      'nom_calendarios_nomina',
      'id_calendario_nomina',
    );
    await this.ensureFk(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_movimiento',
      'id_movimiento_nomina',
      'nom_movimientos_nomina',
      'id_movimiento_nomina',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await this.tableExists(queryRunner, 'acc_retenciones_lineas');
    if (!hasTable) return;

    await this.dropFkIfExists(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_movimiento',
    );
    await this.dropFkIfExists(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_calendario',
    );
    await this.dropFkIfExists(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_empleado',
    );
    await this.dropFkIfExists(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_empresa',
    );
    await this.dropFkIfExists(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_cuota',
    );
    await this.dropFkIfExists(
      queryRunner,
      'acc_retenciones_lineas',
      'FK_ret_linea_accion',
    );
  }

  private async tableExists(
    queryRunner: QueryRunner,
    tableName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `
      SELECT 1
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      LIMIT 1
      `,
      [tableName],
    )) as Array<{ [key: string]: unknown }>;
    return rows.length > 0;
  }

  private async indexExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
      `,
      [tableName, indexName],
    )) as Array<{ [key: string]: unknown }>;
    return rows.length > 0;
  }

  private async fkExists(
    queryRunner: QueryRunner,
    tableName: string,
    fkName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `
      SELECT 1
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
      LIMIT 1
      `,
      [tableName, fkName],
    )) as Array<{ [key: string]: unknown }>;
    return rows.length > 0;
  }

  private async ensureIndex(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
    columnName: string,
  ): Promise<void> {
    if (await this.indexExists(queryRunner, tableName, indexName)) return;
    await queryRunner.query(
      `ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columnName})`,
    );
  }

  private async ensureFk(
    queryRunner: QueryRunner,
    tableName: string,
    fkName: string,
    columnName: string,
    refTable: string,
    refColumn: string,
  ): Promise<void> {
    if (await this.fkExists(queryRunner, tableName, fkName)) return;
    await queryRunner.query(
      `ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${columnName}) REFERENCES ${refTable}(${refColumn})`,
    );
  }

  private async dropFkIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    fkName: string,
  ): Promise<void> {
    if (!(await this.fkExists(queryRunner, tableName, fkName))) return;
    await queryRunner.query(
      `ALTER TABLE ${tableName} DROP FOREIGN KEY ${fkName}`,
    );
  }
}

