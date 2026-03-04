import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIncreaseLinesTable1708538700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acc_aumentos_lineas (
        id_linea_aumento INT NOT NULL AUTO_INCREMENT,
        id_accion INT NOT NULL,
        id_empresa INT NOT NULL,
        id_empleado INT NOT NULL,
        id_calendario_nomina INT NOT NULL,
        id_movimiento_nomina INT NOT NULL,
        metodo_calculo_linea ENUM('MONTO', 'PORCENTAJE') NOT NULL,
        porcentaje_linea DECIMAL(7,4) NOT NULL DEFAULT 0,
        monto_linea DECIMAL(12,2) NOT NULL,
        salario_actual_linea DECIMAL(12,2) NOT NULL,
        nuevo_salario_linea DECIMAL(12,2) NOT NULL,
        remuneracion_linea TINYINT(1) NOT NULL DEFAULT 1,
        formula_linea TEXT NULL,
        orden_linea INT NOT NULL,
        fecha_efecto_linea DATE NULL,
        fecha_creacion_linea TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_linea TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_linea_aumento),
        INDEX IDX_aum_linea_accion (id_accion),
        INDEX IDX_aum_linea_empresa (id_empresa),
        INDEX IDX_aum_linea_empleado (id_empleado),
        INDEX IDX_aum_linea_calendario (id_calendario_nomina),
        INDEX IDX_aum_linea_movimiento (id_movimiento_nomina),
        CONSTRAINT FK_aum_linea_accion FOREIGN KEY (id_accion)
          REFERENCES acc_acciones_personal(id_accion),
        CONSTRAINT FK_aum_linea_empresa FOREIGN KEY (id_empresa)
          REFERENCES sys_empresas(id_empresa),
        CONSTRAINT FK_aum_linea_empleado FOREIGN KEY (id_empleado)
          REFERENCES sys_empleados(id_empleado),
        CONSTRAINT FK_aum_linea_calendario FOREIGN KEY (id_calendario_nomina)
          REFERENCES nom_calendarios_nomina(id_calendario_nomina),
        CONSTRAINT FK_aum_linea_movimiento FOREIGN KEY (id_movimiento_nomina)
          REFERENCES nom_movimientos_nomina(id_movimiento_nomina)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS acc_aumentos_lineas
    `);
  }
}
