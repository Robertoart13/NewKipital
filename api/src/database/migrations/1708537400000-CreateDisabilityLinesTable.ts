import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const TIPO_INCAPACIDAD_VALUES = [
  'enfermedad_comun_ccss',
  'enfermedad_mental_ccss',
  'covid19_ccss',
  'aborto_espontaneo_ccss',
  'reposo_postoperatorio_ccss',
  'reposo_prenatal_adicional_ccss',
  'reposo_postnatal_extendido_ccss',
  'cuido_familiar_grave_ccss',
  'tratamiento_oncologico_ccss',
  'tratamiento_renal_cronico_ccss',
  'tratamiento_vih_sida_ccss',
  'accidente_trabajo_ins',
  'enfermedad_profesional_ins',
  'incapacidad_prolongada_ins',
];

export class CreateDisabilityLinesTable1708537400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('acc_incapacidades_lineas');
    if (!exists) {
      await queryRunner.createTable(
        new Table({
          name: 'acc_incapacidades_lineas',
          columns: [
            {
              name: 'id_linea_incapacidad',
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
              name: 'tipo_incapacidad_linea',
              type: 'enum',
              enum: TIPO_INCAPACIDAD_VALUES,
              default: "'enfermedad_comun_ccss'",
            },
            {
              name: 'tipo_institucion_linea',
              type: 'enum',
              enum: ['CCSS', 'INS'],
              default: "'CCSS'",
            },
            { name: 'cantidad_linea', type: 'decimal', precision: 12, scale: 4 },
            {
              name: 'monto_linea',
              type: 'decimal',
              precision: 12,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'monto_ins_linea',
              type: 'decimal',
              precision: 12,
              scale: 2,
              default: 0,
            },
            {
              name: 'monto_patrono_linea',
              type: 'decimal',
              precision: 12,
              scale: 2,
              default: 0,
            },
            {
              name: 'subsidio_ccss_linea',
              type: 'decimal',
              precision: 12,
              scale: 2,
              default: 0,
            },
            {
              name: 'total_incapacidad_linea',
              type: 'decimal',
              precision: 12,
              scale: 2,
              default: 0,
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
    } else {
      await this.addColumnIfMissing(
        queryRunner,
        'acc_incapacidades_lineas',
        'tipo_institucion_linea',
        "ALTER TABLE acc_incapacidades_lineas ADD COLUMN tipo_institucion_linea enum('CCSS','INS') NOT NULL DEFAULT 'CCSS' AFTER tipo_incapacidad_linea",
      );
      await this.addColumnIfMissing(
        queryRunner,
        'acc_incapacidades_lineas',
        'monto_ins_linea',
        'ALTER TABLE acc_incapacidades_lineas ADD COLUMN monto_ins_linea decimal(12,2) NOT NULL DEFAULT 0 AFTER monto_linea',
      );
      await this.addColumnIfMissing(
        queryRunner,
        'acc_incapacidades_lineas',
        'monto_patrono_linea',
        'ALTER TABLE acc_incapacidades_lineas ADD COLUMN monto_patrono_linea decimal(12,2) NOT NULL DEFAULT 0 AFTER monto_ins_linea',
      );
      await this.addColumnIfMissing(
        queryRunner,
        'acc_incapacidades_lineas',
        'subsidio_ccss_linea',
        'ALTER TABLE acc_incapacidades_lineas ADD COLUMN subsidio_ccss_linea decimal(12,2) NOT NULL DEFAULT 0 AFTER monto_patrono_linea',
      );
      await this.addColumnIfMissing(
        queryRunner,
        'acc_incapacidades_lineas',
        'total_incapacidad_linea',
        'ALTER TABLE acc_incapacidades_lineas ADD COLUMN total_incapacidad_linea decimal(12,2) NOT NULL DEFAULT 0 AFTER subsidio_ccss_linea',
      );
      await queryRunner.query(
        `ALTER TABLE acc_incapacidades_lineas MODIFY COLUMN tipo_incapacidad_linea enum(${TIPO_INCAPACIDAD_VALUES.map((v) => `'${v}'`).join(',')}) NOT NULL DEFAULT 'enfermedad_comun_ccss'`,
      );
      await queryRunner.query(
        'ALTER TABLE acc_incapacidades_lineas MODIFY COLUMN cantidad_linea decimal(12,4) NOT NULL',
      );
    }

    const indexes: Array<[string, string[]]> = [
      ['IDX_inc_linea_accion', ['id_accion']],
      ['IDX_inc_linea_cuota', ['id_cuota']],
      ['IDX_inc_linea_empresa', ['id_empresa']],
      ['IDX_inc_linea_empleado', ['id_empleado']],
      ['IDX_inc_linea_calendario', ['id_calendario_nomina']],
      ['IDX_inc_linea_movimiento', ['id_movimiento_nomina']],
    ];

    for (const [name, columns] of indexes) {
      const table = await queryRunner.getTable('acc_incapacidades_lineas');
      const already = table?.indices.some((idx) => idx.name === name);
      if (!already) {
        await queryRunner.createIndex(
          'acc_incapacidades_lineas',
          new TableIndex({ name, columnNames: columns }),
        );
      }
    }

    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_incapacidades_lineas',
      ['id_accion'],
      new TableForeignKey({
        name: 'FK_inc_linea_accion',
        columnNames: ['id_accion'],
        referencedTableName: 'acc_acciones_personal',
        referencedColumnNames: ['id_accion'],
        onDelete: 'CASCADE',
      }),
    );
    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_incapacidades_lineas',
      ['id_cuota'],
      new TableForeignKey({
        name: 'FK_inc_linea_cuota',
        columnNames: ['id_cuota'],
        referencedTableName: 'acc_cuotas_accion',
        referencedColumnNames: ['id_cuota'],
        onDelete: 'SET NULL',
      }),
    );
    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_incapacidades_lineas',
      ['id_empresa'],
      new TableForeignKey({
        name: 'FK_inc_linea_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
      }),
    );
    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_incapacidades_lineas',
      ['id_empleado'],
      new TableForeignKey({
        name: 'FK_inc_linea_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
      }),
    );
    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_incapacidades_lineas',
      ['id_calendario_nomina'],
      new TableForeignKey({
        name: 'FK_inc_linea_calendario',
        columnNames: ['id_calendario_nomina'],
        referencedTableName: 'nom_calendarios_nomina',
        referencedColumnNames: ['id_calendario_nomina'],
      }),
    );
    await this.createForeignKeyIfMissing(
      queryRunner,
      'acc_incapacidades_lineas',
      ['id_movimiento_nomina'],
      new TableForeignKey({
        name: 'FK_inc_linea_movimiento',
        columnNames: ['id_movimiento_nomina'],
        referencedTableName: 'nom_movimientos_nomina',
        referencedColumnNames: ['id_movimiento_nomina'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('acc_incapacidades_lineas');
    if (!exists) return;
    await queryRunner.dropTable('acc_incapacidades_lineas', true);
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    alterSql: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    const exists = table?.findColumnByName(columnName);
    if (exists) return;
    await queryRunner.query(alterSql);
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
