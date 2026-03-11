import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDistributionRulesTables1708540200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS config_reglas_distribucion (
        id_regla_distribucion INT NOT NULL AUTO_INCREMENT,
        public_id_regla_distribucion VARCHAR(80) NOT NULL,
        id_empresa INT NOT NULL,
        es_regla_global TINYINT(1) NOT NULL DEFAULT 1,
        id_departamento INT NULL,
        id_puesto INT NULL,
        estado_regla TINYINT(1) NOT NULL DEFAULT 1,
        creado_por_regla INT NULL,
        modificado_por_regla INT NULL,
        fecha_creacion_regla DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_regla DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_regla_distribucion),
        UNIQUE KEY UQ_regla_public_id (public_id_regla_distribucion),
        KEY IDX_regla_empresa (id_empresa),
        KEY IDX_regla_global (es_regla_global),
        KEY IDX_regla_departamento (id_departamento),
        KEY IDX_regla_puesto (id_puesto),
        KEY IDX_regla_estado (estado_regla),
        CONSTRAINT FK_regla_empresa FOREIGN KEY (id_empresa)
          REFERENCES sys_empresas(id_empresa)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT FK_regla_departamento FOREIGN KEY (id_departamento)
          REFERENCES org_departamentos(id_departamento)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT FK_regla_puesto FOREIGN KEY (id_puesto)
          REFERENCES org_puestos(id_puesto)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS config_reglas_distribucion_detalle (
        id_regla_distribucion_detalle INT NOT NULL AUTO_INCREMENT,
        id_regla_distribucion INT NOT NULL,
        id_tipo_accion_personal INT NOT NULL,
        id_cuenta_contable INT NOT NULL,
        PRIMARY KEY (id_regla_distribucion_detalle),
        UNIQUE KEY UQ_regla_detalle_tipo (id_regla_distribucion, id_tipo_accion_personal),
        KEY IDX_regla_detalle_regla (id_regla_distribucion),
        KEY IDX_regla_detalle_tipo_accion (id_tipo_accion_personal),
        KEY IDX_regla_detalle_cuenta (id_cuenta_contable),
        CONSTRAINT FK_regla_detalle_regla FOREIGN KEY (id_regla_distribucion)
          REFERENCES config_reglas_distribucion(id_regla_distribucion)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT FK_regla_detalle_tipo_accion FOREIGN KEY (id_tipo_accion_personal)
          REFERENCES nom_tipos_accion_personal(id_tipo_accion_personal)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT FK_regla_detalle_cuenta FOREIGN KEY (id_cuenta_contable)
          REFERENCES erp_cuentas_contables(id_cuenta_contable)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS config_reglas_distribucion_detalle');
    await queryRunner.query('DROP TABLE IF EXISTS config_reglas_distribucion');
  }
}
