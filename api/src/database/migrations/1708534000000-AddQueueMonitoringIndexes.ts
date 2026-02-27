import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQueueMonitoringIndexes1708534000000 implements MigrationInterface {
  name = 'AddQueueMonitoringIndexes1708534000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createIndexIfMissing(
      queryRunner,
      'sys_empleado_identity_queue',
      'IDX_identity_queue_operational',
      'estado_queue, next_retry_at_queue, locked_at_queue, id_identity_queue',
    );
    await this.createIndexIfMissing(
      queryRunner,
      'sys_empleado_identity_queue',
      'IDX_identity_queue_employee',
      'id_empleado',
    );
    await this.createIndexIfMissing(
      queryRunner,
      'sys_empleado_identity_queue',
      'IDX_identity_queue_stuck',
      'estado_queue, locked_at_queue',
    );

    await this.createIndexIfMissing(
      queryRunner,
      'sys_empleado_encrypt_queue',
      'IDX_encrypt_queue_operational',
      'estado_queue, next_retry_at_queue, locked_at_queue, id_encrypt_queue',
    );
    await this.createIndexIfMissing(
      queryRunner,
      'sys_empleado_encrypt_queue',
      'IDX_encrypt_queue_employee',
      'id_empleado',
    );
    await this.createIndexIfMissing(
      queryRunner,
      'sys_empleado_encrypt_queue',
      'IDX_encrypt_queue_stuck',
      'estado_queue, locked_at_queue',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(
      queryRunner,
      'sys_empleado_identity_queue',
      'IDX_identity_queue_operational',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'sys_empleado_identity_queue',
      'IDX_identity_queue_employee',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'sys_empleado_identity_queue',
      'IDX_identity_queue_stuck',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'sys_empleado_encrypt_queue',
      'IDX_encrypt_queue_operational',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'sys_empleado_encrypt_queue',
      'IDX_encrypt_queue_employee',
    );
    await this.dropIndexIfExists(
      queryRunner,
      'sys_empleado_encrypt_queue',
      'IDX_encrypt_queue_stuck',
    );
  }

  private async createIndexIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
    columns: string,
  ): Promise<void> {
    const [row] = (await queryRunner.query(
      `
      SELECT COUNT(*) AS cnt
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
    `,
      [tableName, indexName],
    )) as Array<{ cnt: number }>;

    if (Number(row?.cnt ?? 0) > 0) return;
    await queryRunner.query(
      `CREATE INDEX ${indexName} ON ${tableName} (${columns})`,
    );
  }

  private async dropIndexIfExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<void> {
    const [row] = (await queryRunner.query(
      `
      SELECT COUNT(*) AS cnt
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
    `,
      [tableName, indexName],
    )) as Array<{ cnt: number }>;

    if (Number(row?.cnt ?? 0) === 0) return;
    await queryRunner.query(`DROP INDEX ${indexName} ON ${tableName}`);
  }
}
