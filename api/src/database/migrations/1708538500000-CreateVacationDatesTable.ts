import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVacationDatesTable1708538500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acc_vacaciones_fechas (
        id_vacacion_fecha INT NOT NULL AUTO_INCREMENT,
        id_accion INT NOT NULL,
        id_cuota INT NULL,
        id_empresa INT NOT NULL,
        id_empleado INT NOT NULL,
        id_calendario_nomina INT NOT NULL,
        id_movimiento_nomina INT NOT NULL,
        fecha_vacacion DATE NOT NULL,
        orden_vacacion INT NOT NULL,
        fecha_creacion_vacacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_vacacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_vacacion_fecha),
        INDEX IDX_vac_fecha_accion (id_accion),
        INDEX IDX_vac_fecha_cuota (id_cuota),
        INDEX IDX_vac_fecha_empresa (id_empresa),
        INDEX IDX_vac_fecha_empleado (id_empleado),
        INDEX IDX_vac_fecha_calendario (id_calendario_nomina),
        INDEX IDX_vac_fecha_movimiento (id_movimiento_nomina),
        INDEX IDX_vac_fecha (fecha_vacacion),
        CONSTRAINT FK_vac_fecha_accion FOREIGN KEY (id_accion)
          REFERENCES acc_acciones_personal(id_accion),
        CONSTRAINT FK_vac_fecha_cuota FOREIGN KEY (id_cuota)
          REFERENCES acc_cuotas_accion(id_cuota),
        CONSTRAINT FK_vac_fecha_empresa FOREIGN KEY (id_empresa)
          REFERENCES sys_empresas(id_empresa),
        CONSTRAINT FK_vac_fecha_empleado FOREIGN KEY (id_empleado)
          REFERENCES sys_empleados(id_empleado),
        CONSTRAINT FK_vac_fecha_calendario FOREIGN KEY (id_calendario_nomina)
          REFERENCES nom_calendarios_nomina(id_calendario_nomina),
        CONSTRAINT FK_vac_fecha_movimiento FOREIGN KEY (id_movimiento_nomina)
          REFERENCES nom_movimientos_nomina(id_movimiento_nomina)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS acc_vacaciones_fechas
    `);
  }
}
