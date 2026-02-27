import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class EncryptEmployeeDataAndAutomationQueue1708533800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addEmployeeEncryptionColumns(queryRunner);
    await this.ensureProvisionTable(queryRunner);
    await this.createQueueTables(queryRunner);
    await this.seedSensitivePermission(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('sys_empleado_identity_queue')) {
      await queryRunner.dropTable('sys_empleado_identity_queue', true);
    }
    if (await queryRunner.hasTable('sys_empleado_encrypt_queue')) {
      await queryRunner.dropTable('sys_empleado_encrypt_queue', true);
    }

    await queryRunner.query(`
      DELETE rp
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso = 'employee:view-sensitive'
    `);

    await queryRunner.query(`
      DELETE FROM sys_permisos
      WHERE codigo_permiso = 'employee:view-sensitive'
    `);
  }

  private async addEmployeeEncryptionColumns(queryRunner: QueryRunner): Promise<void> {
    const table = 'sys_empleados';

    if (!(await queryRunner.hasColumn(table, 'cedula_hash_empleado'))) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN cedula_hash_empleado varchar(128) NULL AFTER cedula_empleado`,
      );
    }
    if (!(await queryRunner.hasColumn(table, 'email_hash_empleado'))) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN email_hash_empleado varchar(128) NULL AFTER email_empleado`,
      );
    }
    if (!(await queryRunner.hasColumn(table, 'datos_encriptados_empleado'))) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN datos_encriptados_empleado tinyint(1) NOT NULL DEFAULT 0 AFTER modificado_por_empleado`,
      );
    }
    if (!(await queryRunner.hasColumn(table, 'version_encriptacion_empleado'))) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN version_encriptacion_empleado varchar(10) NULL AFTER datos_encriptados_empleado`,
      );
    }
    if (!(await queryRunner.hasColumn(table, 'fecha_encriptacion_empleado'))) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD COLUMN fecha_encriptacion_empleado datetime NULL AFTER version_encriptacion_empleado`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE ${table} MODIFY COLUMN salario_base_empleado varchar(255) NULL`,
    );

    await this.dropIndexIfExists(queryRunner, table, 'UQ_b8312d7395b91ea2d3929404109');
    await this.dropIndexIfExists(queryRunner, table, 'IDX_empleado_cedula');
    await this.dropIndexIfExists(queryRunner, table, 'IDX_empleado_email');

    await this.createIndexIfNotExists(
      queryRunner,
      table,
      new TableIndex({
        name: 'IDX_empleado_cedula_hash',
        columnNames: ['cedula_hash_empleado'],
        isUnique: true,
      }),
    );
    await this.createIndexIfNotExists(
      queryRunner,
      table,
      new TableIndex({
        name: 'IDX_empleado_email_hash',
        columnNames: ['email_hash_empleado'],
        isUnique: true,
      }),
    );
  }

  private async ensureProvisionTable(queryRunner: QueryRunner): Promise<void> {
    const tableName = 'sys_empleado_provision_aguinaldo';
    if (!(await queryRunner.hasTable(tableName))) {
      await queryRunner.createTable(
        new Table({
          name: tableName,
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
            { name: 'monto_provisionado', type: 'varchar', length: '255', isNullable: false },
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
            { name: 'datos_encriptados_provision', type: 'tinyint', width: 1, default: 0 },
            { name: 'version_encriptacion_provision', type: 'varchar', length: '10', isNullable: true },
            { name: 'fecha_encriptacion_provision', type: 'datetime', isNullable: true },
          ],
          indices: [
            new TableIndex({ name: 'IDX_provision_aguinaldo_empleado', columnNames: ['id_empleado'] }),
            new TableIndex({ name: 'IDX_provision_aguinaldo_empresa', columnNames: ['id_empresa'] }),
            new TableIndex({ name: 'IDX_provision_aguinaldo_estado', columnNames: ['estado_provision_aguinaldo'] }),
          ],
        }),
      );
      await queryRunner.query(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT FK_provision_aguinaldo_empleado
        FOREIGN KEY (id_empleado) REFERENCES sys_empleados(id_empleado)
        ON UPDATE CASCADE ON DELETE RESTRICT
      `);
      await queryRunner.query(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT FK_provision_aguinaldo_empresa
        FOREIGN KEY (id_empresa) REFERENCES sys_empresas(id_empresa)
        ON UPDATE CASCADE ON DELETE RESTRICT
      `);
      return;
    }

    await queryRunner.query(
      `ALTER TABLE ${tableName} MODIFY COLUMN monto_provisionado varchar(255) NOT NULL`,
    );

    if (!(await queryRunner.hasColumn(tableName, 'datos_encriptados_provision'))) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} ADD COLUMN datos_encriptados_provision tinyint(1) NOT NULL DEFAULT 0`,
      );
    }
    if (!(await queryRunner.hasColumn(tableName, 'version_encriptacion_provision'))) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} ADD COLUMN version_encriptacion_provision varchar(10) NULL`,
      );
    }
    if (!(await queryRunner.hasColumn(tableName, 'fecha_encriptacion_provision'))) {
      await queryRunner.query(
        `ALTER TABLE ${tableName} ADD COLUMN fecha_encriptacion_provision datetime NULL`,
      );
    }
  }

  private async createQueueTables(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('sys_empleado_identity_queue'))) {
      await queryRunner.createTable(
        new Table({
          name: 'sys_empleado_identity_queue',
          columns: [
            { name: 'id_identity_queue', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'id_empleado', type: 'int' },
            { name: 'dedupe_key', type: 'varchar', length: '120' },
            { name: 'estado_queue', type: 'varchar', length: '20', default: `'PENDING'` },
            { name: 'attempts_queue', type: 'int', default: 0 },
            { name: 'next_retry_at_queue', type: 'datetime', isNullable: true },
            { name: 'locked_by_queue', type: 'varchar', length: '80', isNullable: true },
            { name: 'locked_at_queue', type: 'datetime', isNullable: true },
            { name: 'last_error_queue', type: 'varchar', length: '500', isNullable: true },
            { name: 'fecha_creacion_queue', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion_queue',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
          indices: [
            new TableIndex({
              name: 'UQ_employee_identity_queue_dedupe',
              columnNames: ['dedupe_key'],
              isUnique: true,
            }),
            new TableIndex({ name: 'IDX_identity_queue_status', columnNames: ['estado_queue'] }),
          ],
        }),
      );
    }

    if (!(await queryRunner.hasTable('sys_empleado_encrypt_queue'))) {
      await queryRunner.createTable(
        new Table({
          name: 'sys_empleado_encrypt_queue',
          columns: [
            { name: 'id_encrypt_queue', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'id_empleado', type: 'int' },
            { name: 'dedupe_key', type: 'varchar', length: '120' },
            { name: 'estado_queue', type: 'varchar', length: '20', default: `'PENDING'` },
            { name: 'attempts_queue', type: 'int', default: 0 },
            { name: 'next_retry_at_queue', type: 'datetime', isNullable: true },
            { name: 'locked_by_queue', type: 'varchar', length: '80', isNullable: true },
            { name: 'locked_at_queue', type: 'datetime', isNullable: true },
            { name: 'last_error_queue', type: 'varchar', length: '500', isNullable: true },
            { name: 'fecha_creacion_queue', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'fecha_modificacion_queue',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
          indices: [
            new TableIndex({
              name: 'UQ_employee_encrypt_queue_dedupe',
              columnNames: ['dedupe_key'],
              isUnique: true,
            }),
            new TableIndex({ name: 'IDX_encrypt_queue_status', columnNames: ['estado_queue'] }),
          ],
        }),
      );
    }
  }

  private async seedSensitivePermission(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await queryRunner.query(`
      INSERT INTO sys_permisos (
        codigo_permiso,
        nombre_permiso,
        descripcion_permiso,
        modulo_permiso,
        estado_permiso,
        fecha_creacion_permiso
      ) VALUES (
        'employee:view-sensitive',
        'Ver datos sensibles de empleado',
        'Permite ver datos sensibles desencriptados del empleado',
        'employee',
        1,
        '${now}'
      )
      ON DUPLICATE KEY UPDATE
        nombre_permiso = VALUES(nombre_permiso),
        descripcion_permiso = VALUES(descripcion_permiso),
        modulo_permiso = VALUES(modulo_permiso),
        estado_permiso = VALUES(estado_permiso)
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO sys_rol_permiso (id_rol, id_permiso, fecha_asignacion_rol_permiso)
      SELECT rp.id_rol, p2.id_permiso, '${now}'
      FROM sys_rol_permiso rp
      INNER JOIN sys_permisos p1 ON p1.id_permiso = rp.id_permiso
      INNER JOIN sys_permisos p2 ON p2.codigo_permiso = 'employee:view-sensitive'
      WHERE p1.codigo_permiso = 'employee:edit'
    `);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, indexName: string): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) return;
    const hasIndex = table.indices.some((index) => index.name === indexName);
    if (hasIndex) {
      await queryRunner.dropIndex(tableName, indexName);
    }
  }

  private async createIndexIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    index: TableIndex,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) return;
    const exists = table.indices.some((item) => item.name === index.name);
    if (!exists) {
      await queryRunner.createIndex(tableName, index);
    }
  }
}
