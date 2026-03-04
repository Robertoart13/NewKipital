import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed: Permiso de TimeWise para crear distribución de costos.
 * Ejemplo de permiso exclusivo de la app TimeWise (control de asistencia y tiempo).
 */
export class SeedPermisoTimeWiseDistribucionCosto1708532700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryRunner.query(`
      INSERT INTO sys_permisos (codigo_permiso, nombre_permiso, descripcion_permiso, modulo_permiso, estado_permiso, fecha_creacion_permiso)
      VALUES (
        'timewise:distribucion-costo-create',
        'Crear distribución de costo',
        'Permite crear y configurar la distribución de costos en TimeWise. Este permiso aplica solo cuando el usuario opera en la aplicación TimeWise.',
        'timewise',
        1,
        '${now}'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM sys_permisos WHERE codigo_permiso = 'timewise:distribucion-costo-create'
    `);
  }
}
