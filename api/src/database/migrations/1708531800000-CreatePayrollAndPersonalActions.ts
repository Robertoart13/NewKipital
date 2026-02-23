import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Crea tablas: nom_planillas, acc_acciones_personal.
 * Payroll: estados Abierta→Verificada→Aplicada→Inactiva.
 * Personal Actions: pendiente→aprobada|rechazada, vínculo a empleado y planilla.
 */
export class CreatePayrollAndPersonalActions1708531800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════ 1. nom_planillas ═══════
    await queryRunner.createTable(new Table({
      name: 'nom_planillas',
      columns: [
        { name: 'id_planilla', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'id_empresa', type: 'int', isNullable: false },
        { name: 'id_periodos_pago', type: 'int', isNullable: false },
        { name: 'periodo_inicio_planilla', type: 'date', isNullable: false },
        { name: 'periodo_fin_planilla', type: 'date', isNullable: false },
        { name: 'estado_planilla', type: 'tinyint', width: 1, default: 1 },
        { name: 'fecha_aplicacion_planilla', type: 'datetime', isNullable: true },
        { name: 'fecha_creacion_planilla', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'fecha_modificacion_planilla', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'creado_por_planilla', type: 'int', isNullable: true },
        { name: 'modificado_por_planilla', type: 'int', isNullable: true },
      ],
    }), true);

    await queryRunner.createIndex('nom_planillas', new TableIndex({ name: 'IDX_planilla_empresa', columnNames: ['id_empresa'] }));
    await queryRunner.createIndex('nom_planillas', new TableIndex({ name: 'IDX_planilla_periodo_pago', columnNames: ['id_periodos_pago'] }));
    await queryRunner.createIndex('nom_planillas', new TableIndex({ name: 'IDX_planilla_estado', columnNames: ['estado_planilla'] }));

    await queryRunner.createForeignKey('nom_planillas', new TableForeignKey({
      name: 'FK_planilla_empresa',
      columnNames: ['id_empresa'],
      referencedTableName: 'sys_empresas',
      referencedColumnNames: ['id_empresa'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('nom_planillas', new TableForeignKey({
      name: 'FK_planilla_periodo_pago',
      columnNames: ['id_periodos_pago'],
      referencedTableName: 'nom_periodos_pago',
      referencedColumnNames: ['id_periodos_pago'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));

    // ═══════ 2. acc_acciones_personal ═══════
    await queryRunner.createTable(new Table({
      name: 'acc_acciones_personal',
      columns: [
        { name: 'id_accion', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'id_empresa', type: 'int', isNullable: false },
        { name: 'id_empleado', type: 'int', isNullable: false },
        { name: 'id_planilla', type: 'int', isNullable: true },
        { name: 'tipo_accion', type: 'varchar', length: '50', isNullable: false },
        { name: 'descripcion_accion', type: 'text', isNullable: true },
        { name: 'estado_accion', type: 'tinyint', width: 1, default: 1 },
        { name: 'fecha_efecto_accion', type: 'date', isNullable: true },
        { name: 'monto_accion', type: 'decimal', precision: 12, scale: 2, isNullable: true },
        { name: 'aprobado_por_accion', type: 'int', isNullable: true },
        { name: 'fecha_aprobacion_accion', type: 'datetime', isNullable: true },
        { name: 'motivo_rechazo_accion', type: 'text', isNullable: true },
        { name: 'fecha_creacion_accion', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'fecha_modificacion_accion', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'creado_por_accion', type: 'int', isNullable: true },
        { name: 'modificado_por_accion', type: 'int', isNullable: true },
      ],
    }), true);

    await queryRunner.createIndex('acc_acciones_personal', new TableIndex({ name: 'IDX_accion_empresa', columnNames: ['id_empresa'] }));
    await queryRunner.createIndex('acc_acciones_personal', new TableIndex({ name: 'IDX_accion_empleado', columnNames: ['id_empleado'] }));
    await queryRunner.createIndex('acc_acciones_personal', new TableIndex({ name: 'IDX_accion_planilla', columnNames: ['id_planilla'] }));
    await queryRunner.createIndex('acc_acciones_personal', new TableIndex({ name: 'IDX_accion_estado', columnNames: ['estado_accion'] }));

    await queryRunner.createForeignKey('acc_acciones_personal', new TableForeignKey({
      name: 'FK_accion_empresa',
      columnNames: ['id_empresa'],
      referencedTableName: 'sys_empresas',
      referencedColumnNames: ['id_empresa'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('acc_acciones_personal', new TableForeignKey({
      name: 'FK_accion_empleado',
      columnNames: ['id_empleado'],
      referencedTableName: 'sys_empleados',
      referencedColumnNames: ['id_empleado'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));
    await queryRunner.createForeignKey('acc_acciones_personal', new TableForeignKey({
      name: 'FK_accion_planilla',
      columnNames: ['id_planilla'],
      referencedTableName: 'nom_planillas',
      referencedColumnNames: ['id_planilla'],
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('acc_acciones_personal', true);
    await queryRunner.dropTable('nom_planillas', true);
  }
}
