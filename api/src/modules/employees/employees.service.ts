import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Employee, MonedaSalarioEmpleado } from './entities/employee.entity.js';
import {
  EmployeeAguinaldoProvision,
  EstadoProvisionAguinaldoEmpleado,
} from './entities/employee-aguinaldo-provision.entity.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeeCreationWorkflow } from '../../workflows/employees/employee-creation.workflow.js';
import { DOMAIN_EVENTS } from '../../common/events/event-names.js';
import { AuthService } from '../auth/auth.service.js';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service.js';

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
    private readonly creationWorkflow: EmployeeCreationWorkflow,
    private readonly eventEmitter: EventEmitter2,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
    private readonly sensitiveDataService: EmployeeSensitiveDataService,
  ) {}

  async create(dto: CreateEmployeeDto, creatorId?: number) {
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
        throw new ConflictException(`Ya existe un empleado con cédula '${dto.cedula}'`);
      }
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const emailHash = this.sensitiveDataService.hashEmail(normalizedEmail);
    if (emailHash) {
      const existingEmail = await this.repo.findOne({ where: { emailHash } });
      if (existingEmail) {
        throw new ConflictException(`Ya existe un empleado con email '${dto.email}'`);
      }
    }

    if (dto.crearAccesoKpital && dto.idRolKpital && creatorId != null) {
      const resolved = await this.authService.resolvePermissions(creatorId, dto.idEmpresa, 'kpital');
      if (!resolved.permissions.includes('employee:assign-kpital-role')) {
        throw new ForbiddenException(
          'No tiene permiso para asignar roles de KPITAL. Requiere employee:assign-kpital-role.',
        );
      }
    }

    if (dto.crearAccesoTimewise && dto.idRolTimewise && creatorId != null) {
      const resolved = await this.authService.resolvePermissions(creatorId, dto.idEmpresa, 'timewise');
      if (!resolved.permissions.includes('employee:assign-timewise-role')) {
        throw new ForbiddenException(
          'No tiene permiso para asignar roles de TimeWise. Requiere employee:assign-timewise-role.',
        );
      }
    }

    return this.creationWorkflow.execute(dto, creatorId);
  }

  private assertAcumulados(dto: CreateEmployeeDto): void {
    const acumulados: Array<{ key: 'vacacionesAcumuladas' | 'cesantiaAcumulada'; label: string }> = [
      { key: 'vacacionesAcumuladas', label: 'Vacaciones acumuladas' },
      { key: 'cesantiaAcumulada', label: 'Cesantia acumulada' },
    ];
    for (const item of acumulados) {
      const raw = dto[item.key];
      if (raw == null || raw === '') continue;
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0) {
        throw new BadRequestException(`${item.label} debe ser 0 o mayor.`);
      }
    }
  }

  private assertProvisionesAguinaldo(dto: CreateEmployeeDto): void {
    if (!dto.provisionesAguinaldo?.length) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [index, provision] of dto.provisionesAguinaldo.entries()) {
      if (!provision.idEmpresa || provision.idEmpresa <= 0) {
        throw new BadRequestException(`La empresa es requerida en la fila ${index + 1} de provisiones de aguinaldo.`);
      }
      if (Number(provision.montoProvisionado) < 0) {
        throw new BadRequestException(`El monto provisionado no puede ser negativo en la fila ${index + 1}.`);
      }

      const fechaInicio = new Date(provision.fechaInicioLaboral);
      if (Number.isNaN(fechaInicio.getTime())) {
        throw new BadRequestException(`Fecha inicio laboral inválida en la fila ${index + 1}.`);
      }
      fechaInicio.setHours(0, 0, 0, 0);
      if (fechaInicio > today) {
        throw new BadRequestException(`La fecha inicio laboral no puede ser futura en la fila ${index + 1}.`);
      }

      if (provision.fechaFinLaboral) {
        const fechaFin = new Date(provision.fechaFinLaboral);
        if (Number.isNaN(fechaFin.getTime())) {
          throw new BadRequestException(`Fecha fin laboral inválida en la fila ${index + 1}.`);
        }
        fechaFin.setHours(0, 0, 0, 0);
        if (fechaFin > today) {
          throw new BadRequestException(`La fecha fin laboral no puede ser futura en la fila ${index + 1}.`);
        }
        if (fechaFin < fechaInicio) {
          throw new BadRequestException(`La fecha fin laboral no puede ser menor a la fecha inicio en la fila ${index + 1}.`);
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
    } = {},
  ): Promise<{ data: Employee[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const sort = opts.sort ?? 'apellido1';
    const order = opts.order ?? 'ASC';

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.departamento', 'dep')
      .leftJoinAndSelect('e.puesto', 'puesto')
      .where('1=1');

    let scopeCompanyIds: number[] = [];
    if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      qb.andWhere('e.idEmpresa = :idEmpresa', { idEmpresa });
      scopeCompanyIds = [idEmpresa];
    } else {
      scopeCompanyIds = await this.getUserCompanyIds(userId);
      if (scopeCompanyIds.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
      qb.andWhere('e.idEmpresa IN (:...companyIds)', { companyIds: scopeCompanyIds });
    }

    if (!opts.includeInactive && opts.estado === undefined) {
      qb.andWhere('e.estado = 1');
    } else if (opts.estado !== undefined) {
      qb.andWhere('e.estado = :estado', { estado: opts.estado });
    }

    if (opts.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      qb.andWhere('(e.codigo LIKE :term OR e.emailHash = :emailHash OR e.cedulaHash = :cedulaHash)', {
        term,
        emailHash: this.sensitiveDataService.hashEmail(opts.search.trim()),
        cedulaHash: this.sensitiveDataService.hashCedula(opts.search.trim()),
      });
    }
    if (opts.idDepartamento) {
      qb.andWhere('e.idDepartamento = :idDepartamento', { idDepartamento: opts.idDepartamento });
    }
    if (opts.idPuesto) {
      qb.andWhere('e.idPuesto = :idPuesto', { idPuesto: opts.idPuesto });
    }

    const validSorts = ['codigo', 'estado', 'fechaIngreso', 'id'];
    const sortCol = validSorts.includes(sort) ? `e.${sort}` : 'e.id';
    qb.orderBy(sortCol, order).addOrderBy('e.id', 'ASC');

    const [data, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    const permissionByCompany = await this.resolveSensitivePermissionMap(userId, scopeCompanyIds);
    const normalized = data.map((employee) =>
      this.toReadableEmployee(employee, permissionByCompany.get(employee.idEmpresa) === true),
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
      const canSeeSensitive = await this.hasSensitivePermission(userId, emp.idEmpresa);
      return this.toReadableEmployee(emp, canSeeSensitive);
    }
    return emp;
  }

  async update(id: number, dto: UpdateEmployeeDto, modifierId?: number): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    if (!modifierId) {
      throw new ForbiddenException('Usuario no autenticado para editar empleado.');
    }

    const normalizedEmail = dto.email ? dto.email.toLowerCase().trim() : null;
    const emailHash = normalizedEmail ? this.sensitiveDataService.hashEmail(normalizedEmail) : null;

    if (emailHash) {
      const conflict = await this.repo.findOne({ where: { emailHash } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Ya existe un empleado con email '${dto.email}'`);
      }
    }

    const cedulaHash = dto.cedula ? this.sensitiveDataService.hashCedula(dto.cedula) : null;
    if (cedulaHash) {
      const conflict = await this.repo.findOne({ where: { cedulaHash } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Ya existe un empleado con cédula '${dto.cedula}'`);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(Employee, { where: { id } });
      if (!current) {
        throw new NotFoundException(`Empleado con ID ${id} no encontrado`);
      }

      const oldEmail = this.sensitiveDataService.decrypt(current.email) ?? '';
      if (current.idUsuario) {
        const user = await manager.findOne(User, { where: { id: current.idUsuario } });
        if (user) {
          if (normalizedEmail) user.email = normalizedEmail;
          if (dto.nombre) user.nombre = dto.nombre;
          if (dto.apellido1) user.apellido = dto.apellido1;
          user.modificadoPor = modifierId;
          await manager.save(User, user);
        }
      }

      if (dto.nombre) current.nombre = this.sensitiveDataService.encrypt(dto.nombre) ?? current.nombre;
      if (dto.apellido1) current.apellido1 = this.sensitiveDataService.encrypt(dto.apellido1) ?? current.apellido1;
      if (dto.apellido2 !== undefined) current.apellido2 = this.sensitiveDataService.encrypt(dto.apellido2 ?? null);
      if (dto.cedula) {
        current.cedula = this.sensitiveDataService.encrypt(dto.cedula) ?? current.cedula;
        current.cedulaHash = cedulaHash;
      }
      if (dto.telefono !== undefined) current.telefono = this.sensitiveDataService.encrypt(dto.telefono ?? null);
      if (dto.direccion !== undefined) current.direccion = this.sensitiveDataService.encrypt(dto.direccion ?? null);
      if (normalizedEmail) {
        current.email = this.sensitiveDataService.encrypt(normalizedEmail) ?? current.email;
        current.emailHash = emailHash;
      }
      if (dto.salarioBase !== undefined) {
        current.salarioBase = dto.salarioBase == null
          ? null
          : this.sensitiveDataService.encrypt(String(dto.salarioBase));
      }
      if (dto.numeroCcss !== undefined) current.numeroCcss = this.sensitiveDataService.encrypt(dto.numeroCcss ?? null);
      if (dto.cuentaBanco !== undefined) current.cuentaBanco = this.sensitiveDataService.encrypt(dto.cuentaBanco ?? null);
      if (dto.fechaSalida) current.fechaSalida = new Date(dto.fechaSalida);
      if (dto.motivoSalida !== undefined) current.motivoSalida = this.sensitiveDataService.encrypt(dto.motivoSalida ?? null);

      if (dto.genero !== undefined) current.genero = dto.genero;
      if (dto.estadoCivil !== undefined) current.estadoCivil = dto.estadoCivil;
      if (dto.cantidadHijos !== undefined) current.cantidadHijos = dto.cantidadHijos;
      if (dto.idDepartamento !== undefined) current.idDepartamento = dto.idDepartamento;
      if (dto.idPuesto !== undefined) current.idPuesto = dto.idPuesto;
      if (dto.idSupervisor !== undefined) current.idSupervisor = dto.idSupervisor;
      if (dto.tipoContrato !== undefined) current.tipoContrato = dto.tipoContrato;
      if (dto.jornada !== undefined) current.jornada = dto.jornada;
      if (dto.idPeriodoPago !== undefined) current.idPeriodoPago = dto.idPeriodoPago;
      if (dto.monedaSalario !== undefined) current.monedaSalario = dto.monedaSalario;

      current.modificadoPor = modifierId;
      current.datosEncriptados = 1;
      current.versionEncriptacion = EmployeeSensitiveDataService.getEncryptedVersion();
      current.fechaEncriptacion = new Date();

      const saved = await manager.save(Employee, current);

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
    });

    return this.findOne(id, modifierId);
  }

  async inactivate(id: number, modifierId: number): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    emp.estado = 0;
    emp.modificadoPor = modifierId;
    return this.repo.save(emp);
  }

  async reactivate(id: number, modifierId: number): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    emp.estado = 1;
    emp.modificadoPor = modifierId;
    return this.repo.save(emp);
  }

  async liquidar(id: number, modifierId: number, fechaSalida?: string, motivo?: string): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    emp.estado = 0;
    emp.fechaSalida = fechaSalida ? new Date(fechaSalida) : new Date();
    emp.motivoSalida = this.sensitiveDataService.encrypt(motivo ?? null);
    emp.modificadoPor = modifierId;
    emp.datosEncriptados = 1;
    emp.versionEncriptacion = EmployeeSensitiveDataService.getEncryptedVersion();
    emp.fechaEncriptacion = new Date();
    return this.repo.save(emp);
  }

  private async getUserCompanyIds(userId: number): Promise<number[]> {
    const rows = await this.userCompanyRepo.find({
      where: { idUsuario: userId, estado: 1 },
    });
    return rows.map((row) => row.idEmpresa);
  }

  async findSupervisors(
    userId: number,
    idEmpresa: number,
  ): Promise<{ id: number; nombre: string; apellido1: string }[]> {
    if (!idEmpresa) return [];
    await this.assertUserCompanyAccess(userId, idEmpresa);
    const supervisorRoleCodes = ['SUPERVISOR_TIMEWISE', 'SUPERVISOR_GLOBAL_TIMEWISE'];
    const employees = await this.repo
      .createQueryBuilder('e')
      .innerJoin('sys_usuario_rol', 'ur', 'ur.id_usuario = e.id_usuario AND ur.estado_usuario_rol = 1')
      .innerJoin('sys_roles', 'r', 'r.id_rol = ur.id_rol AND r.codigo_rol IN (:...codes)', {
        codes: supervisorRoleCodes,
      })
      .innerJoin('sys_apps', 'a', "a.id_app = ur.id_app AND a.codigo_app = 'timewise'")
      .where('e.id_usuario IS NOT NULL')
      .andWhere('e.id_empresa = :idEmpresa', { idEmpresa })
      .andWhere('e.estado = 1')
      .andWhere('(ur.id_empresa = :idEmpresa)')
      .select(['e.id', 'e.nombre', 'e.apellido1'])
      .distinct(true)
      .getMany();
    const globalSupervisors = await this.repo
      .createQueryBuilder('e')
      .innerJoin('sys_usuario_rol_global', 'g', 'g.id_usuario = e.id_usuario AND g.estado_usuario_rol_global = 1')
      .innerJoin('sys_roles', 'r', 'r.id_rol = g.id_rol AND r.codigo_rol IN (:...codes)', {
        codes: supervisorRoleCodes,
      })
      .innerJoin('sys_apps', 'a', "a.id_app = g.id_app AND a.codigo_app = 'timewise'")
      .where('e.id_usuario IS NOT NULL')
      .andWhere('e.id_empresa = :idEmpresa', { idEmpresa })
      .andWhere('e.estado = 1')
      .select(['e.id', 'e.nombre', 'e.apellido1'])
      .distinct(true)
      .getMany();
    const seen = new Set(employees.map((e) => e.id));
    for (const g of globalSupervisors) {
      if (!seen.has(g.id)) {
        employees.push(g);
        seen.add(g.id);
      }
    }

    const canSeeSensitive = await this.hasSensitivePermission(userId, idEmpresa);
    return employees.map((e) => {
      const readable = this.toReadableEmployee(e, canSeeSensitive);
      return {
        id: readable.id,
        nombre: readable.nombre,
        apellido1: readable.apellido1,
      };
    });
  }

  private async assertUserCompanyAccess(userId: number, idEmpresa: number): Promise<void> {
    const hasAccess = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa, estado: 1 },
    });
    if (!hasAccess) {
      throw new ForbiddenException(`No tiene acceso a la empresa ${idEmpresa} para esta operación.`);
    }
  }

  private toReadableEmployee(employee: Employee, canSeeSensitive: boolean): Employee {
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
    employee.apellido1 = this.sensitiveDataService.decrypt(employee.apellido1) ?? '';
    employee.apellido2 = this.sensitiveDataService.decrypt(employee.apellido2);
    employee.cedula = this.sensitiveDataService.decrypt(employee.cedula) ?? '';
    employee.email = this.sensitiveDataService.decrypt(employee.email) ?? '';
    employee.telefono = this.sensitiveDataService.decrypt(employee.telefono);
    employee.direccion = this.sensitiveDataService.decrypt(employee.direccion);
    employee.salarioBase = this.sensitiveDataService.decrypt(employee.salarioBase);
    employee.numeroCcss = this.sensitiveDataService.decrypt(employee.numeroCcss);
    employee.cuentaBanco = this.sensitiveDataService.decrypt(employee.cuentaBanco);
    employee.vacacionesAcumuladas = this.sensitiveDataService.decrypt(employee.vacacionesAcumuladas);
    employee.cesantiaAcumulada = this.sensitiveDataService.decrypt(employee.cesantiaAcumulada);
    employee.motivoSalida = this.sensitiveDataService.decrypt(employee.motivoSalida);

    return employee;
  }

  private async hasSensitivePermission(userId: number, companyId: number): Promise<boolean> {
    const resolved = await this.authService.resolvePermissions(userId, companyId, 'kpital');
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
}

