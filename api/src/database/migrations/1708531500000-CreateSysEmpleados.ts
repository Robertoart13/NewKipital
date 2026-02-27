import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Directiva 16 — sys_empleados (registro laboral de RRHH).
 *
 * sys_empleados ≠ sys_usuarios.
 * id_usuario es FK nullable: vinculación opcional con identidad digital.
 * id_empresa es FK NOT NULL: pertenece siempre a una empresa.
 *
 * Estados: 1=ACTIVO, 2=INACTIVO, 3=LIQUIDADO.
 * NO delete físico. Solo inactivación/liquidación.
 */
export class CreateSysEmpleados1708531500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sys_empleados',
        columns: [
          {
            name: 'id_empleado',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_usuario', type: 'int', isNullable: true },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'codigo_empleado', type: 'varchar', length: '20', isNullable: false },
          { name: 'nombre_empleado', type: 'varchar', length: '100', isNullable: false },
          { name: 'apellido1_empleado', type: 'varchar', length: '100', isNullable: false },
          { name: 'apellido2_empleado', type: 'varchar', length: '100', isNullable: true },
          { name: 'email_empleado', type: 'varchar', length: '150', isNullable: false },
          { name: 'telefono_empleado', type: 'varchar', length: '30', isNullable: true },
          { name: 'fecha_ingreso_empleado', type: 'date', isNullable: false },
          { name: 'fecha_salida_empleado', type: 'date', isNullable: true },
          { name: 'puesto_empleado', type: 'varchar', length: '150', isNullable: true },
          { name: 'departamento_empleado', type: 'varchar', length: '150', isNullable: true },
          { name: 'salario_base_empleado', type: 'decimal', precision: 12, scale: 2, isNullable: true },
          { name: 'tipo_contrato_empleado', type: 'varchar', length: '50', isNullable: true },
          { name: 'estado_empleado', type: 'tinyint', width: 1, default: 1 },
          { name: 'fecha_creacion_empleado', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'fecha_modificacion_empleado',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'fecha_inactivacion_empleado', type: 'datetime', isNullable: true },
          { name: 'creado_por_empleado', type: 'int', isNullable: true },
          { name: 'modificado_por_empleado', type: 'int', isNullable: true },
        ],
      }),
      true,
    );

    // --- Índices ---

    await queryRunner.createIndex('sys_empleados', new TableIndex({
      name: 'IDX_empleado_usuario',
      columnNames: ['id_usuario'],
    }));

    await queryRunner.createIndex('sys_empleados', new TableIndex({
      name: 'IDX_empleado_empresa',
      columnNames: ['id_empresa'],
    }));

    await queryRunner.createIndex('sys_empleados', new TableIndex({
      name: 'UQ_empleado_codigo_empresa',
      columnNames: ['id_empresa', 'codigo_empleado'],
      isUnique: true,
    }));

    await queryRunner.createIndex('sys_empleados', new TableIndex({
      name: 'IDX_empleado_email',
      columnNames: ['email_empleado'],
    }));

    await queryRunner.createIndex('sys_empleados', new TableIndex({
      name: 'IDX_empleado_estado',
      columnNames: ['estado_empleado'],
    }));

    // --- Foreign Keys ---

    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({
      name: 'FK_empleado_usuario',
      columnNames: ['id_usuario'],
      referencedTableName: 'sys_usuarios',
      referencedColumnNames: ['id_usuario'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));

    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({
      name: 'FK_empleado_empresa',
      columnNames: ['id_empresa'],
      referencedTableName: 'sys_empresas',
      referencedColumnNames: ['id_empresa'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sys_empleados');
  }
}
