import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Primera migración — sys_empresas (root aggregate)
 * No existe DELETE físico. Solo inactivación lógica.
 */
export class CreateSysEmpresas1708531200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sys_empresas',
        columns: [
          {
            name: 'id_empresa',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'nombre_empresa', type: 'varchar', length: '200', isNullable: false },
          { name: 'nombre_legal_empresa', type: 'varchar', length: '300', isNullable: false },
          { name: 'cedula_empresa', type: 'varchar', length: '50', isNullable: false, isUnique: true },
          { name: 'actividad_economica_empresa', type: 'varchar', length: '300', isNullable: true },
          { name: 'prefijo_empresa', type: 'varchar', length: '10', isNullable: false, isUnique: true },
          { name: 'id_externo_empresa', type: 'varchar', length: '100', isNullable: true, isUnique: true },
          { name: 'direccion_exacta_empresa', type: 'text', isNullable: true },
          { name: 'telefono_empresa', type: 'varchar', length: '30', isNullable: true },
          { name: 'email_empresa', type: 'varchar', length: '150', isNullable: true },
          { name: 'codigo_postal_empresa', type: 'varchar', length: '20', isNullable: true },
          { name: 'estado_empresa', type: 'tinyint', width: 1, default: 1 },
          { name: 'fecha_creacion_empresa', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          {
            name: 'fecha_modificacion_empresa',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          { name: 'fecha_inactivacion_empresa', type: 'datetime', isNullable: true },
          { name: 'creado_por_empresa', type: 'int', isNullable: false },
          { name: 'modificado_por_empresa', type: 'int', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('sys_empresas', new TableIndex({
      name: 'IDX_empresa_cedula',
      columnNames: ['cedula_empresa'],
      isUnique: true,
    }));

    await queryRunner.createIndex('sys_empresas', new TableIndex({
      name: 'IDX_empresa_prefijo',
      columnNames: ['prefijo_empresa'],
      isUnique: true,
    }));

    await queryRunner.createIndex('sys_empresas', new TableIndex({
      name: 'IDX_empresa_id_externo',
      columnNames: ['id_externo_empresa'],
      isUnique: true,
    }));

    await queryRunner.createIndex('sys_empresas', new TableIndex({
      name: 'IDX_empresa_estado',
      columnNames: ['estado_empresa'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sys_empresas', 'IDX_empresa_estado');
    await queryRunner.dropIndex('sys_empresas', 'IDX_empresa_id_externo');
    await queryRunner.dropIndex('sys_empresas', 'IDX_empresa_prefijo');
    await queryRunner.dropIndex('sys_empresas', 'IDX_empresa_cedula');
    await queryRunner.dropTable('sys_empresas');
  }
}
