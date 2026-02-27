import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEventEntity } from './entities/domain-event.entity';
import { AuditActionEntity } from './entities/audit-action.entity';

interface AuditEventPayload {
  modulo: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  actorUserId?: number | null;
  companyContextId?: number | null;
  descripcion: string;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private schemaReady: boolean | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(DomainEventEntity)
    private readonly domainEventRepo: Repository<DomainEventEntity>,
    @InjectRepository(AuditActionEntity)
    private readonly auditRepo: Repository<AuditActionEntity>,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.getIntervalMs();
    this.timer = setInterval(() => {
      void this.processPendingEvents();
    }, intervalMs);
    this.timer.unref?.();
    void this.processPendingEvents();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private getIntervalMs(): number {
    const raw = Number(
      this.configService.get<string>('AUDIT_WORKER_INTERVAL_MS', '3000'),
    );
    if (!Number.isFinite(raw) || raw < 1000) return 3000;
    return Math.trunc(raw);
  }

  private getBatchSize(): number {
    const raw = Number(
      this.configService.get<string>('AUDIT_WORKER_BATCH_SIZE', '100'),
    );
    if (!Number.isFinite(raw) || raw <= 0) return 100;
    return Math.min(500, Math.trunc(raw));
  }

  private async processPendingEvents(): Promise<void> {
    if (this.running) return;
    if (!(await this.ensureSchemaReady())) return;
    this.running = true;

    try {
      const rows = await this.domainEventRepo.find({
        where: { aggregateType: 'audit', status: 'pending' },
        order: { occurredAt: 'ASC' },
        take: this.getBatchSize(),
      });

      for (const row of rows) {
        await this.processSingleEvent(row);
      }
    } catch (error) {
      this.logger.error(
        `Error procesando auditoria: ${(error as Error).message}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async ensureSchemaReady(): Promise<boolean> {
    if (this.schemaReady != null) return this.schemaReady;
    try {
      const rows = await this.domainEventRepo.query(
        `SHOW TABLES LIKE 'sys_auditoria_acciones'`,
      );
      this.schemaReady = Array.isArray(rows) && rows.length > 0;
    } catch {
      this.schemaReady = false;
    }
    return this.schemaReady;
  }

  private async processSingleEvent(row: DomainEventEntity): Promise<void> {
    try {
      const payload = row.payload as unknown as AuditEventPayload;
      if (
        !payload?.modulo ||
        !payload?.accion ||
        !payload?.entidad ||
        !payload?.descripcion
      ) {
        row.status = 'failed';
        row.publishedAt = new Date();
        await this.domainEventRepo.save(row);
        return;
      }

      const audit = this.auditRepo.create({
        modulo: payload.modulo,
        accion: payload.accion,
        entidad: payload.entidad,
        entidadId: payload.entidadId ?? row.aggregateId ?? null,
        actorUserId: payload.actorUserId ?? row.createdBy ?? null,
        companyContextId: payload.companyContextId ?? null,
        descripcion: payload.descripcion,
        payloadBefore: payload.payloadBefore ?? null,
        payloadAfter: payload.payloadAfter ?? null,
        metadata: payload.metadata ?? null,
        ip: payload.ip ?? null,
        userAgent: payload.userAgent ?? null,
      });
      await this.auditRepo.save(audit);

      row.status = 'processed';
      row.publishedAt = new Date();
      await this.domainEventRepo.save(row);
    } catch (error) {
      row.status = 'failed';
      row.publishedAt = new Date();
      await this.domainEventRepo.save(row);
      this.logger.warn(
        `Evento de auditoria fallido id=${row.id}: ${(error as Error).message}`,
      );
    }
  }
}
