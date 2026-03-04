import { Table, TableForeignKey, TableIndex } from 'typeorm';

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayrollSocialChargesAndEmployeeVerification1708539500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCharges = await queryRunner.hasTable('nom_cargas_sociales');
    if (!hasCharges) {
      await queryRunner.createTable(
        new Table({
          name: 'nom_cargas_sociales',
          columns: [
            {
              name: 'id_carga_social',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_empresa', type: 'int' },
            {
              name: 'nombre_carga_social',
              type: 'varchar',
              length: '200',
            },
            { name: 'id_movimiento_carga_social', type: 'int' },
            {
              name: 'porcentaje_carga_social',
              type: 'decimal',
              precision: 10,
              scale: 4,
              default: '0',
            },
            {
              name: 'monto_carga_social',
              type: 'decimal',
              precision: 18,
              scale: 2,
              default: '0',
            },
            {
              name: 'es_inactivo_carga_social',
              type: 'tinyint',
              width: 1,
              default: 0,
            },
            {
              name: 'fecha_creacion_carga_social',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'fecha_modificacion_carga_social',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );
      await queryRunner.createIndex(
        'nom_cargas_sociales',
        new TableIndex({
          name: 'IDX_carga_social_empresa',
          columnNames: ['id_empresa'],
        }),
      );
      await queryRunner.createIndex(
        'nom_cargas_sociales',
        new TableIndex({
          name: 'IDX_carga_social_movimiento',
          columnNames: ['id_movimiento_carga_social'],
        }),
      );
      await queryRunner.createForeignKey(
        'nom_cargas_sociales',
        new TableForeignKey({
          name: 'FK_carga_social_empresa',
          columnNames: ['id_empresa'],
          referencedTableName: 'sys_empresas',
          referencedColumnNames: ['id_empresa'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nom_cargas_sociales',
        new TableForeignKey({
          name: 'FK_carga_social_movimiento',
          columnNames: ['id_movimiento_carga_social'],
          referencedTableName: 'nom_movimientos_nomina',
          referencedColumnNames: ['id_movimiento_nomina'],
          onDelete: 'RESTRICT',
        }),
      );
    }

    const hasVerif = await queryRunner.hasTable('nomina_empleado_verificado');
    if (!hasVerif) {
      await queryRunner.createTable(
        new Table({
          name: 'nomina_empleado_verificado',
          columns: [
            {
              name: 'id_verificacion',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_nomina', type: 'int' },
            { name: 'id_empleado', type: 'int' },
            {
              name: 'verificado_empleado',
              type: 'tinyint',
              width: 1,
              default: 1,
            },
            { name: 'verificado_por', type: 'int', isNullable: true },
            {
              name: 'fecha_verificacion',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'fecha_modificacion_verificacion',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
          uniques: [
            {
              name: 'UQ_verificacion_nomina_empleado',
              columnNames: ['id_nomina', 'id_empleado'],
            },
          ],
        }),
      );
      await queryRunner.createIndex(
        'nomina_empleado_verificado',
        new TableIndex({
          name: 'IDX_verificacion_nomina',
          columnNames: ['id_nomina'],
        }),
      );
      await queryRunner.createIndex(
        'nomina_empleado_verificado',
        new TableIndex({
          name: 'IDX_verificacion_empleado',
          columnNames: ['id_empleado'],
        }),
      );
      await queryRunner.createForeignKey(
        'nomina_empleado_verificado',
        new TableForeignKey({
          name: 'FK_verificacion_nomina',
          columnNames: ['id_nomina'],
          referencedTableName: 'nom_calendarios_nomina',
          referencedColumnNames: ['id_calendario_nomina'],
          onDelete: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'nomina_empleado_verificado',
        new TableForeignKey({
          name: 'FK_verificacion_empleado',
          columnNames: ['id_empleado'],
          referencedTableName: 'sys_empleados',
          referencedColumnNames: ['id_empleado'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('nomina_empleado_verificado')) {
      await queryRunner.dropTable('nomina_empleado_verificado', true);
    }
    if (await queryRunner.hasTable('nom_cargas_sociales')) {
      await queryRunner.dropTable('nom_cargas_sociales', true);
    }
  }
}
