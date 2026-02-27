import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateEmployeeAguinaldoProvisionHistory1708533700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sys_empleado_provision_aguinaldo',
        columns: [
          {
            name: 'id_provision_aguinaldo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_empleado', type: 'int', isNullable: false },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'monto_provisionado', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'fecha_inicio_laboral', type: 'date', isNullable: false },
          { name: 'fecha_fin_laboral', type: 'date', isNullable: true },
          { name: 'registro_empresa', type: 'text', isNullable: true },
          { name: 'estado_provision_aguinaldo', type: 'tinyint', width: 1, default: 1 },
          { name: 'fecha_creacion_provision_aguinaldo', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'fecha_modificacion_provision_aguinaldo',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'creado_por_provision_aguinaldo', type: 'int', isNullable: true },
          { name: 'modificado_por_provision_aguinaldo', type: 'int', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_empleado_provision_aguinaldo',
      new TableIndex({ name: 'IDX_provision_aguinaldo_empleado', columnNames: ['id_empleado'] }),
    );
    await queryRunner.createIndex(
      'sys_empleado_provision_aguinaldo',
      new TableIndex({ name: 'IDX_provision_aguinaldo_empresa', columnNames: ['id_empresa'] }),
    );
    await queryRunner.createIndex(
      'sys_empleado_provision_aguinaldo',
      new TableIndex({ name: 'IDX_provision_aguinaldo_estado', columnNames: ['estado_provision_aguinaldo'] }),
    );

    await queryRunner.createForeignKey(
      'sys_empleado_provision_aguinaldo',
      new TableForeignKey({
        name: 'FK_provision_aguinaldo_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'sys_empleado_provision_aguinaldo',
      new TableForeignKey({
        name: 'FK_provision_aguinaldo_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sys_empleado_provision_aguinaldo', true);
  }
}
