import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed: 4 empresas adicionales + asignar 2 (EB, EG) al usuario admin.
 * Para probar selector de empresa al crear empleado y validación 403.
 */
export class SeedEmpresasMultiempresaPrueba1708532300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await queryRunner.query(`
      INSERT IGNORE INTO sys_empresas
        (nombre_empresa, nombre_legal_empresa, cedula_empresa, prefijo_empresa,
         estado_empresa, fecha_creacion_empresa, fecha_modificacion_empresa,
         creado_por_empresa, modificado_por_empresa)
      VALUES
        ('Empresa Beta', 'Empresa Beta S.A.', '3-101-111111', 'EB', 1, '${now}', '${now}', 1, 1),
        ('Empresa Gamma', 'Empresa Gamma S.A.', '3-101-222222', 'EG', 1, '${now}', '${now}', 1, 1),
        ('Empresa Delta', 'Empresa Delta S.A.', '3-101-333333', 'ED', 1, '${now}', '${now}', 1, 1),
        ('Empresa Omega', 'Empresa Omega S.A.', '3-101-444444', 'EO', 1, '${now}', '${now}', 1, 1)
    `);

    const adminRow = await queryRunner.query(
      `SELECT id_usuario FROM sys_usuarios WHERE email_usuario = 'roberto@kpital360.com' LIMIT 1`,
    );
    const adminId = adminRow?.[0]?.id_usuario ?? 1;

    const empresas = await queryRunner.query(
      `SELECT id_empresa, prefijo_empresa FROM sys_empresas WHERE prefijo_empresa IN ('EB','EG')`,
    );

    for (const e of empresas) {
      await queryRunner.query(`
        INSERT IGNORE INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
        VALUES (${adminId}, ${e.id_empresa}, 1, '${now}')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const adminId = 1;
    await queryRunner.query(`
      DELETE ue FROM sys_usuario_empresa ue
      INNER JOIN sys_empresas e ON ue.id_empresa = e.id_empresa
      WHERE ue.id_usuario = ${adminId} AND e.prefijo_empresa IN ('EB','EG')
    `);
    await queryRunner.query(
      `DELETE FROM sys_empresas WHERE prefijo_empresa IN ('EB','EG','ED','EO')`,
    );
  }
}
