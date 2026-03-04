import { Table, TableIndex, MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeeTransfersTable1708539300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('sys_empleado_transferencias');
    if (exists) return;

    await queryRunner.createTable(
      new Table({
        name: 'sys_empleado_transferencias',
        columns: [
          {
            name: 'id_transferencia',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_empleado', type: 'int' },
          { name: 'id_empresa_origen', type: 'int' },
          { name: 'id_empresa_destino', type: 'int' },
          { name: 'fecha_efectiva_transferencia', type: 'date' },
          {
            name: 'estado_transferencia',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          { name: 'resumen_transferencia', type: 'json', isNullable: true },
          {
            name: 'motivo_transferencia',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'simulado_por', type: 'int', isNullable: true },
          { name: 'ejecutado_por', type: 'int', isNullable: true },
          {
            name: 'fecha_ejecucion_transferencia',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'fecha_creacion_transferencia',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_transferencia',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'sys_empleado_transferencias',
      new TableIndex({
        name: 'IDX_transfer_empleado',
        columnNames: ['id_empleado'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_transferencias',
      new TableIndex({
        name: 'IDX_transfer_empresa_origen',
        columnNames: ['id_empresa_origen'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_transferencias',
      new TableIndex({
        name: 'IDX_transfer_empresa_destino',
        columnNames: ['id_empresa_destino'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_transferencias',
      new TableIndex({
        name: 'IDX_transfer_estado',
        columnNames: ['estado_transferencia'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('sys_empleado_transferencias');
    if (!exists) return;
    await queryRunner.dropTable('sys_empleado_transferencias', true);
  }
}
