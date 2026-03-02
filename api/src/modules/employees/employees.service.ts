import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Employee, MonedaSalarioEmpleado } from './entities/employee.entity';
import {
  EmployeeAguinaldoProvision,
  EstadoProvisionAguinaldoEmpleado,
} from './entities/employee-aguinaldo-provision.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { User } from '../auth/entities/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeCreationWorkflow } from '../../workflows/employees/employee-creation.workflow';
import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { AuthService } from '../auth/auth.service';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';
import { EmployeeVacationService } from './services/employee-vacation.service';
import {
  PERSONAL_ACTION_APPROVED_STATES,
  PERSONAL_ACTION_PENDING_STATES,
  PersonalAction,
} from '../personal-actions/entities/personal-action.entity';
import {
  EstadoCalendarioNomina,
  PayrollCalendar,
} from '../payroll/entities/payroll-calendar.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';

/** Estados de planilla que bloquean inactivar empleado (DOC-34 UC-01). */
const PLANILLA_ESTADOS_BLOQUEANTES = [
  EstadoCalendarioNomina.ABIERTA,
  EstadoCalendarioNomina.EN_PROCESO,
  EstadoCalendarioNomina.VERIFICADA,
];

/** Estados de acciÃ³n de personal que bloquean inactivar empleado si no estÃ¡n asociadas a planilla (DOC-34 UC-02). */
const ACCION_ESTADOS_BLOQUEANTES = [
  ...PERSONAL_ACTION_PENDING_STATES,
  ...PERSONAL_ACTION_APPROVED_STATES,
];

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(EmployeeAguinaldoProvision)
    private readonly aguinaldoProvisionRepo: Repository<EmployeeAguinaldoProvision>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PayrollCalendar)
    private readonly payrollCalendarRepo: Repository<PayrollCalendar>,
    @InjectRepository(PersonalAction)
    private readonly personalActionRepo: Repository<PersonalAction>,
    private readonly creationWorkflow: EmployeeCreationWorkflow,
    private readonly eventEmitter: EventEmitter2,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
    private readonly sensitiveDataService: EmployeeSensitiveDataService,
    private readonly vacationService: EmployeeVacationService,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    nombre: 'Nombre',
    apellido1: 'Primer apellido',
    apellido2: 'Segundo apellido',
    cedula: 'Cedula',
    email: 'Email',
    telefono: 'Telefono',
    direccion: 'Direccion',
    idDepartamento: 'Departamento',
    idPuesto: 'Puesto',
    idSupervisor: 'Supervisor',
    fechaIngreso: 'Fecha ingreso',
    fechaSalida: 'Fecha salida',
    motivoSalida: 'Motivo salida',
    tipoContrato: 'Tipo contrato',
    jornada: 'Jornada',
    idPeriodoPago: 'Periodo pago',
    salarioBase: 'Salario base',
    monedaSalario: 'Moneda salario',
    numeroCcss: 'Numero CCSS',
    cuentaBanco: 'Cuenta bancaria',
    vacacionesAcumuladas: 'Vacaciones acumuladas',
    cesantiaAcumulada: 'Cesantia acumulada',
    estado: 'Estado',
  };

  async create(dto: CreateEmployeeDto, creatorId?: number) {
    this.assertJoinDate(dto.fechaIngreso);
    this.assertAcumulados(dto);
    this.assertProvisionesAguinaldo(dto);

    if (creatorId != null) {
      const hasAccess = await this.userCompanyRepo.findOne({
        where: {
          idUsuario: creatorId,
          idEmpresa: dto.idEmpresa,
          estado: 1,
        },
      });
      if (!hasAccess) {
        throw new ForbiddenException(
          'No tiene acceso a la empresa seleccionada. Solo puede crear empleados en empresas asignadas.',
        );
      }
    }

    const codigoBase = dto.codigo.trim();
    const existingCode = await this.repo
      .createQueryBuilder('e')
      .where('e.idEmpresa = :idEmpresa', { idEmpresa: dto.idEmpresa })
      .andWhere('(e.codigo = :base OR e.codigo LIKE :pattern)', {
        base: codigoBase,
        pattern: `KPid-%-${codigoBase}`,
      })
      .getOne();
    if (existingCode) {
      throw new ConflictException(
        `Ya existe un empleado con código '${codigoBase}' en la empresa #${dto.idEmpresa}`,
      );
    }

    const cedulaHash = this.sensitiveDataService.hashCedula(dto.cedula);
    if (cedulaHash) {
      const existingCedula = await this.repo.findOne({ where: { cedulaHash } });
      if (existingCedula) {
        throw new ConflictException(
          `Ya existe un empleado con cédula '${dto.cedula}'`,
        );
      }
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const emailHash = this.sensitiveDataService.hashEmail(normalizedEmail);
    if (emailHash) {
      const existingEmail = await this.repo.findOne({ where: { emailHash } });
      if (existingEmail) {
        throw new ConflictException(
          `Ya existe un empleado con email '${dto.email}'`,
        );
      }
    }

    if (dto.crearAccesoKpital && dto.idRolKpital && creatorId != null) {
      const resolved = await this.authService.resolvePermissions(
        creatorId,
        dto.idEmpresa,
        'kpital',
      );
      if (!resolved.permissions.includes('employee:assign-kpital-role')) {
        throw new ForbiddenException(
          'No tiene permiso para asignar roles de KPITAL. Requiere employee:assign-kpital-role.',
        );
      }
    }

    if (dto.crearAccesoTimewise && dto.idRolTimewise && creatorId != null) {
      const [resolvedTimewise, resolvedKpital] = await Promise.all([
        this.authService.resolvePermissions(
          creatorId,
          dto.idEmpresa,
          'timewise',
        ),
        this.authService.resolvePermissions(creatorId, dto.idEmpresa, 'kpital'),
      ]);
      const hasAssign =
        resolvedTimewise.permissions.includes(
          'employee:assign-timewise-role',
        ) ||
        resolvedKpital.permissions.includes('employee:assign-timewise-role');
      if (!hasAssign) {
        throw new ForbiddenException(
          'No tiene permiso para asignar roles de TimeWise. Requiere employee:assign-timewise-role.',
        );
      }
    }

    return this.creationWorkflow.execute(dto, creatorId);
  }

  private assertAcumulados(dto: CreateEmployeeDto): void {
    const acumulados: Array<{
      key: 'vacacionesAcumuladas' | 'cesantiaAcumulada';
      label: string;
    }> = [
      { key: 'vacacionesAcumuladas', label: 'Vacaciones acumuladas' },
      { key: 'cesantiaAcumulada', label: 'Cesantia acumulada' },
    ];
    for (const item of acumulados) {
      const raw = dto[item.key];
      if (raw == null || raw === '') continue;
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0 || !Number.isInteger(value)) {
        throw new BadRequestException(
          `${item.label} debe ser un entero de 0 o mayor.`,
        );
      }
    }
  }

  private assertJoinDate(fechaIngresoRaw: string): void {
    const fechaIngreso = this.parseDateOnlyForDb(fechaIngresoRaw);
    if (Number.isNaN(fechaIngreso.getTime())) {
      throw new BadRequestException('Fecha de ingreso invÃ¡lida.');
    }
    const day = fechaIngreso.getDate();
    if (day < 1 || day > 28) {
      throw new BadRequestException(
        'Fecha de ingreso debe estar entre el día 1 y 28 del mes.',
      );
    }
  }

  private assertProvisionesAguinaldo(dto: CreateEmployeeDto): void {
    if (!dto.provisionesAguinaldo?.length) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [index, provision] of dto.provisionesAguinaldo.entries()) {
      if (!provision.idEmpresa || provision.idEmpresa <= 0) {
        throw new BadRequestException(
          `La empresa es requerida en la fila ${index + 1} de provisiones de aguinaldo.`,
        );
      }
      if (Number(provision.montoProvisionado) < 0) {
        throw new BadRequestException(
          `El monto provisionado no puede ser negativo en la fila ${index + 1}.`,
        );
      }

      const fechaInicio = new Date(provision.fechaInicioLaboral);
      if (Number.isNaN(fechaInicio.getTime())) {
        throw new BadRequestException(
          `Fecha inicio laboral invÃ¡lida en la fila ${index + 1}.`,
        );
      }
      fechaInicio.setHours(0, 0, 0, 0);
      if (fechaInicio > today) {
        throw new BadRequestException(
          `La fecha inicio laboral no puede ser futura en la fila ${index + 1}.`,
        );
      }

      if (provision.fechaFinLaboral) {
        const fechaFin = new Date(provision.fechaFinLaboral);
        if (Number.isNaN(fechaFin.getTime())) {
          throw new BadRequestException(
            `Fecha fin laboral invÃ¡lida en la fila ${index + 1}.`,
          );
        }
        fechaFin.setHours(0, 0, 0, 0);
        if (fechaFin > today) {
          throw new BadRequestException(
            `La fecha fin laboral no puede ser futura en la fila ${index + 1}.`,
          );
        }
        if (fechaFin < fechaInicio) {
          throw new BadRequestException(
            `La fecha fin laboral no puede ser menor a la fecha inicio en la fila ${index + 1}.`,
          );
        }
      }
    }
  }

  async findAll(
    userId: number,
    idEmpresa?: number,
    opts: {
      includeInactive?: boolean;
      page?: number;
      pageSize?: number;
      search?: string;
      idDepartamento?: number;
      idPuesto?: number;
      estado?: number;
      sort?: string;
      order?: 'ASC' | 'DESC';
      companyIds?: number[];
    } = {},
  ): Promise<{
    data: Employee[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const sort = opts.sort ?? 'apellido1';
    const order = opts.order ?? 'ASC';

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.departamento', 'dep')
      .leftJoinAndSelect('e.puesto', 'puesto')
      .where('1=1');

    const requestedCompanyIds = opts.companyIds?.length
      ? Array.from(
          new Set(
            opts.companyIds.filter((id) => Number.isInteger(id) && id > 0),
          ),
        )
      : [];
    let scopeCompanyIds: number[] = [];
    if (requestedCompanyIds.length > 0) {
      for (const companyId of requestedCompanyIds) {
        await this.assertUserCompanyAccess(userId, companyId);
      }
      scopeCompanyIds = requestedCompanyIds;
    } else if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      scopeCompanyIds = [idEmpresa];
    } else {
      scopeCompanyIds = await this.getUserCompanyIds(userId);
    }
    if (scopeCompanyIds.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }
    qb.andWhere('e.idEmpresa IN (:...companyIds)', {
      companyIds: scopeCompanyIds,
    });

    if (!opts.includeInactive && opts.estado === undefined) {
      qb.andWhere('e.estado = 1');
    } else if (opts.estado !== undefined) {
      qb.andWhere('e.estado = :estado', { estado: opts.estado });
    }

    if (opts.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      qb.andWhere(
        '(e.codigo LIKE :term OR e.emailHash = :emailHash OR e.cedulaHash = :cedulaHash)',
        {
          term,
          emailHash: this.sensitiveDataService.hashEmail(opts.search.trim()),
          cedulaHash: this.sensitiveDataService.hashCedula(opts.search.trim()),
        },
      );
    }
    if (opts.idDepartamento) {
      qb.andWhere('e.idDepartamento = :idDepartamento', {
        idDepartamento: opts.idDepartamento,
      });
    }
    if (opts.idPuesto) {
      qb.andWhere('e.idPuesto = :idPuesto', { idPuesto: opts.idPuesto });
    }

    const validSorts = ['codigo', 'estado', 'fechaIngreso', 'id'];
    const sortCol = validSorts.includes(sort) ? `e.${sort}` : 'e.id';
    qb.orderBy(sortCol, order).addOrderBy('e.id', 'ASC');

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const permissionByCompany = await this.resolveSensitivePermissionMap(
      userId,
      scopeCompanyIds,
    );
    const normalized = data.map((employee) =>
      this.toReadableEmployee(
        employee,
        permissionByCompany.get(employee.idEmpresa) === true,
      ),
    );

    return { data: normalized, total, page, pageSize };
  }

  async findOne(id: number, userId?: number): Promise<Employee> {
    const emp = await this.repo.findOne({
      where: { id },
      relations: ['departamento', 'puesto', 'periodoPago', 'supervisor'],
    });
    if (!emp) {
      throw new NotFoundException(`Empleado con ID ${id} no encontrado`);
    }
    if (userId != null) {
      await this.assertUserCompanyAccess(userId, emp.idEmpresa);
      const canSeeSensitive = await this.hasSensitivePermission(
        userId,
        emp.idEmpresa,
      );
      return this.toReadableEmployee(emp, canSeeSensitive);
    }
    return emp;
  }

  async update(
    id: number,
    dto: UpdateEmployeeDto,
    modifierId?: number,
  ): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    if (!modifierId) {
      throw new ForbiddenException(
        'Usuario no autenticado para editar empleado.',
      );
    }

    const normalizedEmail = dto.email ? dto.email.toLowerCase().trim() : null;
    const emailHash = normalizedEmail
      ? this.sensitiveDataService.hashEmail(normalizedEmail)
      : null;

    if (emailHash) {
      const conflict = await this.repo.findOne({ where: { emailHash } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Ya existe un empleado con email '${dto.email}'`,
        );
      }
    }

    const cedulaHash = dto.cedula
      ? this.sensitiveDataService.hashCedula(dto.cedula)
      : null;
    if (cedulaHash) {
      const conflict = await this.repo.findOne({ where: { cedulaHash } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Ya existe un empleado con cédula '${dto.cedula}'`,
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Employee, { where: { id } });
      if (!current) {
        throw new NotFoundException(`Empleado con ID ${id} no encontrado`);
      }
      const previousTerminationKey = this.toDateKey(current.fechaSalida);
      const previousCurrency = current.monedaSalario;
      const previousCompanyId = current.idEmpresa;
      const payloadBefore = this.buildAuditPayloadFromEncrypted(current);

      const oldEmail = this.sensitiveDataService.decrypt(current.email) ?? '';
      if (current.idUsuario) {
        const user = await manager.findOne(User, {
          where: { id: current.idUsuario },
        });
        if (user) {
          if (normalizedEmail) user.email = normalizedEmail;
          if (dto.nombre) user.nombre = dto.nombre;
          if (dto.apellido1) user.apellido = dto.apellido1;
          user.modificadoPor = modifierId;
          await manager.save(User, user);
        }
      }

      if (dto.nombre)
        current.nombre =
          this.sensitiveDataService.encrypt(dto.nombre) ?? current.nombre;
      if (dto.apellido1)
        current.apellido1 =
          this.sensitiveDataService.encrypt(dto.apellido1) ?? current.apellido1;
      if (dto.apellido2 !== undefined)
        current.apellido2 = this.sensitiveDataService.encrypt(
          dto.apellido2 ?? null,
        );
      if (dto.cedula) {
        current.cedula =
          this.sensitiveDataService.encrypt(dto.cedula) ?? current.cedula;
        current.cedulaHash = cedulaHash;
      }
      if (dto.telefono !== undefined)
        current.telefono = this.sensitiveDataService.encrypt(
          dto.telefono ?? null,
        );
      if (dto.direccion !== undefined)
        current.direccion = this.sensitiveDataService.encrypt(
          dto.direccion ?? null,
        );
      if (normalizedEmail) {
        current.email =
          this.sensitiveDataService.encrypt(normalizedEmail) ?? current.email;
        current.emailHash = emailHash;
      }
      if (dto.salarioBase !== undefined) {
        current.salarioBase =
          dto.salarioBase == null
            ? null
            : this.sensitiveDataService.encrypt(String(dto.salarioBase));
      }
      if (dto.numeroCcss !== undefined)
        current.numeroCcss = this.sensitiveDataService.encrypt(
          dto.numeroCcss ?? null,
        );
      if (dto.cuentaBanco !== undefined)
        current.cuentaBanco = this.sensitiveDataService.encrypt(
          dto.cuentaBanco ?? null,
        );
      if (dto.fechaSalida)
        current.fechaSalida = this.parseDateOnlyForDb(dto.fechaSalida);
      if (dto.motivoSalida !== undefined)
        current.motivoSalida = this.sensitiveDataService.encrypt(
          dto.motivoSalida ?? null,
        );
      if (dto.fechaIngreso !== undefined) {
        const isMaster = await this.isMasterUser(modifierId, current.idEmpresa);
        if (!isMaster) {
          throw new ForbiddenException(
            'Solo el usuario Master puede modificar la fecha de ingreso del empleado.',
          );
        }
        this.assertJoinDate(dto.fechaIngreso);
        current.fechaIngreso = this.parseDateOnlyForDb(dto.fechaIngreso);
      }

      if (dto.genero !== undefined) current.genero = dto.genero;
      if (dto.estadoCivil !== undefined) current.estadoCivil = dto.estadoCivil;
      if (dto.cantidadHijos !== undefined)
        current.cantidadHijos = dto.cantidadHijos;
      if (dto.idDepartamento !== undefined)
        current.idDepartamento = dto.idDepartamento;
      if (dto.idPuesto !== undefined) current.idPuesto = dto.idPuesto;
      if (dto.idSupervisor !== undefined)
        current.idSupervisor = dto.idSupervisor;
      if (dto.tipoContrato !== undefined)
        current.tipoContrato = dto.tipoContrato;
      if (dto.jornada !== undefined) current.jornada = dto.jornada;
      if (dto.idPeriodoPago !== undefined)
        current.idPeriodoPago = dto.idPeriodoPago;
      if (dto.monedaSalario !== undefined)
        current.monedaSalario = dto.monedaSalario;
      if (dto.vacacionesAcumuladas !== undefined) {
        throw new BadRequestException(
          'Vacaciones acumuladas iniciales no es editable. Use ajustes con permiso especial.',
        );
      }
      if (dto.cesantiaAcumulada !== undefined) {
        current.cesantiaAcumulada =
          dto.cesantiaAcumulada == null || dto.cesantiaAcumulada === ''
            ? null
            : this.sensitiveDataService.encrypt(dto.cesantiaAcumulada);
      }

      current.modificadoPor = modifierId;
      current.datosEncriptados = 1;
      current.versionEncriptacion =
        EmployeeSensitiveDataService.getEncryptedVersion();
      current.fechaEncriptacion = new Date();

      const saved = await manager.save(Employee, current);
      const payloadAfter = this.buildAuditPayloadFromEncrypted(saved);
      const nextTerminationKey = this.toDateKey(saved.fechaSalida);
      const changedTermination = previousTerminationKey !== nextTerminationKey;
      const changedCurrency = previousCurrency !== saved.monedaSalario;
      const changedCompany = previousCompanyId !== saved.idEmpresa;

      this.auditOutbox.publish({
        modulo: 'employees',
        accion: 'update',
        entidad: 'employee',
        entidadId: saved.id,
        actorUserId: modifierId,
        descripcion: `Empleado actualizado: ${payloadAfter.nombre ?? saved.id}`,
        payloadBefore,
        payloadAfter,
      });

      if (dto.fechaIngreso !== undefined) {
        await this.vacationService.syncAccountAnchorOnJoinDateChange(
          manager,
          saved,
          modifierId,
        );
      }

      if (normalizedEmail && normalizedEmail !== oldEmail && saved.idUsuario) {
        this.eventEmitter.emit(DOMAIN_EVENTS.EMPLOYEE.EMAIL_CHANGED, {
          eventName: DOMAIN_EVENTS.EMPLOYEE.EMAIL_CHANGED,
          occurredAt: new Date(),
          payload: {
            employeeId: String(saved.id),
            userId: String(saved.idUsuario),
            oldEmail,
            newEmail: normalizedEmail,
            changedBy: modifierId,
          },
        });
      }

      if (changedTermination || changedCompany || changedCurrency) {
        this.eventEmitter.emit(DOMAIN_EVENTS.EMPLOYEE.CONTEXT_UPDATED, {
          eventName: DOMAIN_EVENTS.EMPLOYEE.CONTEXT_UPDATED,
          occurredAt: new Date(),
          payload: {
            employeeId: saved.id,
            changedTermination,
            changedCompany,
            changedCurrency,
          },
        });
      }
    });

    return this.findOne(id, modifierId);
  }

  async inactivate(id: number, modifierId: number): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    await this.assertCanInactivateEmployee(emp);
    const payloadBefore = this.buildAuditPayloadFromEncrypted(emp);
    emp.estado = 0;
    emp.modificadoPor = modifierId;
    const saved = await this.repo.save(emp);
    this.auditOutbox.publish({
      modulo: 'employees',
      accion: 'inactivate',
      entidad: 'employee',
      entidadId: saved.id,
      actorUserId: modifierId,
      descripcion: `Empleado inactivado: ${saved.id}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayloadFromEncrypted(saved),
    });
    return saved;
  }

  /**
   * DOC-34 UC-01, UC-02: No permitir inactivar si hay planillas activas en la empresa del empleado
   * o acciones de personal pendientes/aprobadas sin asociar a planilla.
   */
  private async assertCanInactivateEmployee(emp: Employee): Promise<void> {
    const planillasActivas = await this.payrollCalendarRepo.find({
      where: {
        idEmpresa: emp.idEmpresa,
        estado: In(PLANILLA_ESTADOS_BLOQUEANTES),
        esInactivo: 0,
      },
      select: {
        id: true,
        fechaInicioPeriodo: true,
        fechaFinPeriodo: true,
        estado: true,
        tipoPlanilla: true,
      },
    });
    if (planillasActivas.length > 0) {
      throw new ConflictException({
        message:
          'El empleado tiene planillas activas en su empresa. Debe cerrarlas o aplicarlas primero.',
        code: 'PLANILLAS_ACTIVAS',
        planillas: planillasActivas.map((p) => ({
          id: p.id,
          fechaInicioPeriodo: p.fechaInicioPeriodo,
          fechaFinPeriodo: p.fechaFinPeriodo,
          estado: p.estado,
          tipoPlanilla: p.tipoPlanilla,
        })),
      });
    }
    const accionesBloqueantes = await this.personalActionRepo.find({
      where: {
        idEmpleado: emp.id,
        estado: In(ACCION_ESTADOS_BLOQUEANTES),
        idCalendarioNomina: IsNull(),
      },
      select: { id: true, tipoAccion: true, estado: true, fechaEfecto: true },
    });
    if (accionesBloqueantes.length > 0) {
      throw new ConflictException({
        message:
          'El empleado tiene acciones de personal pendientes o aprobadas sin asociar a planilla. Debe completarlas o cancelarlas primero.',
        code: 'ACCIONES_PENDIENTES',
        acciones: accionesBloqueantes.map((a) => ({
          id: a.id,
          tipoAccion: a.tipoAccion,
          estado: a.estado,
          fechaEfecto: a.fechaEfecto,
        })),
      });
    }
  }

  async reactivate(id: number, modifierId: number): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    const payloadBefore = this.buildAuditPayloadFromEncrypted(emp);
    emp.estado = 1;
    emp.modificadoPor = modifierId;
    const saved = await this.repo.save(emp);
    this.auditOutbox.publish({
      modulo: 'employees',
      accion: 'reactivate',
      entidad: 'employee',
      entidadId: saved.id,
      actorUserId: modifierId,
      descripcion: `Empleado reactivado: ${saved.id}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayloadFromEncrypted(saved),
    });
    return saved;
  }

  async liquidar(
    id: number,
    modifierId: number,
    fechaSalida?: string,
    motivo?: string,
  ): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    const payloadBefore = this.buildAuditPayloadFromEncrypted(emp);
    emp.estado = 0;
    emp.fechaSalida = fechaSalida
      ? this.parseDateOnlyForDb(fechaSalida)
      : new Date();
    emp.motivoSalida = this.sensitiveDataService.encrypt(motivo ?? null);
    emp.modificadoPor = modifierId;
    emp.datosEncriptados = 1;
    emp.versionEncriptacion =
      EmployeeSensitiveDataService.getEncryptedVersion();
    emp.fechaEncriptacion = new Date();
    const saved = await this.repo.save(emp);
    this.auditOutbox.publish({
      modulo: 'employees',
      accion: 'liquidate',
      entidad: 'employee',
      entidadId: saved.id,
      actorUserId: modifierId,
      descripcion: `Empleado liquidado: ${saved.id}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayloadFromEncrypted(saved),
    });
    this.eventEmitter.emit(DOMAIN_EVENTS.EMPLOYEE.CONTEXT_UPDATED, {
      eventName: DOMAIN_EVENTS.EMPLOYEE.CONTEXT_UPDATED,
      occurredAt: new Date(),
      payload: {
        employeeId: saved.id,
        changedTermination: true,
        changedCompany: false,
        changedCurrency: false,
      },
    });
    return saved;
  }

  async getAuditTrail(id: number, actorUserId: number, limit = 100) {
    const emp = await this.findOne(id, actorUserId);
    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 500);
    const idAsText = String(emp.id);
    const rows = await this.repo.query(
      `
      SELECT
        a.id_auditoria_accion AS id,
        a.modulo_auditoria AS modulo,
        a.accion_auditoria AS accion,
        a.entidad_auditoria AS entidad,
        a.id_entidad_auditoria AS entidadId,
        a.id_usuario_actor_auditoria AS actorUserId,
        a.descripcion_auditoria AS descripcion,
        a.fecha_creacion_auditoria AS fechaCreacion,
        a.metadata_auditoria AS metadata,
        a.payload_before_auditoria AS payloadBefore,
        a.payload_after_auditoria AS payloadAfter,
        CONCAT_WS(' ', actor.nombre_usuario, actor.apellido_usuario) AS actorNombre,
        actor.email_usuario AS actorEmail
      FROM sys_auditoria_acciones a
      LEFT JOIN sys_usuarios actor
        ON actor.id_usuario = a.id_usuario_actor_auditoria
      WHERE a.entidad_auditoria = 'employee'
        AND a.id_entidad_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [idAsText, safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => {
      const payloadBefore =
        (row.payloadBefore as Record<string, unknown> | null) ?? null;
      const payloadAfter =
        (row.payloadAfter as Record<string, unknown> | null) ?? null;
      return {
        id: String(row.id ?? ''),
        modulo: String(row.modulo ?? ''),
        accion: String(row.accion ?? ''),
        entidad: String(row.entidad ?? ''),
        entidadId: row.entidadId == null ? null : String(row.entidadId),
        actorUserId: row.actorUserId == null ? null : Number(row.actorUserId),
        actorNombre: row.actorNombre ? String(row.actorNombre) : null,
        actorEmail: row.actorEmail ? String(row.actorEmail) : null,
        descripcion: String(row.descripcion ?? ''),
        fechaCreacion: row.fechaCreacion
          ? new Date(String(row.fechaCreacion)).toISOString()
          : null,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        cambios: this.buildAuditChanges(payloadBefore, payloadAfter),
      };
    });
  }

  private async getUserCompanyIds(userId: number): Promise<number[]> {
    const rows = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    return rows.map((row) => row.idEmpresa);
  }

  /**
   * Lista empleados elegibles como supervisores (rol Supervisor, Supervisor Global o Master en TimeWise).
   * No filtra por empresa: devuelve todos los de las empresas a las que el usuario tiene acceso,
   * para permitir que un supervisor de otra subsidiaria tome el rol temporalmente (mismo dueÃ±o).
   */
  async findSupervisors(
    userId: number,
  ): Promise<{ id: number; nombre: string; apellido1: string }[]> {
    const companyIds = await this.getUserCompanyIds(userId);
    if (!companyIds.length) return [];

    const supervisorRoleCodes = [
      'SUPERVISOR_TIMEWISE',
      'SUPERVISOR_GLOBAL_TIMEWISE',
      'MASTER',
    ];

    const employees = await this.repo
      .createQueryBuilder('e')
      .innerJoin(
        'sys_usuario_rol',
        'ur',
        'ur.id_usuario = e.id_usuario AND ur.estado_usuario_rol = 1',
      )
      .innerJoin(
        'sys_roles',
        'r',
        'r.id_rol = ur.id_rol AND r.codigo_rol IN (:...codes)',
        {
          codes: supervisorRoleCodes,
        },
      )
      .innerJoin(
        'sys_apps',
        'a',
        "a.id_app = ur.id_app AND a.codigo_app = 'timewise'",
      )
      .where('e.id_usuario IS NOT NULL')
      .andWhere('e.id_empresa IN (:...companyIds)', { companyIds })
      .andWhere('e.estado = 1')
      .andWhere('ur.id_empresa IN (:...companyIds)', { companyIds })
      .select(['e.id', 'e.nombre', 'e.apellido1', 'e.idEmpresa'])
      .distinct(true)
      .getMany();

    const globalSupervisors = await this.repo
      .createQueryBuilder('e')
      .innerJoin(
        'sys_usuario_rol_global',
        'g',
        'g.id_usuario = e.id_usuario AND g.estado_usuario_rol_global = 1',
      )
      .innerJoin(
        'sys_roles',
        'r',
        'r.id_rol = g.id_rol AND r.codigo_rol IN (:...codes)',
        {
          codes: supervisorRoleCodes,
        },
      )
      .leftJoin(
        'sys_apps',
        'a',
        "a.id_app = g.id_app AND a.codigo_app = 'timewise'",
      )
      .where('e.id_usuario IS NOT NULL')
      .andWhere('e.id_empresa IN (:...companyIds)', { companyIds })
      .andWhere('e.estado = 1')
      .andWhere("(a.id_app IS NOT NULL OR r.codigo_rol = 'MASTER')")
      .select(['e.id', 'e.nombre', 'e.apellido1', 'e.idEmpresa'])
      .distinct(true)
      .getMany();

    const seen = new Set(employees.map((e) => e.id));
    for (const g of globalSupervisors) {
      if (!seen.has(g.id)) {
        employees.push(g);
        seen.add(g.id);
      }
    }

    const sensitiveMap = await this.resolveSensitivePermissionMap(
      userId,
      companyIds,
    );
    return employees.map((e) => {
      const canSeeSensitive = sensitiveMap.get(e.idEmpresa) ?? false;
      const readable = this.toReadableEmployee(e, canSeeSensitive);
      return {
        id: readable.id,
        nombre: readable.nombre,
        apellido1: readable.apellido1,
      };
    });
  }

  private async assertUserCompanyAccess(
    userId: number,
    idEmpresa: number,
  ): Promise<void> {
    const hasAccess = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa, estado: 1 },
    });
    if (!hasAccess) {
      throw new ForbiddenException(
        `No tiene acceso a la empresa ${idEmpresa} para esta operaciÃ³n.`,
      );
    }
  }

  private toReadableEmployee(
    employee: Employee,
    canSeeSensitive: boolean,
  ): Employee {
    if (!canSeeSensitive) {
      employee.nombre = null as unknown as string;
      employee.apellido1 = null as unknown as string;
      employee.apellido2 = null;
      employee.cedula = null as unknown as string;
      employee.email = null as unknown as string;
      employee.telefono = null;
      employee.direccion = null;
      employee.salarioBase = null;
      employee.numeroCcss = null;
      employee.cuentaBanco = null;
      employee.vacacionesAcumuladas = null;
      employee.cesantiaAcumulada = null;
      employee.motivoSalida = null;
      return employee;
    }

    employee.nombre = this.sensitiveDataService.decrypt(employee.nombre) ?? '';
    employee.apellido1 =
      this.sensitiveDataService.decrypt(employee.apellido1) ?? '';
    employee.apellido2 = this.sensitiveDataService.decrypt(employee.apellido2);
    employee.cedula = this.sensitiveDataService.decrypt(employee.cedula) ?? '';
    employee.email = this.sensitiveDataService.decrypt(employee.email) ?? '';
    employee.telefono = this.sensitiveDataService.decrypt(employee.telefono);
    employee.direccion = this.sensitiveDataService.decrypt(employee.direccion);
    employee.salarioBase = this.sensitiveDataService.decrypt(
      employee.salarioBase,
    );
    employee.numeroCcss = this.sensitiveDataService.decrypt(
      employee.numeroCcss,
    );
    employee.cuentaBanco = this.sensitiveDataService.decrypt(
      employee.cuentaBanco,
    );
    employee.vacacionesAcumuladas = this.sensitiveDataService.decrypt(
      employee.vacacionesAcumuladas,
    );
    employee.cesantiaAcumulada = this.sensitiveDataService.decrypt(
      employee.cesantiaAcumulada,
    );
    employee.motivoSalida = this.sensitiveDataService.decrypt(
      employee.motivoSalida,
    );

    return employee;
  }

  private buildAuditPayloadFromEncrypted(
    employee: Employee,
  ): Record<string, unknown> {
    const readable = this.toReadableEmployee({ ...employee }, true);
    return {
      nombre: readable.nombre ?? null,
      apellido1: readable.apellido1 ?? null,
      apellido2: readable.apellido2 ?? null,
      cedula: readable.cedula ?? null,
      email: readable.email ?? null,
      telefono: readable.telefono ?? null,
      direccion: readable.direccion ?? null,
      idDepartamento: readable.idDepartamento ?? null,
      idPuesto: readable.idPuesto ?? null,
      idSupervisor: readable.idSupervisor ?? null,
      fechaIngreso: readable.fechaIngreso
        ? new Date(readable.fechaIngreso as unknown as string)
            .toISOString()
            .slice(0, 10)
        : null,
      fechaSalida: readable.fechaSalida
        ? new Date(readable.fechaSalida as unknown as string)
            .toISOString()
            .slice(0, 10)
        : null,
      motivoSalida: readable.motivoSalida ?? null,
      tipoContrato: readable.tipoContrato ?? null,
      jornada: readable.jornada ?? null,
      idPeriodoPago: readable.idPeriodoPago ?? null,
      salarioBase: readable.salarioBase ?? null,
      monedaSalario: readable.monedaSalario ?? null,
      numeroCcss: readable.numeroCcss ?? null,
      cuentaBanco: readable.cuentaBanco ?? null,
      vacacionesAcumuladas: readable.vacacionesAcumuladas ?? null,
      cesantiaAcumulada: readable.cesantiaAcumulada ?? null,
      estado: readable.estado === 1 ? 'Activo' : 'Inactivo',
    };
  }

  private normalizeAuditValue(value: unknown): string {
    if (value === null || value === undefined) return '(vacio)';
    if (typeof value === 'boolean') return value ? 'Si' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    const text = String(value).trim();
    return text.length > 0 ? text : '(vacio)';
  }

  private buildAuditChanges(
    payloadBefore: Record<string, unknown> | null,
    payloadAfter: Record<string, unknown> | null,
  ): Array<{ campo: string; antes: string; despues: string }> {
    if (!payloadBefore || !payloadAfter) return [];
    const keys = new Set<string>([
      ...Object.keys(payloadBefore),
      ...Object.keys(payloadAfter),
    ]);
    const changes: Array<{ campo: string; antes: string; despues: string }> =
      [];
    for (const key of keys) {
      if (!(key in this.auditFieldLabels)) continue;
      const beforeValue = this.normalizeAuditValue(payloadBefore[key]);
      const afterValue = this.normalizeAuditValue(payloadAfter[key]);
      if (beforeValue === afterValue) continue;
      changes.push({
        campo: this.auditFieldLabels[key] ?? key,
        antes: beforeValue,
        despues: afterValue,
      });
    }
    return changes;
  }

  private async hasSensitivePermission(
    userId: number,
    companyId: number,
  ): Promise<boolean> {
    const resolved = await this.authService.resolvePermissions(
      userId,
      companyId,
      'kpital',
    );
    return resolved.permissions.includes('employee:view-sensitive');
  }

  private async resolveSensitivePermissionMap(
    userId: number,
    companyIds: number[],
  ): Promise<Map<number, boolean>> {
    const map = new Map<number, boolean>();
    for (const companyId of companyIds) {
      map.set(companyId, await this.hasSensitivePermission(userId, companyId));
    }
    return map;
  }

  private async isMasterUser(
    userId: number,
    companyId: number,
  ): Promise<boolean> {
    const [timewise, kpital] = await Promise.all([
      this.authService.resolvePermissions(userId, companyId, 'timewise'),
      this.authService.resolvePermissions(userId, companyId, 'kpital'),
    ]);
    return timewise.roles.includes('MASTER') || kpital.roles.includes('MASTER');
  }
  /**
   * Convierte YYYY-MM-DD a Date estable para columnas DATE sin corrimiento por zona horaria.
   */
  private parseDateOnlyForDb(dateValue: string): Date {
    const raw = dateValue.trim();
    const onlyDate = raw.includes('T') ? raw.split('T')[0] : raw;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(onlyDate);
    if (!match) {
      throw new BadRequestException('Fecha invalida.');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const normalized = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (
      Number.isNaN(normalized.getTime()) ||
      normalized.getFullYear() !== year ||
      normalized.getMonth() !== month - 1 ||
      normalized.getDate() !== day
    ) {
      throw new BadRequestException('Fecha invalida.');
    }

    return normalized;
  }

  private toDateKey(dateValue: Date | null): string | null {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }
}
