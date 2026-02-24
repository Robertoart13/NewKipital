import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { EmployeeAguinaldoProvision } from '../entities/employee-aguinaldo-provision.entity';
import {
  EmployeeIdentityQueue,
  EmployeeQueueStatus,
} from '../entities/employee-identity-queue.entity';
import { EmployeeEncryptQueue } from '../entities/employee-encrypt-queue.entity';
import { User } from '../../auth/entities/user.entity';
import { UserCompany } from '../../access-control/entities/user-company.entity';
import { UserApp } from '../../access-control/entities/user-app.entity';
import { UserRole } from '../../access-control/entities/user-role.entity';
import { App } from '../../access-control/entities/app.entity';
import { Role } from '../../access-control/entities/role.entity';
import { EmployeeSensitiveDataService } from '../../../common/services/employee-sensitive-data.service';

class QueueTerminalError extends Error {
  constructor(
    message: string,
    public readonly status:
      | EmployeeQueueStatus.ERROR_CONFIG
      | EmployeeQueueStatus.ERROR_DUPLICATE
      | EmployeeQueueStatus.ERROR_PERM
      | EmployeeQueueStatus.ERROR_FATAL,
  ) {
    super(message);
  }
}

@Injectable()
export class EmployeeDataAutomationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmployeeDataAutomationWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly workerId = `employee-worker-${process.pid}`;
  private lastBacklogLogAt = 0;
  private lastRetentionRunAt = 0;

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeAguinaldoProvision)
    private readonly provisionRepo: Repository<EmployeeAguinaldoProvision>,
    @InjectRepository(EmployeeIdentityQueue)
    private readonly identityQueueRepo: Repository<EmployeeIdentityQueue>,
    @InjectRepository(EmployeeEncryptQueue)
    private readonly encryptQueueRepo: Repository<EmployeeEncryptQueue>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(UserApp)
    private readonly userAppRepo: Repository<UserApp>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly sensitiveDataService: EmployeeSensitiveDataService,
  ) {}

  onModuleInit(): void {
    const intervalMs = 5000;
    this.logger.log(`Worker started id=${this.workerId} intervalMs=${intervalMs}`);
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.timer.unref?.();
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.releaseStuckJobs(this.identityQueueRepo);
      await this.releaseStuckJobs(this.encryptQueueRepo);

      await this.enqueueIdentityCandidates();
      await this.enqueueEncryptCandidates();

      const processedIdentity = await this.processIdentityBatch(25);
      const processedEncrypt = await this.processEncryptBatch(50);
      this.logger.log(
        `Poll cycle processed identity=${processedIdentity} encrypt=${processedEncrypt}`,
      );
      await this.logBacklogSnapshotIfDue();
      await this.purgeRetentionIfDue();
    } catch (error) {
      this.logger.error(`Tick worker error: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async releaseStuckJobs(
    repo: Repository<EmployeeIdentityQueue> | Repository<EmployeeEncryptQueue>,
  ): Promise<number> {
    const result = await repo
      .createQueryBuilder()
      .update()
      .set({
        estado: EmployeeQueueStatus.PENDING,
        lockedAt: null,
        lockedBy: null,
      })
      .where('estado_queue = :processing', { processing: EmployeeQueueStatus.PROCESSING })
      .andWhere('locked_at_queue IS NOT NULL')
      .andWhere('locked_at_queue < DATE_SUB(NOW(), INTERVAL 10 MINUTE)')
      .execute();
    return Number(result.affected ?? 0);
  }

  private async enqueueIdentityCandidates(): Promise<number> {
    const rows = await this.employeeRepo.query(
      `
        SELECT e.id_empleado AS id
        FROM sys_empleados e
        LEFT JOIN sys_empleado_identity_queue q
          ON q.id_empleado = e.id_empleado
         AND q.estado_queue IN ('PENDING', 'PROCESSING')
        WHERE e.estado_empleado = 1
          AND e.id_usuario IS NULL
          AND q.id_identity_queue IS NULL
        ORDER BY e.id_empleado ASC
        LIMIT 200
      `,
    ) as Array<{ id: number }>;

    for (const row of rows) {
      const dedupeKey = `identity:${row.id}`;
      await this.identityQueueRepo.query(
        `
          INSERT IGNORE INTO sys_empleado_identity_queue (
            id_empleado,
            dedupe_key,
            estado_queue,
            attempts_queue,
            fecha_creacion_queue,
            fecha_modificacion_queue
          ) VALUES (?, ?, 'PENDING', 0, NOW(), NOW())
        `,
        [row.id, dedupeKey],
      );
    }
    if (rows.length > 0) {
      this.logger.log(`Enqueue identity candidates=${rows.length}`);
    }
    return rows.length;
  }

  private async enqueueEncryptCandidates(): Promise<number> {
    const rows = await this.employeeRepo.query(
      `
        SELECT e.id_empleado AS id
        FROM sys_empleados e
        LEFT JOIN sys_empleado_encrypt_queue q
          ON q.id_empleado = e.id_empleado
         AND q.estado_queue IN ('PENDING', 'PROCESSING')
        WHERE (e.datos_encriptados_empleado = 0 OR e.datos_encriptados_empleado IS NULL)
          AND q.id_encrypt_queue IS NULL
        ORDER BY e.id_empleado ASC
        LIMIT 200
      `,
    ) as Array<{ id: number }>;

    for (const row of rows) {
      const dedupeKey = `encrypt:${row.id}`;
      await this.encryptQueueRepo.query(
        `
          INSERT IGNORE INTO sys_empleado_encrypt_queue (
            id_empleado,
            dedupe_key,
            estado_queue,
            attempts_queue,
            fecha_creacion_queue,
            fecha_modificacion_queue
          ) VALUES (?, ?, 'PENDING', 0, NOW(), NOW())
        `,
        [row.id, dedupeKey],
      );
    }
    if (rows.length > 0) {
      this.logger.log(`Enqueue encrypt candidates=${rows.length}`);
    }
    return rows.length;
  }

  private async processIdentityBatch(limit: number): Promise<number> {
    const jobs = await this.identityQueueRepo
      .createQueryBuilder('q')
      .where('q.estado = :pending', { pending: EmployeeQueueStatus.PENDING })
      .andWhere('(q.nextRetryAt IS NULL OR q.nextRetryAt <= NOW())')
      .orderBy('q.fechaCreacion', 'ASC')
      .take(limit)
      .getMany();

    for (const job of jobs) {
      await this.processIdentityJob(job);
    }
    return jobs.length;
  }

  private async processEncryptBatch(limit: number): Promise<number> {
    const jobs = await this.encryptQueueRepo
      .createQueryBuilder('q')
      .where('q.estado = :pending', { pending: EmployeeQueueStatus.PENDING })
      .andWhere('(q.nextRetryAt IS NULL OR q.nextRetryAt <= NOW())')
      .orderBy('q.fechaCreacion', 'ASC')
      .take(limit)
      .getMany();

    for (const job of jobs) {
      await this.processEncryptJob(job);
    }
    return jobs.length;
  }

  private async processIdentityJob(job: EmployeeIdentityQueue): Promise<void> {
    await this.identityQueueRepo.update(job.id, {
      estado: EmployeeQueueStatus.PROCESSING,
      lockedBy: this.workerId,
      lockedAt: new Date(),
      attempts: job.attempts + 1,
      lastError: null,
    });

    try {
      const employee = await this.employeeRepo.findOne({ where: { id: job.idEmpleado } });
      if (!employee) {
        throw new QueueTerminalError('Empleado no existe', EmployeeQueueStatus.ERROR_FATAL);
      }
      if (employee.estado !== 1) {
        await this.markDone(this.identityQueueRepo, job.id);
        return;
      }
      if (employee.idUsuario) {
        await this.markDone(this.identityQueueRepo, job.id);
        return;
      }

      const email = this.sensitiveDataService.decrypt(employee.email);
      const nombre = this.sensitiveDataService.decrypt(employee.nombre);
      const apellido1 = this.sensitiveDataService.decrypt(employee.apellido1);
      if (!email || !nombre || !apellido1) {
        throw new QueueTerminalError(
          'No se puede provisionar identidad sin email/nombre/apellido1',
          EmployeeQueueStatus.ERROR_FATAL,
        );
      }

      const app = await this.appRepo.findOne({ where: { codigo: 'timewise', estado: 1 } });
      if (!app) {
        throw new QueueTerminalError(
          'No existe app timewise activa',
          EmployeeQueueStatus.ERROR_CONFIG,
        );
      }

      const role = await this.roleRepo.findOne({
        where: { codigo: 'EMPLEADO_TIMEWISE', idApp: app.id, estado: 1 },
      });
      if (!role) {
        throw new QueueTerminalError(
          'No existe rol EMPLEADO_TIMEWISE activo',
          EmployeeQueueStatus.ERROR_CONFIG,
        );
      }

      let user = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
      if (!user) {
        user = this.userRepo.create({
          email: email.toLowerCase().trim(),
          nombre,
          apellido: apellido1,
          estado: 1,
          failedAttempts: 0,
          requiresPasswordReset: 0,
          creadoPor: null,
          modificadoPor: null,
        });
        user = await this.userRepo.save(user);
      } else {
        const linkedEmployee = await this.employeeRepo.findOne({
          where: { idUsuario: user.id },
          order: { id: 'DESC' },
        });
        if (linkedEmployee && linkedEmployee.id !== employee.id) {
          if (linkedEmployee.idEmpresa !== employee.idEmpresa) {
            throw new QueueTerminalError(
              `Email ya pertenece a usuario en otra empresa (userId=${user.id})`,
              EmployeeQueueStatus.ERROR_DUPLICATE,
            );
          }
          if (
            linkedEmployee.cedulaHash &&
            employee.cedulaHash &&
            linkedEmployee.cedulaHash !== employee.cedulaHash
          ) {
            throw new QueueTerminalError(
              `Email existente con cédula distinta (userId=${user.id})`,
              EmployeeQueueStatus.ERROR_DUPLICATE,
            );
          }
        }
      }

      const userCompany = await this.userCompanyRepo.findOne({
        where: { idUsuario: user.id, idEmpresa: employee.idEmpresa, estado: 1 },
      });
      if (!userCompany) {
        await this.userCompanyRepo.save(
          this.userCompanyRepo.create({
            idUsuario: user.id,
            idEmpresa: employee.idEmpresa,
            estado: 1,
          }),
        );
      }

      const userApp = await this.userAppRepo.findOne({
        where: { idUsuario: user.id, idApp: app.id },
      });
      if (!userApp) {
        await this.userAppRepo.save(
          this.userAppRepo.create({
            idUsuario: user.id,
            idApp: app.id,
            estado: 1,
          }),
        );
      } else if (userApp.estado !== 1) {
        userApp.estado = 1;
        await this.userAppRepo.save(userApp);
      }

      const userRole = await this.userRoleRepo.findOne({
        where: {
          idUsuario: user.id,
          idRol: role.id,
          idEmpresa: employee.idEmpresa,
          idApp: app.id,
        },
      });
      if (!userRole) {
        await this.userRoleRepo.save(
          this.userRoleRepo.create({
            idUsuario: user.id,
            idRol: role.id,
            idEmpresa: employee.idEmpresa,
            idApp: app.id,
            estado: 1,
            creadoPor: user.id,
            modificadoPor: user.id,
          }),
        );
      } else if (userRole.estado !== 1) {
        userRole.estado = 1;
        await this.userRoleRepo.save(userRole);
      }

      employee.idUsuario = user.id;
      employee.modificadoPor = user.id;
      await this.employeeRepo.save(employee);

      await this.markDone(this.identityQueueRepo, job.id);
      this.logger.log(`Identity job DONE queueId=${job.id} employeeId=${job.idEmpleado}`);
    } catch (error) {
      await this.failIdentityJob(job, error);
    }
  }

  private async processEncryptJob(job: EmployeeEncryptQueue): Promise<void> {
    await this.encryptQueueRepo.update(job.id, {
      estado: EmployeeQueueStatus.PROCESSING,
      lockedBy: this.workerId,
      lockedAt: new Date(),
      attempts: job.attempts + 1,
      lastError: null,
    });

    try {
      const employee = await this.employeeRepo.findOne({ where: { id: job.idEmpleado } });
      if (!employee) {
        throw new QueueTerminalError('Empleado no existe', EmployeeQueueStatus.ERROR_FATAL);
      }

      this.encryptEmployeeRecord(employee);
      await this.employeeRepo.save(employee);

      const provisions = await this.provisionRepo.find({
        where: { idEmpleado: employee.id },
      });
      for (const provision of provisions) {
        this.encryptProvisionRecord(provision);
      }
      if (provisions.length > 0) {
        await this.provisionRepo.save(provisions);
      }

      await this.markDone(this.encryptQueueRepo, job.id);
      this.logger.log(`Encrypt job DONE queueId=${job.id} employeeId=${job.idEmpleado}`);
    } catch (error) {
      await this.failEncryptJob(job, error);
    }
  }

  private encryptEmployeeRecord(employee: Employee): void {
    employee.nombre = this.encryptField(employee.nombre) ?? employee.nombre;
    employee.apellido1 = this.encryptField(employee.apellido1) ?? employee.apellido1;
    employee.apellido2 = this.encryptField(employee.apellido2);
    employee.cedula = this.encryptField(employee.cedula) ?? employee.cedula;
    employee.email = this.encryptField(employee.email) ?? employee.email;
    employee.telefono = this.encryptField(employee.telefono);
    employee.direccion = this.encryptField(employee.direccion);
    employee.salarioBase = this.encryptField(employee.salarioBase);
    employee.numeroCcss = this.encryptField(employee.numeroCcss);
    employee.cuentaBanco = this.encryptField(employee.cuentaBanco);
    employee.vacacionesAcumuladas = this.encryptField(employee.vacacionesAcumuladas);
    employee.cesantiaAcumulada = this.encryptField(employee.cesantiaAcumulada);
    employee.motivoSalida = this.encryptField(employee.motivoSalida);

    const cedulaPlain = this.sensitiveDataService.decrypt(employee.cedula);
    const emailPlain = this.sensitiveDataService.decrypt(employee.email);
    employee.cedulaHash = this.sensitiveDataService.hashCedula(cedulaPlain);
    employee.emailHash = this.sensitiveDataService.hashEmail(emailPlain);
    employee.datosEncriptados = 1;
    employee.versionEncriptacion = EmployeeSensitiveDataService.getEncryptedVersion();
    employee.fechaEncriptacion = new Date();
  }

  private encryptProvisionRecord(provision: EmployeeAguinaldoProvision): void {
    provision.montoProvisionado = this.encryptField(provision.montoProvisionado) ?? provision.montoProvisionado;
    provision.registroEmpresa = this.encryptField(provision.registroEmpresa);
    provision.datosEncriptados = 1;
    provision.versionEncriptacion = EmployeeSensitiveDataService.getEncryptedVersion();
    provision.fechaEncriptacion = new Date();
  }

  private encryptField(value: string | null | undefined): string | null {
    if (!value) return null;
    if (this.sensitiveDataService.isEncrypted(value)) return value;
    return this.sensitiveDataService.encrypt(value);
  }

  private async markDone(
    repo: Repository<EmployeeIdentityQueue> | Repository<EmployeeEncryptQueue>,
    jobId: number,
  ): Promise<void> {
    await repo.update(jobId, {
      estado: EmployeeQueueStatus.DONE,
      lockedAt: null,
      lockedBy: null,
      nextRetryAt: null,
      lastError: null,
    });
  }

  private async failIdentityJob(job: EmployeeIdentityQueue, error: unknown): Promise<void> {
    await this.failJob(this.identityQueueRepo, job, error);
  }

  private async failEncryptJob(job: EmployeeEncryptQueue, error: unknown): Promise<void> {
    await this.failJob(this.encryptQueueRepo, job, error);
  }

  private async failJob(
    repo: Repository<EmployeeIdentityQueue> | Repository<EmployeeEncryptQueue>,
    job: EmployeeIdentityQueue | EmployeeEncryptQueue,
    error: unknown,
  ): Promise<void> {
    const message = (error as Error).message || 'Error desconocido';
    if (error instanceof QueueTerminalError) {
      await repo.update(job.id, {
        estado: error.status,
        lastError: message.slice(0, 500),
        lockedAt: null,
        lockedBy: null,
        nextRetryAt: null,
      });
      this.logger.warn(
        `Job terminal queueId=${job.id} employeeId=${job.idEmpleado} status=${error.status} message=${message}`,
      );
      return;
    }

    const attempts = job.attempts + 1;
    if (attempts >= 5) {
      await repo.update(job.id, {
        estado: EmployeeQueueStatus.ERROR_FATAL,
        lastError: message.slice(0, 500),
        lockedAt: null,
        lockedBy: null,
        nextRetryAt: null,
      });
      this.logger.error(
        `Job fatal queueId=${job.id} employeeId=${job.idEmpleado} attempts=${attempts} message=${message}`,
      );
      return;
    }

    await repo.update(job.id, {
      estado: EmployeeQueueStatus.PENDING,
      lastError: message.slice(0, 500),
      lockedAt: null,
      lockedBy: null,
      nextRetryAt: new Date(Date.now() + attempts * 60_000),
    });
    this.logger.warn(
      `Job retry queueId=${job.id} employeeId=${job.idEmpleado} attempts=${attempts} nextRetryInSec=${
        attempts * 60
      } message=${message}`,
    );
  }

  private async logBacklogSnapshotIfDue(): Promise<void> {
    const now = Date.now();
    if (now - this.lastBacklogLogAt < 15 * 60_000) return;
    this.lastBacklogLogAt = now;

    const [identity] = await this.identityQueueRepo.query(
      `
        SELECT
          SUM(CASE WHEN estado_queue = 'PENDING' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN estado_queue = 'PROCESSING' THEN 1 ELSE 0 END) AS processing
        FROM sys_empleado_identity_queue
      `,
    );
    const [encrypt] = await this.encryptQueueRepo.query(
      `
        SELECT
          SUM(CASE WHEN estado_queue = 'PENDING' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN estado_queue = 'PROCESSING' THEN 1 ELSE 0 END) AS processing
        FROM sys_empleado_encrypt_queue
      `,
    );

    this.logger.log(
      `Backlog snapshot identity_pending=${identity?.pending ?? 0} identity_processing=${
        identity?.processing ?? 0
      } encrypt_pending=${encrypt?.pending ?? 0} encrypt_processing=${encrypt?.processing ?? 0}`,
    );
  }

  private async purgeRetentionIfDue(): Promise<void> {
    const now = Date.now();
    if (now - this.lastRetentionRunAt < 6 * 60_000 * 60) return;
    this.lastRetentionRunAt = now;

    const [identityDone, encryptDone] = await Promise.all([
      this.identityQueueRepo.query(
        `
          DELETE FROM sys_empleado_identity_queue
          WHERE estado_queue = 'DONE'
            AND fecha_modificacion_queue < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `,
      ) as Promise<{ affectedRows?: number }>,
      this.encryptQueueRepo.query(
        `
          DELETE FROM sys_empleado_encrypt_queue
          WHERE estado_queue = 'DONE'
            AND fecha_modificacion_queue < DATE_SUB(NOW(), INTERVAL 30 DAY)
        `,
      ) as Promise<{ affectedRows?: number }>,
    ]);

    const [identityError, encryptError] = await Promise.all([
      this.identityQueueRepo.query(
        `
          DELETE FROM sys_empleado_identity_queue
          WHERE estado_queue LIKE 'ERROR%'
            AND fecha_modificacion_queue < DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
      ) as Promise<{ affectedRows?: number }>,
      this.encryptQueueRepo.query(
        `
          DELETE FROM sys_empleado_encrypt_queue
          WHERE estado_queue LIKE 'ERROR%'
            AND fecha_modificacion_queue < DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
      ) as Promise<{ affectedRows?: number }>,
    ]);

    const [identityProcessing, encryptProcessing] = await Promise.all([
      this.identityQueueRepo.query(
        `
          DELETE FROM sys_empleado_identity_queue
          WHERE estado_queue = 'PROCESSING'
            AND fecha_modificacion_queue < DATE_SUB(NOW(), INTERVAL 7 DAY)
        `,
      ) as Promise<{ affectedRows?: number }>,
      this.encryptQueueRepo.query(
        `
          DELETE FROM sys_empleado_encrypt_queue
          WHERE estado_queue = 'PROCESSING'
            AND fecha_modificacion_queue < DATE_SUB(NOW(), INTERVAL 7 DAY)
        `,
      ) as Promise<{ affectedRows?: number }>,
    ]);

    this.logger.log(
      `Retention purge identity_done=${identityDone?.affectedRows ?? 0} encrypt_done=${
        encryptDone?.affectedRows ?? 0
      } identity_error=${identityError?.affectedRows ?? 0} encrypt_error=${
        encryptError?.affectedRows ?? 0
      } identity_processing=${identityProcessing?.affectedRows ?? 0} encrypt_processing=${
        encryptProcessing?.affectedRows ?? 0
      }`,
    );
  }

  async runRescanNow(): Promise<{ identityEnqueued: number; encryptEnqueued: number }> {
    const [identityEnqueued, encryptEnqueued] = await Promise.all([
      this.enqueueIdentityCandidates(),
      this.enqueueEncryptCandidates(),
    ]);
    return { identityEnqueued, encryptEnqueued };
  }

  async releaseStuckNow(): Promise<{ identityReleased: number; encryptReleased: number }> {
    const [identityReleased, encryptReleased] = await Promise.all([
      this.releaseStuckJobs(this.identityQueueRepo),
      this.releaseStuckJobs(this.encryptQueueRepo),
    ]);
    return { identityReleased, encryptReleased };
  }
}
