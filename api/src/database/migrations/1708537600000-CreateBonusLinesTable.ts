import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBonusLinesTable1708537600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acc_bonificaciones_lineas (
        id_linea_bonificacion INT NOT NULL AUTO_INCREMENT,
        id_accion INT NOT NULL,
        id_cuota INT NULL,
        id_empresa INT NOT NULL,
        id_empleado INT NOT NULL,
        id_calendario_nomina INT NOT NULL,
        id_movimiento_nomina INT NOT NULL,
        tipo_bonificacion_linea ENUM(
          'ordinaria_salarial',
          'extraordinaria_habitual',
          'extraordinaria_ocasional',
          'no_salarial_reembolso'
        ) NOT NULL,
        cantidad_linea INT NOT NULL,
        monto_linea DECIMAL(12,2) NOT NULL,
        remuneracion_linea TINYINT(1) NOT NULL DEFAULT 1,
        formula_linea TEXT NULL,
        orden_linea INT NOT NULL,
        fecha_efecto_linea DATE NULL,
        fecha_creacion_linea TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_linea TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_linea_bonificacion),
        INDEX IDX_bon_linea_accion (id_accion),
        INDEX IDX_bon_linea_cuota (id_cuota),
        INDEX IDX_bon_linea_empresa (id_empresa),
        INDEX IDX_bon_linea_empleado (id_empleado),
        INDEX IDX_bon_linea_calendario (id_calendario_nomina),
        INDEX IDX_bon_linea_movimiento (id_movimiento_nomina),
        CONSTRAINT FK_bon_linea_accion FOREIGN KEY (id_accion)
          REFERENCES acc_acciones_personal(id_accion),
        CONSTRAINT FK_bon_linea_cuota FOREIGN KEY (id_cuota)
          REFERENCES acc_cuotas_accion(id_cuota),
        CONSTRAINT FK_bon_linea_empresa FOREIGN KEY (id_empresa)
          REFERENCES sys_empresas(id_empresa),
        CONSTRAINT FK_bon_linea_empleado FOREIGN KEY (id_empleado)
          REFERENCES sys_empleados(id_empleado),
        CONSTRAINT FK_bon_linea_calendario FOREIGN KEY (id_calendario_nomina)
          REFERENCES nom_calendarios_nomina(id_calendario_nomina),
        CONSTRAINT FK_bon_linea_movimiento FOREIGN KEY (id_movimiento_nomina)
          REFERENCES nom_movimientos_nomina(id_movimiento_nomina)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS acc_bonificaciones_lineas
    `);
  }
}
