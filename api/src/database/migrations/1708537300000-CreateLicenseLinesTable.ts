import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateLicenseLinesTable1708537300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('acc_licencias_lineas');
    if (!exists) {
      await queryRunner.createTable(
        new Table({
          name: 'acc_licencias_lineas',
          columns: [
            {
              name: 'id_linea_licencia',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_accion', type: 'int' },
            { name: 'id_cuota', type: 'int', isNullable: true },
            { name: 'id_empresa', type: 'int' },
            { name: 'id_empleado', type: 'int' },
            { name: 'id_calendario_nomina', type: 'int' },
            { name: 'id_movimiento_nomina', type: 'int' },
            {
              name: 'tipo_licencia_linea',
              type: 'enum',
              enum: [
                'maternidad',
                'paternidad',
                'adopcion',
                'duelo',
                'matrimonio',
                'estudios',
                'lactancia',
                'cuidado_familiar',
                'permiso_con_goce',
                'permiso_sin_goce',
                'citacion_judicial',
                'votacion',
                'donacion_sangre',
                'licencia_sindical',
                'licencia_especial_empresa',
              ],
            },
            { name: 'cantidad_linea', type: 'decimal', precision: 12, scale: 4 },
            { name: 'monto_linea', type: 'decimal', precision: 12, scale: 2 },
            { name: 'remuneracion_linea', type: 'tinyint', width: 1, default: 1 },
            { name: 'formula_linea', type: 'text', isNullable: true },
            { name: 'orden_linea', type: 'int' },
            { name: 'fecha_efecto_linea', type: 'date', isNullable: true },
            {
              name: 'fecha_creacion_linea',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'fecha_modificacion_linea',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );
    }

    const indexes: Array<[string, string[]]> = [
      ['IDX_lic_linea_accion', ['id_accion']],
      ['IDX_lic_linea_cuota', ['id_cuota']],
      ['IDX_lic_linea_empresa', ['id_empresa']],
      ['IDX_lic_linea_empleado', ['id_empleado']],
      ['IDX_lic_linea_calendario', ['id_calendario_nomina']],
      ['IDX_lic_linea_movimiento', ['id_movimiento_nomina']],
    ];

    for (const [name, columns] of indexes) {
      const table = await queryRunner.getTable('acc_licencias_lineas');
      const already = table?.indices.some((idx) => idx.name === name);
      if (!already) {
        await queryRunner.createIndex(
          'acc_licencias_lineas',
          new TableIndex({ name, columnNames: columns }),
        );
      }
    }

    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_licencias_lineas',
      ['id_accion'],
      new TableForeignKey({
        name: 'FK_lic_linea_accion',
        columnNames: ['id_accion'],
        referencedTableName: 'acc_acciones_personal',
        referencedColumnNames: ['id_accion'],
        onDelete: 'CASCADE',
      }),
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_licencias_lineas',
      ['id_cuota'],
      new TableForeignKey({
        name: 'FK_lic_linea_cuota',
        columnNames: ['id_cuota'],
        referencedTableName: 'acc_cuotas_accion',
        referencedColumnNames: ['id_cuota'],
        onDelete: 'SET NULL',
      }),
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_licencias_lineas',
      ['id_empresa'],
      new TableForeignKey({
        name: 'FK_lic_linea_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
      }),
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_licencias_lineas',
      ['id_empleado'],
      new TableForeignKey({
        name: 'FK_lic_linea_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
      }),
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_licencias_lineas',
      ['id_calendario_nomina'],
      new TableForeignKey({
        name: 'FK_lic_linea_calendario',
        columnNames: ['id_calendario_nomina'],
        referencedTableName: 'nom_calendarios_nomina',
        referencedColumnNames: ['id_calendario_nomina'],
      }),
    );

    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_licencias_lineas',
      ['id_movimiento_nomina'],
      new TableForeignKey({
        name: 'FK_lic_linea_movimiento',
        columnNames: ['id_movimiento_nomina'],
        referencedTableName: 'nom_movimientos_nomina',
        referencedColumnNames: ['id_movimiento_nomina'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('acc_licencias_lineas');
    if (!exists) return;
    await queryRunner.dropTable('acc_licencias_lineas', true);
  }

  private async createForeignKeyIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    columnNames: string[],
    foreignKey: TableForeignKey,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const exists = table?.foreignKeys.some(
      (fk) =>
        fk.columnNames.length === columnNames.length &&
        fk.columnNames.every((column, index) => column === columnNames[index]),
    );
    if (exists) return;
    await queryRunner.createForeignKey(tableName, foreignKey);
  }
}
