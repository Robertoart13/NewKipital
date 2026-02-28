import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAbsenceLinesTable1708537000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('acc_ausencias_lineas');
    if (exists) return;

    await queryRunner.createTable(
      new Table({
        name: 'acc_ausencias_lineas',
        columns: [
          {
            name: 'id_linea_ausencia',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_accion', type: 'int', isNullable: false },
          { name: 'id_cuota', type: 'int', isNullable: true },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'id_empleado', type: 'int', isNullable: false },
          { name: 'id_calendario_nomina', type: 'int', isNullable: false },
          { name: 'id_movimiento_nomina', type: 'int', isNullable: false },
          {
            name: 'tipo_ausencia_linea',
            type: 'enum',
            enum: ['JUSTIFICADA', 'NO_JUSTIFICADA'],
            default: "'JUSTIFICADA'",
          },
          { name: 'cantidad_linea', type: 'int', isNullable: false },
          {
            name: 'monto_linea',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'remuneracion_linea',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          { name: 'formula_linea', type: 'text', isNullable: true },
          { name: 'orden_linea', type: 'int', isNullable: false },
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
    );

    await queryRunner.createIndex(
      'acc_ausencias_lineas',
      new TableIndex({
        name: 'IDX_aus_linea_accion',
        columnNames: ['id_accion'],
      }),
    );
    await queryRunner.createIndex(
      'acc_ausencias_lineas',
      new TableIndex({
        name: 'IDX_aus_linea_cuota',
        columnNames: ['id_cuota'],
      }),
    );
    await queryRunner.createIndex(
      'acc_ausencias_lineas',
      new TableIndex({
        name: 'IDX_aus_linea_empresa',
        columnNames: ['id_empresa'],
      }),
    );
    await queryRunner.createIndex(
      'acc_ausencias_lineas',
      new TableIndex({
        name: 'IDX_aus_linea_empleado',
        columnNames: ['id_empleado'],
      }),
    );
    await queryRunner.createIndex(
      'acc_ausencias_lineas',
      new TableIndex({
        name: 'IDX_aus_linea_calendario',
        columnNames: ['id_calendario_nomina'],
      }),
    );
    await queryRunner.createIndex(
      'acc_ausencias_lineas',
      new TableIndex({
        name: 'IDX_aus_linea_movimiento',
        columnNames: ['id_movimiento_nomina'],
      }),
    );

    await queryRunner.createForeignKeys('acc_ausencias_lineas', [
      new TableForeignKey({
        name: 'FK_aus_linea_accion',
        columnNames: ['id_accion'],
        referencedTableName: 'acc_acciones_personal',
        referencedColumnNames: ['id_accion'],
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_aus_linea_cuota',
        columnNames: ['id_cuota'],
        referencedTableName: 'acc_cuotas_accion',
        referencedColumnNames: ['id_cuota'],
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'FK_aus_linea_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_aus_linea_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_aus_linea_calendario',
        columnNames: ['id_calendario_nomina'],
        referencedTableName: 'nom_calendarios_nomina',
        referencedColumnNames: ['id_calendario_nomina'],
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_aus_linea_movimiento',
        columnNames: ['id_movimiento_nomina'],
        referencedTableName: 'nom_movimientos_nomina',
        referencedColumnNames: ['id_movimiento_nomina'],
        onUpdate: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('acc_ausencias_lineas');
    if (!exists) return;
    await queryRunner.dropTable('acc_ausencias_lineas');
  }
}

