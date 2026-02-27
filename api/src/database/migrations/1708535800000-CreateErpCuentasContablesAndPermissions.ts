import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateErpCuentasContablesAndPermissions1708535800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTipoCuenta = await queryRunner.hasTable('erp_tipo_cuenta');
    if (!hasTipoCuenta) {
      await queryRunner.createTable(
        new Table({
          name: 'erp_tipo_cuenta',
          columns: [
            {
              name: 'id_tipo_erp',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'nombre_tipo_erp',
              type: 'varchar',
              length: '100',
              isNullable: false,
            },
            { name: 'descripcion_tipo_erp', type: 'text', isNullable: true },
            {
              name: 'id_externo_erp',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            { name: 'status', type: 'tinyint', width: 1, default: 1 },
            {
              name: 'fecha_creacion',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'fecha_modificacion',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'erp_tipo_cuenta',
        new TableIndex({
          name: 'IDX_tipo_cuenta_status',
          columnNames: ['status'],
        }),
      );
    }

    const hasTiposAccion = await queryRunner.hasTable(
      'nom_tipos_accion_personal',
    );
    if (!hasTiposAccion) {
      await queryRunner.createTable(
        new Table({
          name: 'nom_tipos_accion_personal',
          columns: [
            {
              name: 'id_tipo_accion_personal',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'codigo_accion',
              type: 'varchar',
              length: '20',
              isNullable: false,
            },
            {
              name: 'nombre_accion',
              type: 'varchar',
              length: '150',
              isNullable: false,
            },
            { name: 'estado', type: 'tinyint', width: 1, default: 1 },
          ],
        }),
      );

      await queryRunner.createIndex(
        'nom_tipos_accion_personal',
        new TableIndex({
          name: 'IDX_tipo_accion_estado',
          columnNames: ['estado'],
        }),
      );
    }

    const hasCuentas = await queryRunner.hasTable('erp_cuentas_contables');
    if (!hasCuentas) {
      await queryRunner.createTable(
        new Table({
          name: 'erp_cuentas_contables',
          columns: [
            {
              name: 'id_cuenta_contable',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'id_empresa', type: 'int', isNullable: false },
            {
              name: 'nombre_cuenta_contable',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'descripcion_cuenta_contable',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'codigo_cuenta_contable',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'id_externo_netsuite',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'codigo_externo_cuenta',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            { name: 'id_tipo_erp', type: 'int', isNullable: false },
            { name: 'id_tipo_accion_personal', type: 'int', isNullable: false },
            { name: 'es_inactivo', type: 'tinyint', width: 1, default: 0 },
            {
              name: 'fecha_creacion',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'fecha_modificacion',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );

      await queryRunner.createIndex(
        'erp_cuentas_contables',
        new TableIndex({
          name: 'IDX_cuenta_empresa',
          columnNames: ['id_empresa'],
        }),
      );
      await queryRunner.createIndex(
        'erp_cuentas_contables',
        new TableIndex({
          name: 'IDX_cuenta_tipo',
          columnNames: ['id_tipo_erp'],
        }),
      );
      await queryRunner.createIndex(
        'erp_cuentas_contables',
        new TableIndex({
          name: 'IDX_cuenta_tipo_accion',
          columnNames: ['id_tipo_accion_personal'],
        }),
      );
      await queryRunner.createIndex(
        'erp_cuentas_contables',
        new TableIndex({
          name: 'IDX_cuenta_inactivo',
          columnNames: ['es_inactivo'],
        }),
      );
      await queryRunner.createIndex(
        'erp_cuentas_contables',
        new TableIndex({
          name: 'UQ_cuenta_empresa_codigo',
          columnNames: ['id_empresa', 'codigo_cuenta_contable'],
          isUnique: true,
        }),
      );
      await queryRunner.createIndex(
        'erp_cuentas_contables',
        new TableIndex({
          name: 'UQ_cuenta_empresa_netsuite',
          columnNames: ['id_empresa', 'id_externo_netsuite'],
          isUnique: true,
        }),
      );
      await queryRunner.createIndex(
        'erp_cuentas_contables',
        new TableIndex({
          name: 'UQ_cuenta_empresa_codigo_externo',
          columnNames: ['id_empresa', 'codigo_externo_cuenta'],
          isUnique: true,
        }),
      );

      await queryRunner.createForeignKey(
        'erp_cuentas_contables',
        new TableForeignKey({
          name: 'FK_cuenta_empresa',
          columnNames: ['id_empresa'],
          referencedTableName: 'sys_empresas',
          referencedColumnNames: ['id_empresa'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'erp_cuentas_contables',
        new TableForeignKey({
          name: 'FK_cuenta_tipo',
          columnNames: ['id_tipo_erp'],
          referencedTableName: 'erp_tipo_cuenta',
          referencedColumnNames: ['id_tipo_erp'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
      await queryRunner.createForeignKey(
        'erp_cuentas_contables',
        new TableForeignKey({
          name: 'FK_cuenta_tipo_accion',
          columnNames: ['id_tipo_accion_personal'],
          referencedTableName: 'nom_tipos_accion_personal',
          referencedColumnNames: ['id_tipo_accion_personal'],
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO erp_tipo_cuenta
        (id_tipo_erp, nombre_tipo_erp, descripcion_tipo_erp, id_externo_erp, status)
      VALUES
        (1, 'Cuentas por Pagar', 'Obligaciones con proveedores de terceros que aun no han sido pagadas.', '12', 1),
        (2, 'Cuentas por Cobrar', 'Ingresos devengados aun no cobrados de clientes.', '2', 1),
        (3, 'Banco', 'Cuentas utilizadas para registrar movimientos bancarios.', '1', 1),
        (4, 'Costo de Ventas', 'Costos directamente relacionados con la produccion o adquisicion de bienes vendidos.', '17', 1),
        (5, 'Tarjeta de Credito', 'Cuenta usada para registrar gastos pagados con tarjeta de credito.', '9', 1),
        (6, 'Gastos Diferidos', 'Gastos que se contabilizan a lo largo del tiempo.', '7', 1),
        (7, 'Ingresos Diferidos', 'Ingresos cobrados por adelantado, reconocidos en el futuro.', '8', 1),
        (8, 'Patrimonio', 'Capital o patrimonio del negocio.', '22', 1),
        (9, 'Gasto', 'Gastos operativos o administrativos.', '18', 1),
        (10, 'Activo Fijo', 'Bienes fisicos de largo plazo como equipos o edificios.', '4', 1),
        (11, 'Ingreso', 'Ingresos operativos de la empresa.', '15', 1),
        (12, 'Pasivo a Largo Plazo', 'Obligaciones que vencen en mas de un ano.', '14', 1),
        (13, 'No Contabilizable', 'Cuentas usadas para seguimiento que no generan movimientos contables.', '24', 1),
        (14, 'Otro Activo', 'Activos que no califican como corriente o fijo, como inversiones.', '3', 1),
        (15, 'Otro Activo Corriente', 'Activos a corto plazo no clasificados como cuentas bancarias o cuentas por cobrar.', '5', 1),
        (16, 'Otro Pasivo Corriente', 'Obligaciones de corto plazo no incluidas en cuentas por pagar.', '13', 1),
        (17, 'Otro Gasto', 'Gastos no recurrentes o no operativos.', '19', 1),
        (18, 'Otro Ingreso', 'Ingresos no operativos, como intereses o dividendos.', '16', 1),
        (19, 'Estadistico', 'Cuenta usada para metricas no monetarias.', '23', 1),
        (20, 'Cuentas por Cobrar (No Facturado)', 'Ingresos reconocidos aun no facturados.', '25', 1)
      ON DUPLICATE KEY UPDATE
        nombre_tipo_erp = VALUES(nombre_tipo_erp),
        descripcion_tipo_erp = VALUES(descripcion_tipo_erp),
        id_externo_erp = VALUES(id_externo_erp),
        status = VALUES(status)
    `);

    await queryRunner.query(`
      INSERT INTO nom_tipos_accion_personal
        (id_tipo_accion_personal, codigo_accion, nombre_accion, estado)
      VALUES
        (1, 'DES', 'Despidos', 1),
        (2, 'REN', 'Renuncias', 1),
        (3, 'IVM', 'IVM', 1),
        (4, 'LIQ', 'Liquidaciones', 1),
        (5, 'RET', 'Retenciones', 1),
        (6, 'DESCU', 'Descuentos', 1),
        (7, 'OTR_RET', 'Otras Retenciones', 1),
        (8, 'AUM', 'Aumentos', 1),
        (9, 'BON', 'Bonificaciones', 1),
        (10, 'COMI', 'Comisiones', 1),
        (11, 'HEX', 'Horas Extras', 1),
        (12, 'AGUI', 'Aguinaldo', 1),
        (13, 'VAC', 'Vacaciones', 1),
        (14, 'INC_CCSS', 'CCSS', 1),
        (15, 'INC_INS', 'INS', 1),
        (16, 'INC_REG', 'Regular', 1),
        (17, 'LIC_MAT', 'Maternidad / Paternidad', 1),
        (18, 'PER_GOCE', 'Permiso Con goce de salario', 1),
        (19, 'PER_SIN', 'Permiso sin goce de salario', 1),
        (20, 'AUS', 'Ausencias', 1),
        (22, 'INS', 'Incapacidades', 1),
        (23, 'LIC', 'Licencia', 1),
        (24, 'SLA', 'Salarios', 1)
      ON DUPLICATE KEY UPDATE
        codigo_accion = VALUES(codigo_accion),
        nombre_accion = VALUES(nombre_accion),
        estado = VALUES(estado)
    `);

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryRunner.query(`
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      )
      VALUES
        ('config:cuentas-contables', 'Ver cuentas contables', 'Permite listar y consultar cuentas contables', 'config', 1, '${now}'),
        ('accounting-account:create', 'Crear cuentas contables', 'Permite crear cuentas contables', 'accounting-account', 1, '${now}'),
        ('accounting-account:edit', 'Editar cuentas contables', 'Permite editar cuentas contables', 'accounting-account', 1, '${now}'),
        ('accounting-account:inactivate', 'Inactivar cuentas contables', 'Permite inactivar cuentas contables', 'accounting-account', 1, '${now}'),
        ('accounting-account:reactivate', 'Reactivar cuentas contables', 'Permite reactivar cuentas contables', 'accounting-account', 1, '${now}'),
        ('config:cuentas-contables:audit', 'Ver bitacora de cuentas contables', 'Permite ver la bitacora de cambios de cuentas contables', 'config', 1, '${now}')
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT r.id_rol, p.id_permiso, '${now}'
      FROM sys_roles r
      INNER JOIN sys_permisos p ON p.codigo_permiso IN (
        'config:cuentas-contables',
        'accounting-account:create',
        'accounting-account:edit',
        'accounting-account:inactivate',
        'accounting-account:reactivate',
        'config:cuentas-contables:audit'
      )
      WHERE r.codigo_rol IN ('MASTER', 'ADMIN_SISTEMA')
        AND r.estado_rol = 1
        AND p.estado_permiso = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN (
        'config:cuentas-contables',
        'accounting-account:create',
        'accounting-account:edit',
        'accounting-account:inactivate',
        'accounting-account:reactivate',
        'config:cuentas-contables:audit'
      )
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso IN (
        'config:cuentas-contables',
        'accounting-account:create',
        'accounting-account:edit',
        'accounting-account:inactivate',
        'accounting-account:reactivate',
        'config:cuentas-contables:audit'
      )
    `);

    const hasCuentas = await queryRunner.hasTable('erp_cuentas_contables');
    if (hasCuentas) {
      await queryRunner.dropTable('erp_cuentas_contables', true);
    }

    const hasTiposAccion = await queryRunner.hasTable(
      'nom_tipos_accion_personal',
    );
    if (hasTiposAccion) {
      await queryRunner.dropTable('nom_tipos_accion_personal', true);
    }

    const hasTipoCuenta = await queryRunner.hasTable('erp_tipo_cuenta');
    if (hasTipoCuenta) {
      await queryRunner.dropTable('erp_tipo_cuenta', true);
    }
  }
}
