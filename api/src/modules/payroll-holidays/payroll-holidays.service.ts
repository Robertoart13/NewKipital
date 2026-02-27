import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollHoliday } from './entities/payroll-holiday.entity';
import { CreatePayrollHolidayDto } from './dto/create-payroll-holiday.dto';
import { UpdatePayrollHolidayDto } from './dto/update-payroll-holiday.dto';
import { AuditOutboxService } from '../integration/audit-outbox.service';

@Injectable()
export class PayrollHolidaysService {
  constructor(
    @InjectRepository(PayrollHoliday)
    private readonly repo: Repository<PayrollHoliday>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  async findAll(): Promise<PayrollHoliday[]> {
    return this.repo.createQueryBuilder('h')
      .orderBy('h.fechaInicio', 'ASC')
      .addOrderBy('h.nombre', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<PayrollHoliday> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Feriado con ID ${id} no encontrado.`);
    }
    return found;
  }

  async create(dto: CreatePayrollHolidayDto, actorUserId: number): Promise<PayrollHoliday> {
    this.assertDateRange(dto.fechaInicio, dto.fechaFin);
    const entity = this.repo.create({
      nombre: dto.nombre.trim(),
      tipo: dto.tipo,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      descripcion: dto.descripcion?.trim() || '--',
    });
    const saved = await this.repo.save(entity);
    this.auditOutbox.publish({
      modulo: 'payroll-holiday',
      accion: 'create',
      entidad: 'payroll-holiday',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Feriado creado: ${saved.nombre}`,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async update(id: number, dto: UpdatePayrollHolidayDto, actorUserId: number): Promise<PayrollHoliday> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    const nextInicio = dto.fechaInicio ?? found.fechaInicio;
    const nextFin = dto.fechaFin ?? found.fechaFin;
    this.assertDateRange(nextInicio, nextFin);

    if (dto.nombre !== undefined) found.nombre = dto.nombre.trim();
    if (dto.tipo !== undefined) found.tipo = dto.tipo;
    if (dto.fechaInicio !== undefined) found.fechaInicio = dto.fechaInicio;
    if (dto.fechaFin !== undefined) found.fechaFin = dto.fechaFin;
    if (dto.descripcion !== undefined) found.descripcion = dto.descripcion.trim() || '--';

    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'payroll-holiday',
      accion: 'update',
      entidad: 'payroll-holiday',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Feriado actualizado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async remove(id: number, actorUserId: number): Promise<{ success: true }> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    await this.repo.delete({ id: found.id });
    this.auditOutbox.publish({
      modulo: 'payroll-holiday',
      accion: 'delete',
      entidad: 'payroll-holiday',
      entidadId: found.id,
      actorUserId,
      descripcion: `Feriado eliminado: ${found.nombre}`,
      payloadBefore,
    });
    return { success: true };
  }

  private assertDateRange(fechaInicio: string, fechaFin: string): void {
    const start = new Date(`${fechaInicio}T00:00:00`);
    const end = new Date(`${fechaFin}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Las fechas del feriado son invalidas.');
    }
    if (end < start) {
      throw new BadRequestException('La fecha fin del feriado no puede ser menor que la fecha inicio.');
    }
  }

  private buildAuditPayload(entity: PayrollHoliday): Record<string, unknown> {
    return {
      nombre: entity.nombre,
      tipo: entity.tipo,
      fechaInicio: entity.fechaInicio,
      fechaFin: entity.fechaFin,
      descripcion: entity.descripcion,
    };
  }
}

