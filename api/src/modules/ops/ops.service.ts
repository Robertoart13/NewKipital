import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeIdentityQueue } from '../employees/entities/employee-identity-queue.entity';
import { EmployeeEncryptQueue } from '../employees/entities/employee-encrypt-queue.entity';
import { EmployeeDataAutomationWorkerService } from '../employees/services/employee-data-automation-worker.service';
import { EmployeeVacationService } from '../employees/services/employee-vacation.service';
import { ListQueueJobsDto, QueueType } from './dto/list-queue-jobs.dto';

type QueueRow = {
  id_queue: number;
  id_empleado: number;
  estado_queue: string;
  attempts_queue: number;
  next_retry_at_queue: string | null;
  locked_by_queue: string | null;
  locked_at_queue: string | null;
  last_error_queue: string | null;
  fecha_creacion_queue: string;
  fecha_modificacion_queue: string;
};

@Injectable()
export class OpsService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeIdentityQueue)
    private readonly identityQueueRepo: Repository<EmployeeIdentityQueue>,
    @InjectRepository(EmployeeEncryptQueue)
    private readonly encryptQueueRepo: Repository<EmployeeEncryptQueue>,
    private readonly workerService: EmployeeDataAutomationWorkerService,
    private readonly vacationService: EmployeeVacationService,
  ) {}

  async getSummary() {
    const [identityStatus, encryptStatus] = await Promise.all([
      this.identityQueueRepo.query(
        `SELECT estado_queue, COUNT(*) AS cnt FROM sys_empleado_identity_queue GROUP BY estado_queue`,
      ) as Promise<Array<{ estado_queue: string; cnt: number }>>,
      this.encryptQueueRepo.query(
        `SELECT estado_queue, COUNT(*) AS cnt FROM sys_empleado_encrypt_queue GROUP BY estado_queue`,
      ) as Promise<Array<{ estado_queue: string; cnt: number }>>,
    ]);

    const [activosSinUsuario] = await this.employeeRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleados WHERE estado_empleado = 1 AND id_usuario IS NULL`,
    ) as Array<{ cnt: number }>;
    const [activosNoCifrados] = await this.employeeRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleados WHERE estado_empleado = 1 AND (datos_encriptados_empleado = 0 OR datos_encriptados_empleado IS NULL)`,
    ) as Array<{ cnt: number }>;
    const [plaintextDetected] = await this.employeeRepo.query(
      `
        SELECT COUNT(*) AS cnt
        FROM sys_empleados
        WHERE (nombre_empleado IS NOT NULL AND nombre_empleado NOT LIKE 'enc:v%')
           OR (apellido1_empleado IS NOT NULL AND apellido1_empleado NOT LIKE 'enc:v%')
           OR (cedula_empleado IS NOT NULL AND cedula_empleado NOT LIKE 'enc:v%')
           OR (email_empleado IS NOT NULL AND email_empleado NOT LIKE 'enc:v%')
           OR (salario_base_empleado IS NOT NULL AND salario_base_empleado NOT LIKE 'enc:v%')
      `,
    ) as Array<{ cnt: number }>;

    const [oldestPending] = await this.identityQueueRepo.query(
      `
        SELECT MIN(ts) AS oldest_pending
        FROM (
          SELECT MIN(fecha_creacion_queue) AS ts FROM sys_empleado_identity_queue WHERE estado_queue = 'PENDING'
          UNION ALL
          SELECT MIN(fecha_creacion_queue) AS ts FROM sys_empleado_encrypt_queue WHERE estado_queue = 'PENDING'
        ) t
      `,
    ) as Array<{ oldest_pending: string | null }>;

    const [done5Identity] = await this.identityQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_identity_queue WHERE estado_queue = 'DONE' AND fecha_modificacion_queue >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    ) as Array<{ cnt: number }>;
    const [done5Encrypt] = await this.encryptQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_encrypt_queue WHERE estado_queue = 'DONE' AND fecha_modificacion_queue >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
    ) as Array<{ cnt: number }>;
    const [done15Identity] = await this.identityQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_identity_queue WHERE estado_queue = 'DONE' AND fecha_modificacion_queue >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
    ) as Array<{ cnt: number }>;
    const [done15Encrypt] = await this.encryptQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_encrypt_queue WHERE estado_queue = 'DONE' AND fecha_modificacion_queue >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
    ) as Array<{ cnt: number }>;
    const [errors15Identity] = await this.identityQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_identity_queue WHERE estado_queue LIKE 'ERROR%' AND fecha_modificacion_queue >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
    ) as Array<{ cnt: number }>;
    const [errors15Encrypt] = await this.encryptQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_encrypt_queue WHERE estado_queue LIKE 'ERROR%' AND fecha_modificacion_queue >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
    ) as Array<{ cnt: number }>;
    const [stuckIdentity] = await this.identityQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_identity_queue WHERE estado_queue = 'PROCESSING' AND (locked_at_queue IS NULL OR locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
    ) as Array<{ cnt: number }>;
    const [stuckEncrypt] = await this.encryptQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_encrypt_queue WHERE estado_queue = 'PROCESSING' AND (locked_at_queue IS NULL OR locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
    ) as Array<{ cnt: number }>;

    const oldestPendingAgeMinutes = oldestPending?.oldest_pending
      ? await this.getOldestPendingAgeMinutes(oldestPending.oldest_pending)
      : 0;

    return {
      identity: this.groupStatus(identityStatus),
      encrypt: this.groupStatus(encryptStatus),
      activosSinUsuario: Number(activosSinUsuario?.cnt ?? 0),
      activosNoCifrados: Number(activosNoCifrados?.cnt ?? 0),
      plaintextDetected: Number(plaintextDetected?.cnt ?? 0),
      oldestPendingAgeMinutes,
      throughputJobsPerMin5: Number(((Number(done5Identity?.cnt ?? 0) + Number(done5Encrypt?.cnt ?? 0)) / 5).toFixed(2)),
      throughputJobsPerMin15: Number(((Number(done15Identity?.cnt ?? 0) + Number(done15Encrypt?.cnt ?? 0)) / 15).toFixed(2)),
      errorsLast15m: Number(errors15Identity?.cnt ?? 0) + Number(errors15Encrypt?.cnt ?? 0),
      stuckProcessing: Number(stuckIdentity?.cnt ?? 0) + Number(stuckEncrypt?.cnt ?? 0),
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async listQueue(queue: QueueType, filters: ListQueueJobsDto) {
    const table = queue === 'identity' ? 'sys_empleado_identity_queue' : 'sys_empleado_encrypt_queue';
    const idField = queue === 'identity' ? 'id_identity_queue' : 'id_encrypt_queue';
    const includeDone = filters.includeDone === 1;
    const page = Math.max(1, filters.page ?? 1);
    const maxPageSize = includeDone ? 100 : 200;
    const pageSize = Math.min(maxPageSize, Math.max(1, filters.pageSize ?? 25));
    const offset = (page - 1) * pageSize;
    const where: string[] = [];
    const params: Array<string | number> = [];

    if (filters.estado) {
      where.push('estado_queue = ?');
      params.push(filters.estado);
    } else if (includeDone) {
      where.push(`estado_queue = 'DONE'`);
    } else {
      where.push(`estado_queue <> 'DONE'`);
    }
    if (filters.idEmpleado) {
      where.push('id_empleado = ?');
      params.push(filters.idEmpleado);
    }
    if (filters.attemptsMin != null) {
      where.push('attempts_queue >= ?');
      params.push(filters.attemptsMin);
    }
    if (filters.fechaDesde) {
      where.push('fecha_creacion_queue >= ?');
      params.push(filters.fechaDesde);
    }
    if (filters.fechaHasta) {
      where.push('fecha_creacion_queue <= ?');
      params.push(filters.fechaHasta);
    } else if (includeDone && !filters.fechaDesde) {
      where.push('fecha_creacion_queue >= DATE_SUB(NOW(), INTERVAL 1 DAY)');
    }
    if (filters.lockedOnly === 1) {
      where.push('locked_at_queue IS NOT NULL');
    }
    if (filters.stuckOnly === 1) {
      where.push(`estado_queue = 'PROCESSING' AND locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const query = `
      SELECT
        ${idField} AS id_queue,
        id_empleado,
        estado_queue,
        attempts_queue,
        next_retry_at_queue,
        locked_by_queue,
        locked_at_queue,
        last_error_queue,
        fecha_creacion_queue,
        fecha_modificacion_queue
      FROM ${table}
      ${whereClause}
      ORDER BY
        CASE
          WHEN estado_queue = 'PENDING' THEN 1
          WHEN estado_queue = 'PROCESSING' THEN 2
          WHEN estado_queue LIKE 'ERROR%' THEN 3
          WHEN estado_queue = 'DONE' THEN 4
          ELSE 5
        END ASC,
        CASE WHEN estado_queue = 'PENDING' THEN fecha_creacion_queue END ASC,
        CASE WHEN estado_queue = 'PROCESSING' THEN fecha_creacion_queue END ASC,
        CASE WHEN estado_queue LIKE 'ERROR%' THEN fecha_modificacion_queue END DESC,
        CASE WHEN estado_queue = 'DONE' THEN fecha_modificacion_queue END DESC,
        ${idField} DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await this.identityQueueRepo.query(query, [...params, pageSize, offset]) as QueueRow[];
    const [countRow] = await this.identityQueueRepo.query(
      `SELECT COUNT(*) AS total FROM ${table} ${whereClause}`,
      params,
    ) as Array<{ total: number }>;

    return {
      data: rows.map((row) => ({
        idQueue: Number(row.id_queue),
        idEmpleado: Number(row.id_empleado),
        estado: row.estado_queue,
        attempts: Number(row.attempts_queue),
        nextRetryAt: row.next_retry_at_queue,
        lockedBy: row.locked_by_queue,
        lockedAt: row.locked_at_queue,
        lastError: this.redactError(row.last_error_queue),
        createdAt: row.fecha_creacion_queue,
        updatedAt: row.fecha_modificacion_queue,
        diagnostico: this.buildDiagnostic(row),
      })),
      total: Number(countRow?.total ?? 0),
      page,
      pageSize,
    };
  }

  async healthCheck() {
    const [identityReady] = await this.identityQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_identity_queue WHERE estado_queue = 'PENDING' AND (next_retry_at_queue IS NULL OR next_retry_at_queue <= NOW())`,
    ) as Array<{ cnt: number }>;
    const [encryptReady] = await this.encryptQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_encrypt_queue WHERE estado_queue = 'PENDING' AND (next_retry_at_queue IS NULL OR next_retry_at_queue <= NOW())`,
    ) as Array<{ cnt: number }>;
    const [stuckIdentity] = await this.identityQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_identity_queue WHERE estado_queue = 'PROCESSING' AND (locked_at_queue IS NULL OR locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
    ) as Array<{ cnt: number }>;
    const [stuckEncrypt] = await this.encryptQueueRepo.query(
      `SELECT COUNT(*) AS cnt FROM sys_empleado_encrypt_queue WHERE estado_queue = 'PROCESSING' AND (locked_at_queue IS NULL OR locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE))`,
    ) as Array<{ cnt: number }>;

    return {
      pendingReadyIdentity: Number(identityReady?.cnt ?? 0),
      pendingReadyEncrypt: Number(encryptReady?.cnt ?? 0),
      stuckIdentity: Number(stuckIdentity?.cnt ?? 0),
      stuckEncrypt: Number(stuckEncrypt?.cnt ?? 0),
      healthy: Number(stuckIdentity?.cnt ?? 0) === 0 && Number(stuckEncrypt?.cnt ?? 0) === 0,
    };
  }

  async rescanNow() {
    return this.workerService.runRescanNow();
  }

  async releaseStuckNow() {
    return this.workerService.releaseStuckNow();
  }

  async requeue(queue: QueueType, idQueue: number) {
    const table = queue === 'identity' ? 'sys_empleado_identity_queue' : 'sys_empleado_encrypt_queue';
    const idField = queue === 'identity' ? 'id_identity_queue' : 'id_encrypt_queue';
    await this.identityQueueRepo.query(
      `
        UPDATE ${table}
        SET estado_queue = 'PENDING',
            next_retry_at_queue = NULL,
            locked_by_queue = NULL,
            locked_at_queue = NULL,
            last_error_queue = NULL,
            fecha_modificacion_queue = NOW()
        WHERE ${idField} = ?
          AND estado_queue <> 'DONE'
      `,
      [idQueue],
    );

    return { ok: true };
  }

  async runVacationProvisionNow() {
    return this.vacationService.runDailyProvision();
  }

  private groupStatus(rows: Array<{ estado_queue: string; cnt: number }>) {
    const grouped: Record<string, number> = {};
    for (const row of rows) grouped[row.estado_queue] = Number(row.cnt);
    return grouped;
  }

  private redactError(error: string | null): string | null {
    if (!error) return null;
    return error
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .replace(/\b\d{8,}\b/g, '[redacted-id]')
      .slice(0, 500);
  }

  private buildDiagnostic(row: QueueRow): string {
    if (row.estado_queue === 'PROCESSING' && (!row.locked_at_queue || this.isStuck(row.locked_at_queue))) {
      return 'Stuck (locked_at vencido o null)';
    }
    if (row.estado_queue.startsWith('ERROR_CONFIG')) return 'ERROR_CONFIG: falta configuración (app/rol).';
    if (row.estado_queue.startsWith('ERROR_DUPLICATE')) return 'ERROR_DUPLICATE: conflicto de identidad.';
    if (row.estado_queue === 'PENDING' && row.next_retry_at_queue && new Date(row.next_retry_at_queue) > new Date()) {
      return 'Bloqueado por next_retry_at en futuro.';
    }
    if (row.estado_queue === 'PENDING') return 'Procesable ahora.';
    return `Estado ${row.estado_queue}.`;
  }

  private isStuck(lockedAt: string): boolean {
    const lockedTime = new Date(lockedAt).getTime();
    return Number.isFinite(lockedTime) && lockedTime < Date.now() - 10 * 60_000;
  }

  private async getOldestPendingAgeMinutes(oldestPending: string): Promise<number> {
    const [row] = await this.identityQueueRepo.query(
      `SELECT TIMESTAMPDIFF(MINUTE, ?, NOW()) AS age`,
      [oldestPending],
    ) as Array<{ age: number }>;
    return Number(row?.age ?? 0);
  }
}
