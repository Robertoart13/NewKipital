import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDiscountPayrollArticlesAndMovements1708538400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO nom_articulos_nomina (
        id_empresa,
        nombre_articulo_nomina,
        descripcion_articulo_nomina,
        id_tipo_accion_personal,
        id_tipo_articulo_nomina,
        id_cuenta_gasto,
        id_cuenta_pasivo,
        es_inactivo
      )
      SELECT
        e.id_empresa,
        'Articulo de nomina Descuento',
        'Articulo operativo para acciones de personal de descuentos.',
        6,
        2,
        cuentas.id_cuenta_contable,
        NULL,
        0
      FROM sys_empresas e
      INNER JOIN (
        SELECT id_empresa, MIN(id_cuenta_contable) AS id_cuenta_contable
        FROM erp_cuentas_contables
        WHERE es_inactivo = 0
        GROUP BY id_empresa
      ) cuentas
        ON cuentas.id_empresa = e.id_empresa
      WHERE NOT EXISTS (
        SELECT 1
        FROM nom_articulos_nomina a
        WHERE a.id_empresa = e.id_empresa
          AND a.id_tipo_accion_personal = 6
          AND LOWER(a.nombre_articulo_nomina) = LOWER('Articulo de nomina Descuento')
      )
    `);

    await queryRunner.query(`
      INSERT INTO nom_movimientos_nomina (
        id_empresa_movimiento_nomina,
        nombre_movimiento_nomina,
        id_articulo_nomina_movimiento_nomina,
        id_tipo_accion_personal_movimiento_nomina,
        id_clase_movimiento_nomina,
        id_proyecto_movimiento_nomina,
        descripcion_movimiento_nomina,
        es_monto_fijo_movimiento_nomina,
        monto_fijo_movimiento_nomina,
        porcentaje_movimiento_nomina,
        formula_ayuda_movimiento_nomina,
        es_inactivo_movimiento_nomina
      )
      SELECT
        a.id_empresa,
        'Descuento Fijo',
        a.id_articulo_nomina,
        6,
        NULL,
        NULL,
        'Movimiento de Descuento por monto fijo.',
        1,
        '10000',
        '0',
        'Monto fijo x cantidad.',
        0
      FROM nom_articulos_nomina a
      WHERE a.id_tipo_accion_personal = 6
        AND a.es_inactivo = 0
        AND NOT EXISTS (
          SELECT 1
          FROM nom_movimientos_nomina m
          WHERE m.id_empresa_movimiento_nomina = a.id_empresa
            AND m.id_tipo_accion_personal_movimiento_nomina = 6
            AND LOWER(m.nombre_movimiento_nomina) = LOWER('Descuento Fijo')
        )
    `);

    await queryRunner.query(`
      INSERT INTO nom_movimientos_nomina (
        id_empresa_movimiento_nomina,
        nombre_movimiento_nomina,
        id_articulo_nomina_movimiento_nomina,
        id_tipo_accion_personal_movimiento_nomina,
        id_clase_movimiento_nomina,
        id_proyecto_movimiento_nomina,
        descripcion_movimiento_nomina,
        es_monto_fijo_movimiento_nomina,
        monto_fijo_movimiento_nomina,
        porcentaje_movimiento_nomina,
        formula_ayuda_movimiento_nomina,
        es_inactivo_movimiento_nomina
      )
      SELECT
        a.id_empresa,
        'Descuento Porcentaje',
        a.id_articulo_nomina,
        6,
        NULL,
        NULL,
        'Movimiento de Descuento por porcentaje sobre salario base del periodo.',
        0,
        '0',
        '10',
        'salario_base_periodo x porcentaje x cantidad.',
        0
      FROM nom_articulos_nomina a
      WHERE a.id_tipo_accion_personal = 6
        AND a.es_inactivo = 0
        AND NOT EXISTS (
          SELECT 1
          FROM nom_movimientos_nomina m
          WHERE m.id_empresa_movimiento_nomina = a.id_empresa
            AND m.id_tipo_accion_personal_movimiento_nomina = 6
            AND LOWER(m.nombre_movimiento_nomina) = LOWER('Descuento Porcentaje')
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM nom_movimientos_nomina
      WHERE id_tipo_accion_personal_movimiento_nomina = 6
        AND LOWER(nombre_movimiento_nomina) IN (
          LOWER('Descuento Fijo'),
          LOWER('Descuento Porcentaje')
        )
    `);

    await queryRunner.query(`
      DELETE FROM nom_articulos_nomina
      WHERE id_tipo_accion_personal = 6
        AND LOWER(nombre_articulo_nomina) = LOWER('Articulo de nomina Descuento')
    `);
  }
}


