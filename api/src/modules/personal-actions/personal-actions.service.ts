import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PersonalAction,
  PERSONAL_ACTION_APPROVED_STATES,
  PERSONAL_ACTION_PENDING_STATES,
  PersonalActionEstado,
} from './entities/personal-action.entity';
import { CreatePersonalActionDto } from './dto/create-personal-action.dto';
import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { UserCompany } from '../access-control/entities/user-company.entity';
import {
  EstadoCalendarioNomina,
  PayrollCalendar,
} from '../payroll/entities/payroll-calendar.entity';
import { EmployeesService } from '../employees/employees.service';

@Injectable()
export class PersonalActionsService {
  constructor(
    @InjectRepository(PersonalAction)
    private readonly repo: Repository<PersonalAction>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(PayrollCalendar)
    private readonly payrollRepo: Repository<PayrollCalendar>,
    private readonly employeesService: EmployeesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    userId: number,
    idEmpresa?: number,
    estado?: PersonalActionEstado,
  ): Promise<PersonalAction[]> {
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

  async create(
    dto: CreatePersonalActionDto,
    userId?: number,
  ): Promise<PersonalAction> {
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, dto.idEmpresa);
    }

    const action = this.repo.create({
      idEmpresa: dto.idEmpresa,
      idEmpleado: dto.idEmpleado,
      idCalendarioNomina: null,
      tipoAccion: dto.tipoAccion,
      groupId: null,
      origen: 'RRHH',
      descripcion: dto.descripcion ?? null,
      estado: PersonalActionEstado.DRAFT,
      fechaEfecto: dto.fechaEfecto ? new Date(dto.fechaEfecto) : null,
      fechaInicioEfecto: dto.fechaEfecto ? new Date(dto.fechaEfecto) : null,
      fechaFinEfecto: dto.fechaEfecto ? new Date(dto.fechaEfecto) : null,
      monto: dto.monto ?? null,
      moneda: 'CRC',
      creadoPor: userId ?? null,
      modificadoPor: userId ?? null,
    });

    const saved = await this.repo.save(action);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.CREATED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.CREATED,
      occurredAt: new Date(),
      payload: {
        actionId: String(saved.id),
        employeeId: String(saved.idEmpleado),
      },
    });

    return saved;
  }

  async approve(id: number, userId?: number): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (!PERSONAL_ACTION_PENDING_STATES.includes(action.estado)) {
      throw new BadRequestException(
        'Solo se puede aprobar una accion en estado pendiente',
      );
    }

    action.estado = PersonalActionEstado.APPROVED;
    action.aprobadoPor = userId ?? null;
    action.fechaAprobacion = new Date();
    action.modificadoPor = userId ?? null;
    action.versionLock += 1;

    const saved = await this.repo.save(action);
    await this.flagRecalculationForOpenPayrolls(saved);
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

  async associateToCalendar(
    id: number,
    idCalendarioNomina: number,
    userId?: number,
  ): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (!PERSONAL_ACTION_APPROVED_STATES.includes(action.estado)) {
      throw new BadRequestException(
        'Solo se puede asociar una accion aprobada a una planilla',
      );
    }

    action.idCalendarioNomina = idCalendarioNomina;
    action.modificadoPor = userId ?? null;
    action.versionLock += 1;
    return this.repo.save(action);
  }

  async associateToPayroll(
    id: number,
    idCalendarioNomina: number,
    userId?: number,
  ): Promise<PersonalAction> {
    return this.associateToCalendar(id, idCalendarioNomina, userId);
  }

  async reject(
    id: number,
    motivo: string,
    userId?: number,
  ): Promise<PersonalAction> {
    const action = await this.findOne(id, userId);
    if (!PERSONAL_ACTION_PENDING_STATES.includes(action.estado)) {
      throw new BadRequestException(
        'Solo se puede rechazar una accion pendiente',
      );
    }

    action.estado = PersonalActionEstado.REJECTED;
    action.motivoRechazo = motivo ?? null;
    action.aprobadoPor = userId ?? null;
    action.fechaAprobacion = new Date();
    action.modificadoPor = userId ?? null;
    action.versionLock += 1;

    const saved = await this.repo.save(action);
    this.eventEmitter.emit(DOMAIN_EVENTS.PERSONAL_ACTION.REJECTED, {
      eventName: DOMAIN_EVENTS.PERSONAL_ACTION.REJECTED,
      occurredAt: new Date(),
      payload: { actionId: String(saved.id) },
    });

    return saved;
  }

  async findAbsenceMovementsCatalog(
    userId: number,
    idEmpresa: number,
    idTipoAccionPersonal: number,
  ) {
    await this.assertUserCompanyAccess(userId, idEmpresa);

    const rows = await this.repo.query(
      `
      SELECT
        m.id_movimiento_nomina AS id,
        m.id_empresa_movimiento_nomina AS idEmpresa,
        m.nombre_movimiento_nomina AS nombre,
        m.id_tipo_accion_personal_movimiento_nomina AS idTipoAccionPersonal,
        m.descripcion_movimiento_nomina AS descripcion,
        m.formula_ayuda_movimiento_nomina AS formulaAyuda,
        m.es_inactivo_movimiento_nomina AS esInactivo
      FROM nom_movimientos_nomina m
      WHERE m.id_empresa_movimiento_nomina = ?
        AND m.id_tipo_accion_personal_movimiento_nomina = ?
      ORDER BY m.es_inactivo_movimiento_nomina ASC, m.nombre_movimiento_nomina ASC
      `,
      [idEmpresa, idTipoAccionPersonal],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      idEmpresa: Number(row.idEmpresa),
      nombre: String(row.nombre ?? ''),
      idTipoAccionPersonal: Number(row.idTipoAccionPersonal),
      descripcion: row.descripcion ? String(row.descripcion) : null,
      formulaAyuda: row.formulaAyuda ? String(row.formulaAyuda) : null,
      esInactivo: Number(row.esInactivo ?? 0),
    }));
  }

  async findAbsenceEmployeesCatalog(userId: number, idEmpresa: number) {
    await this.assertUserCompanyAccess(userId, idEmpresa);
    const pageSize = 100;
    let page = 1;
    let total = 0;
    const allEmployees: Awaited<
      ReturnType<EmployeesService['findAll']>
    >['data'] = [];

    do {
      const result = await this.employeesService.findAll(userId, idEmpresa, {
        includeInactive: false,
        page,
        pageSize,
        sort: 'apellido1',
        order: 'ASC',
      });
      total = result.total;
      allEmployees.push(...result.data);
      page += 1;
    } while (allEmployees.length < total);

    return allEmployees.map((employee) => ({
      id: employee.id,
      idEmpresa: employee.idEmpresa,
      codigo: employee.codigo,
      nombre: employee.nombre,
      apellido1: employee.apellido1,
      apellido2: employee.apellido2 ?? null,
      idPeriodoPago: employee.idPeriodoPago ?? null,
      monedaSalario: employee.monedaSalario ?? 'CRC',
    }));
  }

  private async getUserCompanyIds(userId: number): Promise<number[]> {
    const rows = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    return rows.map((row) => row.idEmpresa);
  }

  private async assertUserCompanyAccess(
    userId: number,
    companyId: number,
  ): Promise<void> {
    const exists = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa: companyId, estado: 1 },
    });

    if (!exists) {
      throw new ForbiddenException(
        `No tiene acceso a la empresa ${companyId}.`,
      );
    }
  }

  private async flagRecalculationForOpenPayrolls(
    action: PersonalAction,
  ): Promise<void> {
    const start = this.toYmd(action.fechaInicioEfecto ?? action.fechaEfecto);
    if (!start) return;
    const end = this.toYmd(
      action.fechaFinEfecto ?? action.fechaInicioEfecto ?? action.fechaEfecto,
    );
    if (!end) return;
    const approvedAt = action.fechaAprobacion
      ? this.toYmdDateTime(action.fechaAprobacion)
      : null;
    const moneda = (action.moneda || 'CRC').toUpperCase();

    await this.payrollRepo.query(
      `
      UPDATE nom_calendarios_nomina
      SET requires_recalculation_calendario_nomina = 1
      WHERE id_empresa = ?
        AND estado_calendario_nomina = ?
        AND es_inactivo = 0
        AND last_snapshot_at_calendario_nomina IS NOT NULL
        AND moneda_calendario_nomina = ?
        AND fecha_fin_periodo >= ?
        AND fecha_inicio_periodo <= ?
        AND (? IS NULL OR ? <= COALESCE(fecha_corte_calendario_nomina, fecha_fin_periodo))
      `,
      [
        action.idEmpresa,
        EstadoCalendarioNomina.EN_PROCESO,
        moneda,
        start,
        end,
        approvedAt,
        approvedAt,
      ],
    );
  }

  private toYmd(value: Date | null): string | null {
    if (!value || Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  private toYmdDateTime(value: Date): string {
    if (Number.isNaN(value.getTime())) return '';
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
}
