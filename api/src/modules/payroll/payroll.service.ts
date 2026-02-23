import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PayrollCalendar,
  EstadoCalendarioNomina,
  TipoPlanilla,
  MonedaCalendario,
} from './entities/payroll-calendar.entity.js';
import { CreatePayrollDto } from './dto/create-payroll.dto.js';
import { DOMAIN_EVENTS } from '../../common/events/event-names.js';
import { DomainEventsService } from '../integration/domain-events.service.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';

const ESTADOS_OPERATIVOS = [
  EstadoCalendarioNomina.ABIERTA,
  EstadoCalendarioNomina.EN_PROCESO,
  EstadoCalendarioNomina.VERIFICADA,
];

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollCalendar)
    private readonly repo: Repository<PayrollCalendar>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    private readonly eventEmitter: EventEmitter2,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async findAll(userId: number, idEmpresa?: number, includeInactive = false): Promise<PayrollCalendar[]> {
    const qb = this.repo.createQueryBuilder('p').where('1=1');

    if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      qb.andWhere('p.idEmpresa = :idEmpresa', { idEmpresa });
    } else {
      const companyIds = await this.getUserCompanyIds(userId);
      if (companyIds.length === 0) return [];
      qb.andWhere('p.idEmpresa IN (:...companyIds)', { companyIds });
    }

    if (!includeInactive) {
      qb.andWhere('p.esInactivo = 0');
      qb.andWhere('p.estado != :inactiva', { inactiva: EstadoCalendarioNomina.INACTIVA });
    }
    return qb.orderBy('p.fechaInicioPeriodo', 'DESC').getMany();
  }

  async findOne(id: number, userId?: number): Promise<PayrollCalendar> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Planilla #${id} no encontrada`);
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, p.idEmpresa);
    }
    return p;
  }

  async create(dto: CreatePayrollDto, userId?: number): Promise<PayrollCalendar> {
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    }
    const tipo = (dto.tipoPlanilla as TipoPlanilla) ?? TipoPlanilla.REGULAR;
    const moneda = dto.moneda ?? MonedaCalendario.CRC;
    const inicio = new Date(dto.periodoInicio);
    const fin = new Date(dto.periodoFin);

    const existeOperativa = await this.repo
      .createQueryBuilder('p')
      .where('p.idEmpresa = :idEmpresa', { idEmpresa: dto.idEmpresa })
      .andWhere('p.idPeriodoPago = :idPeriodoPago', { idPeriodoPago: dto.idPeriodoPago })
      .andWhere('p.fechaInicioPeriodo = :inicio', { inicio })
      .andWhere('p.fechaFinPeriodo = :fin', { fin })
      .andWhere('p.moneda = :moneda', { moneda })
      .andWhere('p.tipoPlanilla = :tipo', { tipo })
      .andWhere('p.estado IN (:...estados)', { estados: ESTADOS_OPERATIVOS })
      .andWhere('p.esInactivo = 0')
      .getOne();

    if (existeOperativa) {
      throw new ConflictException('Ya existe una planilla operativa para este periodo, empresa, moneda y tipo');
    }

    const planilla = this.repo.create({
      idEmpresa: dto.idEmpresa,
      idPeriodoPago: dto.idPeriodoPago,
      tipoPlanilla: tipo,
      fechaInicioPeriodo: inicio,
      fechaFinPeriodo: fin,
      fechaInicioPago: new Date(dto.fechaInicioPago),
      fechaFinPago: new Date(dto.fechaFinPago),
      moneda,
      estado: EstadoCalendarioNomina.ABIERTA,
      descripcionEvento: dto.descripcionEvento ?? null,
      etiquetaColor: dto.etiquetaColor ?? null,
      creadoPor: userId ?? null,
      modificadoPor: userId ?? null,
      versionLock: 0,
    });

    const saved = await this.repo.save(planilla);

    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.OPENED, {
      eventName: DOMAIN_EVENTS.PAYROLL.OPENED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id), companyId: String(saved.idEmpresa) },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.OPENED,
      payload: { companyId: saved.idEmpresa, estado: saved.estado },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.opened:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async verify(id: number, userId?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    if (p.estado !== EstadoCalendarioNomina.ABIERTA && p.estado !== EstadoCalendarioNomina.EN_PROCESO) {
      throw new BadRequestException('Solo se puede verificar una planilla en estado Abierta o En Proceso');
    }
    p.estado = EstadoCalendarioNomina.VERIFICADA;
    p.modificadoPor = userId ?? null;
    p.versionLock += 1;

    const saved = await this.repo.save(p);
    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.VERIFIED, {
      eventName: DOMAIN_EVENTS.PAYROLL.VERIFIED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id) },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.VERIFIED,
      payload: { version: saved.versionLock },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.verified:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async apply(id: number, userId?: number, expectedVersion?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    if (p.estado !== EstadoCalendarioNomina.VERIFICADA) {
      throw new BadRequestException('Solo se puede aplicar una planilla en estado Verificada');
    }

    if (expectedVersion !== undefined && p.versionLock !== expectedVersion) {
      throw new ConflictException('La planilla fue modificada por otro proceso. Recargue e intente de nuevo.');
    }

    const nextVersion = p.versionLock + 1;

    const updateResult = await this.repo.createQueryBuilder()
      .update(PayrollCalendar)
      .set({
        estado: EstadoCalendarioNomina.APLICADA,
        fechaAplicacion: new Date(),
        modificadoPor: userId ?? null,
        versionLock: () => 'version_lock_calendario_nomina + 1',
      })
      .where('id_calendario_nomina = :id', { id })
      .andWhere('estado_calendario_nomina = :estado', { estado: EstadoCalendarioNomina.VERIFICADA })
      .andWhere('version_lock_calendario_nomina = :version', { version: p.versionLock })
      .execute();

    if (!updateResult.affected) {
      throw new ConflictException('Conflicto de concurrencia al aplicar planilla.');
    }

    const saved = await this.findOne(id, userId);

    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.APPLIED, {
      eventName: DOMAIN_EVENTS.PAYROLL.APPLIED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id), companyId: String(saved.idEmpresa) },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.APPLIED,
      payload: { companyId: saved.idEmpresa, version: nextVersion },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.applied:${saved.id}:${nextVersion}`,
    });

    return saved;
  }

  async reopen(id: number, motivo: string, userId?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    if (p.estado !== EstadoCalendarioNomina.VERIFICADA) {
      throw new BadRequestException('Solo se puede reabrir una planilla en estado Verificada. Aplicada/Contabilizada son inmutables.');
    }
    p.estado = EstadoCalendarioNomina.ABIERTA;
    p.descripcionEvento = p.descripcionEvento
      ? `${p.descripcionEvento}\n[Reapertura] ${motivo}`
      : `[Reapertura] ${motivo}`;
    p.modificadoPor = userId ?? null;
    p.versionLock += 1;

    const saved = await this.repo.save(p);
    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.REOPENED, {
      eventName: DOMAIN_EVENTS.PAYROLL.REOPENED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id), motivo },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.REOPENED,
      payload: { motivo, version: saved.versionLock },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.reopened:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  async inactivate(id: number, userId?: number): Promise<PayrollCalendar> {
    const p = await this.findOne(id, userId);
    if (p.estado === EstadoCalendarioNomina.APLICADA || p.estado === EstadoCalendarioNomina.CONTABILIZADA) {
      throw new BadRequestException('No se puede inactivar una planilla ya aplicada o contabilizada');
    }
    p.esInactivo = 1;
    p.estado = EstadoCalendarioNomina.INACTIVA;
    p.modificadoPor = userId ?? null;
    p.versionLock += 1;

    const saved = await this.repo.save(p);
    this.eventEmitter.emit(DOMAIN_EVENTS.PAYROLL.DEACTIVATED, {
      eventName: DOMAIN_EVENTS.PAYROLL.DEACTIVATED,
      occurredAt: new Date(),
      payload: { payrollId: String(saved.id) },
    });

    await this.domainEvents.record({
      aggregateType: 'payroll',
      aggregateId: String(saved.id),
      eventName: DOMAIN_EVENTS.PAYROLL.DEACTIVATED,
      payload: { version: saved.versionLock },
      createdBy: userId ?? null,
      idempotencyKey: `payroll.deactivated:${saved.id}:${saved.versionLock}`,
    });

    return saved;
  }

  private async getUserCompanyIds(userId: number): Promise<number[]> {
    const rows = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    return rows.map((row) => row.idEmpresa);
  }

  private async assertUserCompanyAccess(userId: number, companyId: number): Promise<void> {
    const exists = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa: companyId, estado: 1 },
    });
    if (!exists) {
      throw new ForbiddenException(`No tiene acceso a la empresa ${companyId}.`);
    }
  }
}
