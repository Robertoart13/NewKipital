import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Asigna la app KPITAL a usuarios que tienen empresas asignadas pero no tienen
 * ninguna app. Corrige el problema de "Sin acceso a esta aplicación" cuando
 * el usuario tiene empresas y roles pero enabledApps queda vacío.
 */
export class FixUsersWithCompaniesWithoutApp1708533100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const kpitalAppId = await queryRunner.query(
      `SELECT id_app FROM sys_apps WHERE codigo_app = 'kpital' AND estado_app = 1 LIMIT 1`,
    );
    if (!Array.isArray(kpitalAppId) || kpitalAppId.length === 0) {
      return;
    }
    const appId = (kpitalAppId[0] as { id_app: number }).id_app;

    await queryRunner.query(`
      INSERT INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
      SELECT DISTINCT ue.id_usuario, ${appId}, 1, NOW()
      FROM sys_usuario_empresa ue
      WHERE ue.estado_usuario_empresa = 1
      ON DUPLICATE KEY UPDATE estado_usuario_app = 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No revertir: los usuarios ahora tienen acceso correcto
  }
}
