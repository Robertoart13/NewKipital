import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOvertimeLinesTable1708537800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acc_horas_extras_lineas (
        id_linea_hora_extra INT AUTO_INCREMENT PRIMARY KEY,
        id_accion INT NOT NULL,
        id_cuota INT NULL,
        id_empresa INT NOT NULL,
        id_empleado INT NOT NULL,
        id_calendario_nomina INT NOT NULL,
        id_movimiento_nomina INT NOT NULL,
        tipo_jornada_horas_extras_linea ENUM('6','7','8') NOT NULL DEFAULT '8',
        fecha_inicio_hora_extra_linea DATE NOT NULL,
        fecha_fin_hora_extra_linea DATE NOT NULL,
        cantidad_linea INT NOT NULL,
        monto_linea DECIMAL(12,2) NOT NULL,
        remuneracion_linea TINYINT(1) NOT NULL DEFAULT 1,
        formula_linea TEXT NULL,
        orden_linea INT NOT NULL,
        fecha_efecto_linea DATE NULL,
        fecha_creacion_linea DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_linea DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX IDX_hex_linea_accion (id_accion),
        INDEX IDX_hex_linea_cuota (id_cuota),
        INDEX IDX_hex_linea_empresa (id_empresa),
        INDEX IDX_hex_linea_empleado (id_empleado),
        INDEX IDX_hex_linea_calendario (id_calendario_nomina),
        INDEX IDX_hex_linea_movimiento (id_movimiento_nomina),
        CONSTRAINT FK_hex_linea_accion FOREIGN KEY (id_accion)
          REFERENCES acc_acciones_personal(id_accion) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT FK_hex_linea_cuota FOREIGN KEY (id_cuota)
          REFERENCES acc_cuotas_accion(id_cuota) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT FK_hex_linea_calendario FOREIGN KEY (id_calendario_nomina)
          REFERENCES nom_calendarios_nomina(id_calendario_nomina) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT FK_hex_linea_movimiento FOREIGN KEY (id_movimiento_nomina)
          REFERENCES nom_movimientos_nomina(id_movimiento_nomina) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT CHK_hex_linea_cantidad CHECK (cantidad_linea >= 1),
        CONSTRAINT CHK_hex_linea_monto CHECK (monto_linea >= 0),
        CONSTRAINT CHK_hex_linea_fechas CHECK (fecha_inicio_hora_extra_linea <= fecha_fin_hora_extra_linea)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS acc_horas_extras_lineas
    `);
  }
}
