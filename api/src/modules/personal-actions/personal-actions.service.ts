import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PersonalAction, PersonalActionEstado } from './entities/personal-action.entity';
import { CreatePersonalActionDto } from './dto/create-personal-action.dto';
import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { UserCompany } from '../access-control/entities/user-company.entity';

@Injectable()
export class PersonalActionsService {
  constructor(
    @InjectRepository(PersonalAction)
    private readonly repo: Repository<PersonalAction>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(userId: number, idEmpresa?: number, estado?: PersonalActionEstado): Promise<PersonalAction[]> {
    const qb = this.repo.createQueryBuilder('a').where('1=1');

    if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      qb.andWhere('a.idEmpresa = :idEmpresa', { idEmpresa });
    } else {
      const companyIds = await this.getUserCompanyIds(userId);
      if (companyIds.length === 0) return [];
      qb.andWhere('a.idEmpresa IN (:...companyIds)', { companyIds });
    }

    if (estado !== undefined) {
      qb.andWhere('a.estado = :estado', { estado });
    }

    return qb.orderBy('a.fechaCreacion', 'DESC').getMany();
  }

  async findOne(id: number, userId?: number): Promise<PersonalAction> {
    const action = await this.repo.findOne({ where: { id } });
    if (!action) throw new NotFoundException(`Accion #${id} no encontrada`);

    if (userId != null) {
      await this.assertUserCompanyAccess(userId, action.idEmpresa);
    }

    return action;
  }

  async create(dto: CreatePersonalActionDto, userId?: number): Promise<PersonalAction> {
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    }

    const action = this.repo.create({
      idEmpresa: dto.idEmpresa,
      idEmpleado: dto.idEmpleado,
      idCalendarioNomina: null,
      tipoAccion: dto.tipoAccion,
      descripcion: dto.descripcion ?? null,
      estado: PersonalActionEstado.PENDIENTE,
      fechaEfecto: dto.fechaEfecto ? new Date(dto.fechaEfecto) : null,
      monto: dto.monto ?? null,
      creadoPor: userId ?? null,
      modificadoPor: userId ?? null,
    });

    const saved = await this.repo.save(action);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
      occurredAt: new Date(),
      payload: { actionId: String(saved.id), employeeId: String(saved.idEmpleado) },
    });

    return saved;
  }

  async approve(id: number, userId?: number): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (action.estado !== PersonalActionEstado.PENDIENTE) {
      throw new BadRequestException('Solo se puede aprobar una accion pendiente');
    }

    action.estado = PersonalActionEstado.APROBADA;
    action.aprobadoPor = userId ?? null;
    action.fechaAprobacion = new Date();
    action.modificadoPor = userId ?? null;

    const saved = await this.repo.save(action);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.APPROVED,
      occurredAt: new Date(),
      payload: {
        actionId: String(saved.id),
        employeeId: String(saved.idEmpleado),
        companyId: String(saved.idEmpresa),
      },
    });

    return saved;
  }

  async associateToCalendar(id: number, idCalendarioNomina: number, userId?: number): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (action.estado !== PersonalActionEstado.APROBADA) {
      throw new BadRequestException('Solo se puede asociar una accion aprobada a una planilla');
    }

    action.idCalendarioNomina = idCalendarioNomina;
    action.modificadoPor = userId ?? null;
    return this.repo.save(action);
  }

  async associateToPayroll(id: number, idCalendarioNomina: number, userId?: number): Promise<PersonalAction> {
    return this.associateToCalendar(id, idCalendarioNomina, userId);
  }

  async reject(id: number, motivo: string, userId?: number): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (action.estado !== PersonalActionEstado.PENDIENTE) {
      throw new BadRequestException('Solo se puede rechazar una accion pendiente');
    }

    action.estado = PersonalActionEstado.RECHAZADA;
    action.motivoRechazo = motivo ?? null;
    action.aprobadoPor = userId ?? null;
    action.fechaAprobacion = new Date();
    action.modificadoPor = userId ?? null;

    const saved = await this.repo.save(action);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.REJECTED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.REJECTED,
      occurredAt: new Date(),
      payload: { actionId: String(saved.id) },
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
