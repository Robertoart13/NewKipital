import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddSecurityAndOutboxTables1708532200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRefreshTable = await queryRunner.hasTable('sys_refresh_sessions');
    if (!hasRefreshTable) {
      await queryRunner.createTable(
        new Table({
          name: 'sys_refresh_sessions',
          columns: [
            {
              name: 'id_refresh_session',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'jti_refresh_session',
              type: 'varchar',
              length: '64',
              isUnique: true,
            },
            { name: 'id_usuario', type: 'int' },
            {
              name: 'token_hash_refresh_session',
              type: 'varchar',
              length: '255',
            },
            { name: 'expires_at_refresh_session', type: 'datetime' },
            {
              name: 'rotated_at_refresh_session',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'revoked_at_refresh_session',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'replaced_by_jti_refresh_session',
              type: 'varchar',
              length: '64',
              isNullable: true,
            },
            {
              name: 'created_ip_refresh_session',
              type: 'varchar',
              length: '45',
              isNullable: true,
            },
            {
              name: 'created_ua_refresh_session',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'fecha_creacion_refresh_session',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'fecha_modificacion_refresh_session',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );
    }

    const refreshTable = await queryRunner.getTable('sys_refresh_sessions');
    if (
      refreshTable &&
      !refreshTable.indices.find((i) => i.name === 'IDX_refresh_session_jti')
    ) {
      await queryRunner.createIndex(
        'sys_refresh_sessions',
        new TableIndex({
          name: 'IDX_refresh_session_jti',
          columnNames: ['jti_refresh_session'],
          isUnique: true,
        }),
      );
    }
    if (
      refreshTable &&
      !refreshTable.indices.find((i) => i.name === 'IDX_refresh_session_user')
    ) {
      await queryRunner.createIndex(
        'sys_refresh_sessions',
        new TableIndex({
          name: 'IDX_refresh_session_user',
          columnNames: ['id_usuario'],
        }),
      );
    }

    const hasDomainEventsTable =
      await queryRunner.hasTable('sys_domain_events');
    if (!hasDomainEventsTable) {
      await queryRunner.query(`
        CREATE TABLE sys_domain_events (
          id_domain_event BIGINT NOT NULL AUTO_INCREMENT,
          aggregate_type_domain_event VARCHAR(100) NOT NULL,
          aggregate_id_domain_event VARCHAR(64) NOT NULL,
          event_name_domain_event VARCHAR(120) NOT NULL,
          idempotency_key_domain_event VARCHAR(140) NOT NULL,
          payload_domain_event JSON NOT NULL,
          status_domain_event VARCHAR(20) NOT NULL DEFAULT 'pending',
          occurred_at_domain_event DATETIME NOT NULL,
          published_at_domain_event DATETIME NULL,
          created_by_domain_event INT NULL,
          fecha_creacion_domain_event TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          fecha_modificacion_domain_event TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id_domain_event),
          UNIQUE KEY UQ_domain_event_idempotency (idempotency_key_domain_event),
          INDEX IDX_domain_event_status (status_domain_event),
          INDEX IDX_domain_event_name (event_name_domain_event)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    }

    const hasVersionLock = await queryRunner.hasColumn(
      'nom_calendarios_nomina',
      'version_lock_calendario_nomina',
    );
    if (!hasVersionLock) {
      await queryRunner.addColumn(
        'nom_calendarios_nomina',
        new TableColumn({
          name: 'version_lock_calendario_nomina',
          type: 'int',
          isNullable: false,
          default: 0,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasVersionLock = await queryRunner.hasColumn(
      'nom_calendarios_nomina',
      'version_lock_calendario_nomina',
    );
    if (hasVersionLock) {
      await queryRunner.dropColumn(
        'nom_calendarios_nomina',
        'version_lock_calendario_nomina',
      );
    }
    await queryRunner.query('DROP TABLE IF EXISTS sys_domain_events');
    const hasRefreshTable = await queryRunner.hasTable('sys_refresh_sessions');
    if (hasRefreshTable) {
      await queryRunner.dropTable('sys_refresh_sessions');
    }
  }
}
