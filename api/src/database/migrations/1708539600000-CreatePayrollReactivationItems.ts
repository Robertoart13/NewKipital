import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayrollReactivationItems1708539600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acc_planilla_reactivation_items (
        id_reactivation_item INT NOT NULL AUTO_INCREMENT,
        id_calendario_nomina INT NOT NULL,
        id_accion INT NOT NULL,
        estado_anterior_accion TINYINT(1) NOT NULL,
        estado_nuevo_accion TINYINT(1) NOT NULL,
        es_procesado_reactivacion TINYINT(1) NOT NULL DEFAULT 0,
        resultado_reactivacion VARCHAR(32) NULL,
        motivo_resultado_reactivacion VARCHAR(255) NULL,
        fecha_creacion_reactivation_item DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_reactivation_item DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        creado_por_reactivation_item INT NULL,
        modificado_por_reactivation_item INT NULL,
        PRIMARY KEY (id_reactivation_item),
        KEY IDX_reactivation_item_payroll (id_calendario_nomina),
        KEY IDX_reactivation_item_action (id_accion),
        KEY IDX_reactivation_item_processed (id_calendario_nomina, es_procesado_reactivacion),
        CONSTRAINT FK_reactivation_item_payroll FOREIGN KEY (id_calendario_nomina)
          REFERENCES nom_calendarios_nomina(id_calendario_nomina) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT FK_reactivation_item_action FOREIGN KEY (id_accion)
          REFERENCES acc_acciones_personal(id_accion) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS acc_planilla_reactivation_items;');
  }
}
