import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Directiva 19 — Redefinición enterprise de sys_empleados + tablas org/nom.
 *
 * 1. Crea org_departamentos, org_puestos, nom_periodos_pago.
 * 2. Drop sys_empleados (vacía) y la recrea con el modelo enterprise completo.
 * 3. Seed: periodos de pago estándar.
 */
export class RedefineEmpleadoEnterprise1708531700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // ═══════ 1. org_departamentos ═══════
    await queryRunner.createTable(new Table({
      name: 'org_departamentos',
      columns: [
        { name: 'id_departamento', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre_departamento', type: 'varchar', length: '100' },
        { name: 'id_externo_departamento', type: 'varchar', length: '45', isNullable: true },
        { name: 'estado_departamento', type: 'tinyint', width: 1, default: 1 },
        { name: 'fecha_creacion_departamento', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'fecha_modificacion_departamento', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'creado_por_departamento', type: 'int', isNullable: true },
        { name: 'modificado_por_departamento', type: 'int', isNullable: true },
      ],
    }), true);

    await queryRunner.createIndex('org_departamentos', new TableIndex({ name: 'IDX_departamento_externo', columnNames: ['id_externo_departamento'] }));
    await queryRunner.createIndex('org_departamentos', new TableIndex({ name: 'IDX_departamento_estado', columnNames: ['estado_departamento'] }));

    // ═══════ 2. org_puestos ═══════
    await queryRunner.createTable(new Table({
      name: 'org_puestos',
      columns: [
        { name: 'id_puesto', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre_puesto', type: 'varchar', length: '100' },
        { name: 'descripcion_puesto', type: 'text', isNullable: true },
        { name: 'estado_puesto', type: 'tinyint', width: 1, default: 1 },
        { name: 'fecha_creacion_puesto', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'fecha_modificacion_puesto', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    await queryRunner.createIndex('org_puestos', new TableIndex({ name: 'IDX_puesto_estado', columnNames: ['estado_puesto'] }));

    // ═══════ 3. nom_periodos_pago ═══════
    await queryRunner.createTable(new Table({
      name: 'nom_periodos_pago',
      columns: [
        { name: 'id_periodos_pago', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'nombre_periodo_pago', type: 'varchar', length: '50' },
        { name: 'dias_periodo_pago', type: 'int' },
        { name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 },
        { name: 'fecha_creacion_periodo_pago', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'fecha_modificacion_periodo_pago', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    await queryRunner.createIndex('nom_periodos_pago', new TableIndex({ name: 'IDX_periodo_pago_estado', columnNames: ['es_inactivo'] }));

    // Seed periodos de pago estándar
    await queryRunner.query(`INSERT INTO nom_periodos_pago (nombre_periodo_pago, dias_periodo_pago, es_inactivo) VALUES ('Semanal', 7, 0), ('Quincenal', 15, 0), ('Mensual', 30, 0)`);

    // ═══════ 4. Drop sys_empleados vieja y recrear ═══════
    await queryRunner.dropTable('sys_empleados', true);

    await queryRunner.createTable(new Table({
      name: 'sys_empleados',
      columns: [
        // IDENTIDAD
        { name: 'id_empleado', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
        { name: 'id_empresa', type: 'int', isNullable: false },
        { name: 'codigo_empleado', type: 'varchar', length: '45', isNullable: false },
        { name: 'cedula_empleado', type: 'varchar', length: '30', isNullable: false },
        { name: 'nombre_empleado', type: 'varchar', length: '100', isNullable: false },
        { name: 'apellido1_empleado', type: 'varchar', length: '100', isNullable: false },
        { name: 'apellido2_empleado', type: 'varchar', length: '100', isNullable: true },
        // DATOS PERSONALES
        { name: 'genero_empleado', type: 'enum', enum: ['Masculino', 'Femenino', 'Otro'], isNullable: true },
        { name: 'estado_civil_empleado', type: 'enum', enum: ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Unión Libre'], isNullable: true },
        { name: 'cantidad_hijos_empleado', type: 'int', default: 0 },
        { name: 'telefono_empleado', type: 'varchar', length: '30', isNullable: true },
        { name: 'direccion_empleado', type: 'text', isNullable: true },
        // CONTACTO / LOGIN
        { name: 'email_empleado', type: 'varchar', length: '150', isNullable: false, isUnique: true },
        // RELACIONES ORG
        { name: 'id_departamento', type: 'int', isNullable: true },
        { name: 'id_puesto', type: 'int', isNullable: true },
        { name: 'id_supervisor_empleado', type: 'int', isNullable: true },
        // CONTRATO / PAGO
        { name: 'fecha_ingreso_empleado', type: 'date', isNullable: false },
        { name: 'fecha_salida_empleado', type: 'date', isNullable: true },
        { name: 'motivo_salida_empleado', type: 'text', isNullable: true },
        { name: 'tipo_contrato_empleado', type: 'enum', enum: ['Indefinido', 'Plazo Fijo', 'Por Servicios Profesionales'], isNullable: true },
        { name: 'jornada_empleado', type: 'enum', enum: ['Tiempo Completo', 'Medio Tiempo', 'Por Horas'], isNullable: true },
        { name: 'id_periodos_pago', type: 'int', isNullable: true },
        { name: 'salario_base_empleado', type: 'decimal', precision: 12, scale: 2, isNullable: true },
        { name: 'moneda_salario_empleado', type: 'enum', enum: ['CRC', 'USD'], default: `'CRC'` },
        { name: 'numero_ccss_empleado', type: 'varchar', length: '30', isNullable: true },
        { name: 'cuenta_banco_empleado', type: 'varchar', length: '50', isNullable: true },
        // ACUMULADOS HR
        { name: 'vacaciones_acumuladas_empleado', type: 'varchar', length: '200', isNullable: true },
        { name: 'cesantia_acumulada_empleado', type: 'varchar', length: '200', isNullable: true },
        // VÍNCULO IDENTIDAD
        { name: 'id_usuario', type: 'int', isNullable: true },
        // ESTADO + AUDITORÍA
        { name: 'estado_empleado', type: 'tinyint', width: 1, default: 1 },
        { name: 'fecha_creacion_empleado', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        { name: 'fecha_modificacion_empleado', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        { name: 'creado_por_empleado', type: 'int', isNullable: true },
        { name: 'modificado_por_empleado', type: 'int', isNullable: true },
      ],
    }), true);

    // ═══════ 5. Índices ═══════
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_empresa', columnNames: ['id_empresa'] }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'UQ_empleado_codigo_empresa', columnNames: ['id_empresa', 'codigo_empleado'], isUnique: true }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_cedula', columnNames: ['cedula_empleado'], isUnique: true }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_email', columnNames: ['email_empleado'], isUnique: true }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_usuario', columnNames: ['id_usuario'] }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_departamento', columnNames: ['id_departamento'] }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_puesto', columnNames: ['id_puesto'] }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_supervisor', columnNames: ['id_supervisor_empleado'] }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_periodo_pago', columnNames: ['id_periodos_pago'] }));
    await queryRunner.createIndex('sys_empleados', new TableIndex({ name: 'IDX_empleado_estado', columnNames: ['estado_empleado'] }));

    // ═══════ 6. Foreign Keys ═══════
    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({ name: 'FK_empleado_empresa', columnNames: ['id_empresa'], referencedTableName: 'sys_empresas', referencedColumnNames: ['id_empresa'], onDelete: 'RESTRICT', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({ name: 'FK_empleado_usuario', columnNames: ['id_usuario'], referencedTableName: 'sys_usuarios', referencedColumnNames: ['id_usuario'], onDelete: 'RESTRICT', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({ name: 'FK_empleado_departamento', columnNames: ['id_departamento'], referencedTableName: 'org_departamentos', referencedColumnNames: ['id_departamento'], onDelete: 'RESTRICT', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({ name: 'FK_empleado_puesto', columnNames: ['id_puesto'], referencedTableName: 'org_puestos', referencedColumnNames: ['id_puesto'], onDelete: 'RESTRICT', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({ name: 'FK_empleado_supervisor', columnNames: ['id_supervisor_empleado'], referencedTableName: 'sys_empleados', referencedColumnNames: ['id_empleado'], onDelete: 'RESTRICT', onUpdate: 'CASCADE' }));
    await queryRunner.createForeignKey('sys_empleados', new TableForeignKey({ name: 'FK_empleado_periodo_pago', columnNames: ['id_periodos_pago'], referencedTableName: 'nom_periodos_pago', referencedColumnNames: ['id_periodos_pago'], onDelete: 'RESTRICT', onUpdate: 'CASCADE' }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sys_empleados', true);
    await queryRunner.dropTable('nom_periodos_pago', true);
    await queryRunner.dropTable('org_puestos', true);
    await queryRunner.dropTable('org_departamentos', true);
  }
}
