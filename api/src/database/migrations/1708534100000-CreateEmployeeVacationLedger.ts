import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEmployeeVacationLedger1708534100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sys_empleado_vacaciones_cuenta',
        columns: [
          {
            name: 'id_vacaciones_cuenta',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_empleado', type: 'int', isNullable: false },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'dias_iniciales_vacaciones', type: 'int', default: 0 },
          {
            name: 'inicial_bloqueado_vacaciones',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          {
            name: 'dia_ancla_vacaciones',
            type: 'tinyint',
            width: 2,
            isNullable: false,
          },
          {
            name: 'fecha_ingreso_ancla_vacaciones',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'ultima_fecha_provision_vacaciones',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'estado_vacaciones_cuenta',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          {
            name: 'fecha_creacion_vacaciones_cuenta',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_vacaciones_cuenta',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'creado_por_vacaciones_cuenta',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'modificado_por_vacaciones_cuenta',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_empleado_vacaciones_cuenta',
      new TableIndex({
        name: 'UQ_vacaciones_cuenta_empleado',
        columnNames: ['id_empleado'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_cuenta',
      new TableIndex({
        name: 'IDX_vacaciones_cuenta_empresa',
        columnNames: ['id_empresa'],
      }),
    );

    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_cuenta',
      new TableForeignKey({
        name: 'FK_vacaciones_cuenta_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_cuenta',
      new TableForeignKey({
        name: 'FK_vacaciones_cuenta_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'sys_empleado_vacaciones_ledger',
        columns: [
          {
            name: 'id_vacaciones_ledger',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_empleado', type: 'int', isNullable: false },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'id_vacaciones_cuenta', type: 'int', isNullable: false },
          {
            name: 'tipo_movimiento_vacaciones',
            type: 'enum',
            enum: [
              'INITIAL',
              'MONTHLY_ACCRUAL',
              'VACATION_USAGE',
              'REVERSAL',
              'ADJUSTMENT',
            ],
            isNullable: false,
          },
          { name: 'dias_delta_vacaciones', type: 'int', isNullable: false },
          {
            name: 'saldo_resultante_vacaciones',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'fecha_efectiva_vacaciones',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'periodo_referencia_vacaciones',
            type: 'varchar',
            length: '7',
            isNullable: true,
          },
          {
            name: 'source_type_vacaciones',
            type: 'varchar',
            length: '40',
            isNullable: true,
          },
          { name: 'source_id_vacaciones', type: 'int', isNullable: true },
          {
            name: 'descripcion_vacaciones',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'fecha_creacion_vacaciones_ledger',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'creado_por_vacaciones_ledger',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_empleado_vacaciones_ledger',
      new TableIndex({
        name: 'IDX_vacaciones_ledger_empleado',
        columnNames: ['id_empleado'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_ledger',
      new TableIndex({
        name: 'IDX_vacaciones_ledger_empresa',
        columnNames: ['id_empresa'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_ledger',
      new TableIndex({
        name: 'IDX_vacaciones_ledger_tipo',
        columnNames: ['tipo_movimiento_vacaciones'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_ledger',
      new TableIndex({
        name: 'IDX_vacaciones_ledger_fecha',
        columnNames: ['fecha_efectiva_vacaciones'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_ledger',
      new TableIndex({
        name: 'UQ_vacaciones_ledger_provision_periodo',
        columnNames: [
          'id_empleado',
          'tipo_movimiento_vacaciones',
          'periodo_referencia_vacaciones',
        ],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_ledger',
      new TableIndex({
        name: 'UQ_vacaciones_ledger_source',
        columnNames: [
          'source_type_vacaciones',
          'source_id_vacaciones',
          'tipo_movimiento_vacaciones',
        ],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_ledger',
      new TableForeignKey({
        name: 'FK_vacaciones_ledger_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_ledger',
      new TableForeignKey({
        name: 'FK_vacaciones_ledger_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_ledger',
      new TableForeignKey({
        name: 'FK_vacaciones_ledger_cuenta',
        columnNames: ['id_vacaciones_cuenta'],
        referencedTableName: 'sys_empleado_vacaciones_cuenta',
        referencedColumnNames: ['id_vacaciones_cuenta'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'sys_empleado_vacaciones_provision_monto',
        columns: [
          {
            name: 'id_vacaciones_provision_monto',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_empleado', type: 'int', isNullable: false },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'id_vacaciones_ledger', type: 'int', isNullable: false },
          { name: 'id_periodos_pago', type: 'int', isNullable: true },
          {
            name: 'fecha_provision_monto_vacaciones',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'dias_provisionados_monto_vacaciones',
            type: 'int',
            default: 1,
          },
          {
            name: 'monto_provisionado_vacaciones',
            type: 'decimal',
            precision: 14,
            scale: 2,
            default: 0,
          },
          {
            name: 'formula_aplicada_vacaciones',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          {
            name: 'fecha_creacion_provision_monto_vacaciones',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'creado_por_provision_monto_vacaciones',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'sys_empleado_vacaciones_provision_monto',
      new TableIndex({
        name: 'IDX_vacaciones_provision_monto_empleado',
        columnNames: ['id_empleado'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_provision_monto',
      new TableIndex({
        name: 'IDX_vacaciones_provision_monto_empresa',
        columnNames: ['id_empresa'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_provision_monto',
      new TableIndex({
        name: 'IDX_vacaciones_provision_monto_fecha',
        columnNames: ['fecha_provision_monto_vacaciones'],
      }),
    );
    await queryRunner.createIndex(
      'sys_empleado_vacaciones_provision_monto',
      new TableIndex({
        name: 'UQ_vacaciones_provision_monto_ledger',
        columnNames: ['id_vacaciones_ledger'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_provision_monto',
      new TableForeignKey({
        name: 'FK_vacaciones_provision_monto_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_provision_monto',
      new TableForeignKey({
        name: 'FK_vacaciones_provision_monto_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_provision_monto',
      new TableForeignKey({
        name: 'FK_vacaciones_provision_monto_ledger',
        columnNames: ['id_vacaciones_ledger'],
        referencedTableName: 'sys_empleado_vacaciones_ledger',
        referencedColumnNames: ['id_vacaciones_ledger'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'sys_empleado_vacaciones_provision_monto',
      new TableForeignKey({
        name: 'FK_vacaciones_provision_monto_periodo',
        columnNames: ['id_periodos_pago'],
        referencedTableName: 'nom_periodos_pago',
        referencedColumnNames: ['id_periodos_pago'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query(
      `
      INSERT INTO sys_empleado_vacaciones_cuenta (
        id_empleado,
        id_empresa,
        dias_iniciales_vacaciones,
        inicial_bloqueado_vacaciones,
        dia_ancla_vacaciones,
        fecha_ingreso_ancla_vacaciones,
        ultima_fecha_provision_vacaciones,
        estado_vacaciones_cuenta,
        fecha_creacion_vacaciones_cuenta,
        fecha_modificacion_vacaciones_cuenta
      )
      SELECT
        e.id_empleado,
        e.id_empresa,
        0,
        1,
        DAY(e.fecha_ingreso_empleado),
        e.fecha_ingreso_empleado,
        NULL,
        CASE WHEN e.estado_empleado = 1 THEN 1 ELSE 0 END,
        NOW(),
        NOW()
      FROM sys_empleados e
      WHERE DAY(e.fecha_ingreso_empleado) BETWEEN 1 AND 28
      ON DUPLICATE KEY UPDATE
        id_empresa = VALUES(id_empresa),
        dia_ancla_vacaciones = VALUES(dia_ancla_vacaciones),
        fecha_ingreso_ancla_vacaciones = VALUES(fecha_ingreso_ancla_vacaciones),
        estado_vacaciones_cuenta = VALUES(estado_vacaciones_cuenta),
        fecha_modificacion_vacaciones_cuenta = NOW()
    `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(
      'sys_empleado_vacaciones_provision_monto',
      true,
    );
    await queryRunner.dropTable('sys_empleado_vacaciones_ledger', true);
    await queryRunner.dropTable('sys_empleado_vacaciones_cuenta', true);
  }
}
