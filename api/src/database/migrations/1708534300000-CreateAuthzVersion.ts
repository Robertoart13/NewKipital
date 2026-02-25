import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAuthzVersion1708534300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('sys_authz_version');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'sys_authz_version',
          columns: [
            { name: 'id_usuario', type: 'int', isPrimary: true },
            { name: 'version_authz', type: 'bigint', unsigned: true, default: 1 },
            {
              name: 'fecha_actualizacion_authz',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO sys_authz_version (id_usuario, version_authz)
      VALUES (0, 1)
      ON DUPLICATE KEY UPDATE version_authz = version_authz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('sys_authz_version');
    if (hasTable) {
      await queryRunner.dropTable('sys_authz_version', true);
    }
  }
}

