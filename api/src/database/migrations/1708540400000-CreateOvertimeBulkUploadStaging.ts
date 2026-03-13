import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Staging para carga masiva de horas extras.
 * - Cabecera por archivo/proceso.
 * - Filas parseadas para preview/commit transaccional.
 */
export class CreateOvertimeBulkUploadStaging1708540400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acc_horas_extras_cargas_masivas (
        id_carga_masiva INT AUTO_INCREMENT PRIMARY KEY,
        public_id_carga_masiva VARCHAR(80) NOT NULL,
        id_empresa INT NOT NULL,
        id_calendario_nomina INT NOT NULL,
        id_usuario_ejecutor INT NOT NULL,
        nombre_archivo_original VARCHAR(255) NOT NULL,
        hash_archivo_sha256 VARCHAR(128) NOT NULL,
        total_filas_archivo INT NOT NULL DEFAULT 0,
        total_filas_validas INT NOT NULL DEFAULT 0,
        total_filas_no_procesables INT NOT NULL DEFAULT 0,
        total_filas_error_bloqueante INT NOT NULL DEFAULT 0,
        estado_carga_masiva ENUM('UPLOADED','PREVIEW_OK','PREVIEW_WITH_WARNINGS','COMMIT_OK','COMMIT_FAILED') NOT NULL DEFAULT 'UPLOADED',
        mensaje_resumen_carga_masiva TEXT NULL,
        metadata_carga_masiva JSON NULL,
        fecha_creacion_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_hex_carga_empresa_planilla (id_empresa, id_calendario_nomina),
        INDEX idx_hex_carga_usuario (id_usuario_ejecutor),
        INDEX idx_hex_carga_hash (hash_archivo_sha256),
        INDEX idx_hex_carga_estado (estado_carga_masiva),
        UNIQUE KEY uq_hex_carga_public_id (public_id_carga_masiva)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS acc_horas_extras_cargas_masivas_lineas (
        id_carga_masiva_linea INT AUTO_INCREMENT PRIMARY KEY,
        id_carga_masiva INT NOT NULL,
        numero_fila_excel INT NOT NULL,
        codigo_empleado VARCHAR(120) NOT NULL,
        nombre_empleado_excel VARCHAR(255) NULL,
        id_empleado INT NULL,
        id_movimiento_nomina INT NULL,
        tipo_jornada_horas_extras_linea ENUM('6','7','8') NULL,
        cantidad_horas_linea INT NULL,
        fecha_inicio_hora_extra_linea DATE NULL,
        fecha_fin_hora_extra_linea DATE NULL,
        salario_base_empleado_linea DECIMAL(12,2) NULL,
        monto_calculado_linea DECIMAL(12,2) NULL,
        formula_calculo_linea TEXT NULL,
        hash_huella_linea_sha256 VARCHAR(128) NULL,
        estado_linea_carga_masiva ENUM('VALIDA','NO_PROCESABLE','ERROR_BLOQUEANTE','PROCESADA') NOT NULL DEFAULT 'NO_PROCESABLE',
        mensaje_linea_carga_masiva TEXT NULL,
        fecha_creacion_linea_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion_linea_carga_masiva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_hex_carga_linea_carga
          FOREIGN KEY (id_carga_masiva) REFERENCES acc_horas_extras_cargas_masivas(id_carga_masiva)
          ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_hex_carga_linea_carga (id_carga_masiva),
        INDEX idx_hex_carga_linea_estado (estado_linea_carga_masiva),
        INDEX idx_hex_carga_linea_empleado (id_empleado),
        INDEX idx_hex_carga_linea_hash (hash_huella_linea_sha256),
        UNIQUE KEY uq_hex_carga_linea_hash_upload (id_carga_masiva, hash_huella_linea_sha256)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS acc_horas_extras_cargas_masivas_lineas;`);
    await queryRunner.query(`DROP TABLE IF EXISTS acc_horas_extras_cargas_masivas;`);
  }
}
