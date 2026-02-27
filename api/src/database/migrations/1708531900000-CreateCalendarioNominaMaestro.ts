import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

/**
 * Directiva 21 — Tabla Maestra de Planillas (Calendario de Nómina).
 *
 * Reemplaza nom_planillas con nom_calendarios_nomina.
 * Ventanas periodo trabajado vs ventana de pago.
 * Estados: Abierta, En Proceso, Verificada, Aplicada, Contabilizada, Notificada, Inactiva.
 * Unicidad: no duplicar planilla Abierta/En Proceso/Verificada para mismo slot.
 * Crea acc_cuotas_accion para acciones multi-período.
 */
export class CreateCalendarioNominaMaestro1708531900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop FK de acc_acciones_personal a nom_planillas
    await queryRunner.dropForeignKey(
      'acc_acciones_personal',
      'FK_accion_planilla',
    );

    // 2. Drop nom_planillas
    await queryRunner.dropTable('nom_planillas', true);

    // 3. Create nom_calendarios_nomina
    await queryRunner.createTable(
      new Table({
        name: 'nom_calendarios_nomina',
        columns: [
          {
            name: 'id_calendario_nomina',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'id_periodos_pago', type: 'int', isNullable: false },
          {
            name: 'tipo_planilla',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'Regular'",
          },
          { name: 'fecha_inicio_periodo', type: 'date', isNullable: false },
          { name: 'fecha_fin_periodo', type: 'date', isNullable: false },
          { name: 'fecha_inicio_pago', type: 'date', isNullable: false },
          { name: 'fecha_fin_pago', type: 'date', isNullable: false },
          {
            name: 'moneda_calendario_nomina',
            type: 'enum',
            enum: ['CRC', 'USD'],
            default: "'CRC'",
          },
          {
            name: 'estado_calendario_nomina',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          { name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 },
          {
            name: 'descripcion_evento_calendario_nomina',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'etiqueta_color_calendario_nomina',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'prioridad_calendario_nomina',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'fecha_aplicacion_calendario_nomina',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'fecha_creacion_calendario_nomina',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_calendario_nomina',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'creado_por_calendario_nomina',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'modificado_por_calendario_nomina',
            type: 'int',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'nom_calendarios_nomina',
      new TableIndex({
        name: 'IDX_calendario_empresa',
        columnNames: ['id_empresa'],
      }),
    );
    await queryRunner.createIndex(
      'nom_calendarios_nomina',
      new TableIndex({
        name: 'IDX_calendario_periodo_pago',
        columnNames: ['id_periodos_pago'],
      }),
    );
    await queryRunner.createIndex(
      'nom_calendarios_nomina',
      new TableIndex({
        name: 'IDX_calendario_estado',
        columnNames: ['estado_calendario_nomina'],
      }),
    );
    await queryRunner.createIndex(
      'nom_calendarios_nomina',
      new TableIndex({
        name: 'IDX_calendario_periodo_inicio_fin',
        columnNames: ['fecha_inicio_periodo', 'fecha_fin_periodo'],
      }),
    );

    await queryRunner.createForeignKey(
      'nom_calendarios_nomina',
      new TableForeignKey({
        name: 'FK_calendario_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'nom_calendarios_nomina',
      new TableForeignKey({
        name: 'FK_calendario_periodo_pago',
        columnNames: ['id_periodos_pago'],
        referencedTableName: 'nom_periodos_pago',
        referencedColumnNames: ['id_periodos_pago'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // Unicidad: no duplicar planilla operativa para mismo slot
    await queryRunner.createIndex(
      'nom_calendarios_nomina',
      new TableIndex({
        name: 'UQ_calendario_slot_operativo',
        columnNames: [
          'id_empresa',
          'id_periodos_pago',
          'fecha_inicio_periodo',
          'fecha_fin_periodo',
          'moneda_calendario_nomina',
          'tipo_planilla',
        ],
        isUnique: false, // Constraint lógico vía app; índice compuesto para consultas
      }),
    );

    // 4. Alter acc_acciones_personal: id_planilla → id_calendario_nomina
    await queryRunner.query(
      'ALTER TABLE acc_acciones_personal CHANGE COLUMN id_planilla id_calendario_nomina INT NULL',
    );
    await queryRunner.createForeignKey(
      'acc_acciones_personal',
      new TableForeignKey({
        name: 'FK_accion_calendario_nomina',
        columnNames: ['id_calendario_nomina'],
        referencedTableName: 'nom_calendarios_nomina',
        referencedColumnNames: ['id_calendario_nomina'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // 5. Create acc_cuotas_accion (multi-period actions)
    await queryRunner.createTable(
      new Table({
        name: 'acc_cuotas_accion',
        columns: [
          {
            name: 'id_cuota',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_accion', type: 'int', isNullable: false },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'id_empleado', type: 'int', isNullable: false },
          { name: 'id_calendario_nomina', type: 'int', isNullable: true },
          { name: 'numero_cuota', type: 'int', isNullable: false },
          {
            name: 'monto_cuota',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          { name: 'estado_cuota', type: 'tinyint', width: 1, default: 1 },
          { name: 'fecha_efecto_cuota', type: 'date', isNullable: true },
          { name: 'motivo_estado_cuota', type: 'text', isNullable: true },
          {
            name: 'fecha_creacion_cuota',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_cuota',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'acc_cuotas_accion',
      new TableIndex({ name: 'IDX_cuota_accion', columnNames: ['id_accion'] }),
    );
    await queryRunner.createIndex(
      'acc_cuotas_accion',
      new TableIndex({
        name: 'IDX_cuota_calendario',
        columnNames: ['id_calendario_nomina'],
      }),
    );
    await queryRunner.createIndex(
      'acc_cuotas_accion',
      new TableIndex({
        name: 'IDX_cuota_estado',
        columnNames: ['estado_cuota'],
      }),
    );

    await queryRunner.createForeignKey(
      'acc_cuotas_accion',
      new TableForeignKey({
        name: 'FK_cuota_accion',
        columnNames: ['id_accion'],
        referencedTableName: 'acc_acciones_personal',
        referencedColumnNames: ['id_accion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'acc_cuotas_accion',
      new TableForeignKey({
        name: 'FK_cuota_empresa',
        columnNames: ['id_empresa'],
        referencedTableName: 'sys_empresas',
        referencedColumnNames: ['id_empresa'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'acc_cuotas_accion',
      new TableForeignKey({
        name: 'FK_cuota_empleado',
        columnNames: ['id_empleado'],
        referencedTableName: 'sys_empleados',
        referencedColumnNames: ['id_empleado'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'acc_cuotas_accion',
      new TableForeignKey({
        name: 'FK_cuota_calendario_nomina',
        columnNames: ['id_calendario_nomina'],
        referencedTableName: 'nom_calendarios_nomina',
        referencedColumnNames: ['id_calendario_nomina'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('acc_cuotas_accion', true);
    await queryRunner.dropForeignKey(
      'acc_acciones_personal',
      'FK_accion_calendario_nomina',
    );
    await queryRunner.query(
      'ALTER TABLE acc_acciones_personal CHANGE COLUMN id_calendario_nomina id_planilla INT NULL',
    );
    await queryRunner.dropTable('nom_calendarios_nomina', true);
    // Recrear nom_planillas (simplificado)
    await queryRunner.createTable(
      new Table({
        name: 'nom_planillas',
        columns: [
          {
            name: 'id_planilla',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'id_empresa', type: 'int', isNullable: false },
          { name: 'id_periodos_pago', type: 'int', isNullable: false },
          { name: 'periodo_inicio_planilla', type: 'date', isNullable: false },
          { name: 'periodo_fin_planilla', type: 'date', isNullable: false },
          { name: 'estado_planilla', type: 'tinyint', width: 1, default: 1 },
          {
            name: 'fecha_aplicacion_planilla',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'fecha_creacion_planilla',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_modificacion_planilla',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'creado_por_planilla', type: 'int', isNullable: true },
          { name: 'modificado_por_planilla', type: 'int', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'acc_acciones_personal',
      new TableForeignKey({
        name: 'FK_accion_planilla',
        columnNames: ['id_planilla'],
        referencedTableName: 'nom_planillas',
        referencedColumnNames: ['id_planilla'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }
}
