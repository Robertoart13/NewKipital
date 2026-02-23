import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Employee, MonedaSalarioEmpleado } from './entities/employee.entity.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { EmployeeCreationWorkflow } from '../../workflows/employees/employee-creation.workflow.js';
import { DOMAIN_EVENTS } from '../../common/events/event-names.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly repo: Repository<Employee>,
    @InjectRepository(UserCompany)
    private readonly userCompanyRepo: Repository<UserCompany>,
    private readonly creationWorkflow: EmployeeCreationWorkflow,
    private readonly eventEmitter: EventEmitter2,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateEmployeeDto, creatorId?: number) {
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

    const existingCedula = await this.repo.findOne({
      where: { cedula: dto.cedula },
    });
    if (existingCedula) {
      throw new ConflictException(
        `Ya existe un empleado con cédula '${dto.cedula}'`,
      );
    }

    const existingEmail = await this.repo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Ya existe un empleado con email '${dto.email}'`,
      );
    }

    // Validar permiso para asignar rol KPITAL si aplica
    if (dto.crearAccesoKpital && dto.idRolKpital && creatorId != null) {
      const resolved = await this.authService.resolvePermissions(creatorId, dto.idEmpresa, 'kpital');
      if (!resolved.permissions.includes('employee:assign-kpital-role')) {
        throw new ForbiddenException(
          'No tiene permiso para asignar roles de KPITAL. Requiere employee:assign-kpital-role.',
        );
      }
    }

    if (dto.crearAccesoTimewise || dto.crearAccesoKpital) {
      return this.creationWorkflow.execute(dto, creatorId);
    }

    const employee = this.repo.create({
      idUsuario: null,
      idEmpresa: dto.idEmpresa,
      codigo: codigoBase, // Se actualizará tras insert a KPid-{id}-{codigo}
      cedula: dto.cedula,
      nombre: dto.nombre,
      apellido1: dto.apellido1,
      apellido2: dto.apellido2 ?? null,
      genero: dto.genero ?? null,
      estadoCivil: dto.estadoCivil ?? null,
      cantidadHijos: dto.cantidadHijos ?? 0,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      email: dto.email.toLowerCase().trim(),
      idDepartamento: dto.idDepartamento ?? null,
      idPuesto: dto.idPuesto ?? null,
      idSupervisor: dto.idSupervisor ?? null,
      fechaIngreso: new Date(dto.fechaIngreso),
      tipoContrato: dto.tipoContrato ?? null,
      jornada: dto.jornada ?? null,
      idPeriodoPago: dto.idPeriodoPago ?? null,
      salarioBase: dto.salarioBase ?? null,
      monedaSalario: dto.monedaSalario ?? MonedaSalarioEmpleado.CRC,
      numeroCcss: dto.numeroCcss ?? null,
      cuentaBanco: dto.cuentaBanco ?? null,
      estado: 1,
      creadoPor: creatorId ?? null,
      modificadoPor: creatorId ?? null,
    });

    let saved = await this.repo.save(employee);
    const codigoFinal = `KPid-${saved.id}-${codigoBase}`;
    await this.repo.update(saved.id, { codigo: codigoFinal });
    saved = { ...saved, codigo: codigoFinal };

    this.eventEmitter.emit(DOMAIN_EVENTS.EMPLOYEE.CREATED, {
      eventName: DOMAIN_EVENTS.EMPLOYEE.CREATED,
      occurredAt: new Date(),
      payload: {
        employeeId: String(saved.id),
        companyId: String(saved.idEmpresa),
        fullName: `${saved.nombre} ${saved.apellido1}`,
      },
    });

    return { success: true, data: { employee: saved, appsAssigned: [] } };
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

    if (idEmpresa != null) {
      await this.assertUserCompanyAccess(userId, idEmpresa);
      qb.andWhere('e.idEmpresa = :idEmpresa', { idEmpresa });
    } else {
      const companyIds = await this.getUserCompanyIds(userId);
      if (companyIds.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
      qb.andWhere('e.idEmpresa IN (:...companyIds)', { companyIds });
    }

    if (!opts.includeInactive && opts.estado === undefined) {
      qb.andWhere('e.estado = 1');
    } else if (opts.estado !== undefined) {
      qb.andWhere('e.estado = :estado', { estado: opts.estado });
    }

    if (opts.search?.trim()) {
      const term = `%${opts.search.trim()}%`;
      qb.andWhere(
        '(e.nombre LIKE :term OR e.apellido1 LIKE :term OR e.apellido2 LIKE :term OR e.codigo LIKE :term OR e.cedula LIKE :term OR e.email LIKE :term)',
        { term },
      );
    }
    if (opts.idDepartamento) {
      qb.andWhere('e.idDepartamento = :idDepartamento', { idDepartamento: opts.idDepartamento });
    }
    if (opts.idPuesto) {
      qb.andWhere('e.idPuesto = :idPuesto', { idPuesto: opts.idPuesto });
    }

    const validSorts = ['nombre', 'apellido1', 'codigo', 'cedula', 'email', 'estado'];
    const sortCol = validSorts.includes(sort) ? `e.${sort}` : 'e.apellido1';
    qb.orderBy(sortCol, order).addOrderBy('e.nombre', 'ASC');

    const [data, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, total, page, pageSize };
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
    }
    return emp;
  }

  async update(id: number, dto: UpdateEmployeeDto, modifierId?: number): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);

    const oldEmail = emp.email;
    if (dto.email) {
      dto.email = dto.email.toLowerCase().trim();
      if (dto.email !== oldEmail) {
        const conflict = await this.repo.findOne({ where: { email: dto.email } });
        if (conflict && conflict.id !== id) {
          throw new ConflictException(`Ya existe un empleado con email '${dto.email}'`);
        }
      }
    }

    if (dto.cedula && dto.cedula !== emp.cedula) {
      const conflict = await this.repo.findOne({ where: { cedula: dto.cedula } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Ya existe un empleado con cédula '${dto.cedula}'`);
      }
    }

    Object.assign(emp, dto, { modificadoPor: modifierId ?? null });

    if (dto.fechaSalida) {
      emp.fechaSalida = new Date(dto.fechaSalida);
    }

    const saved = await this.repo.save(emp);

    if (dto.email && dto.email !== oldEmail && emp.idUsuario) {
      this.eventEmitter.emit(DOMAIN_EVENTS.EMPLOYEE.EMAIL_CHANGED, {
        eventName: DOMAIN_EVENTS.EMPLOYEE.EMAIL_CHANGED,
        occurredAt: new Date(),
        payload: {
          employeeId: String(saved.id),
          userId: String(saved.idUsuario),
          oldEmail,
          newEmail: dto.email,
          changedBy: modifierId ?? 0,
        },
      });
    }

    return saved;
  }

  async inactivate(id: number, modifierId: number): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    emp.estado = 0;
    emp.modificadoPor = modifierId;
    return this.repo.save(emp);
  }

  async liquidar(id: number, modifierId: number, fechaSalida?: string, motivo?: string): Promise<Employee> {
    const emp = await this.findOne(id, modifierId);
    emp.estado = 0;
    emp.fechaSalida = fechaSalida ? new Date(fechaSalida) : new Date();
    emp.motivoSalida = motivo ?? null;
    emp.modificadoPor = modifierId;
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
      .innerJoin('sys_apps', 'a', 'a.id_app = ur.id_app AND a.codigo_app = \'timewise\'')
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
      .innerJoin('sys_apps', 'a', 'a.id_app = g.id_app AND a.codigo_app = \'timewise\'')
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
    return employees.map((e) => ({ id: e.id, nombre: e.nombre, apellido1: e.apellido1 }));
  }

  private async assertUserCompanyAccess(userId: number, idEmpresa: number): Promise<void> {
    const hasAccess = await this.userCompanyRepo.findOne({
      where: { idUsuario: userId, idEmpresa, estado: 1 },
    });
    if (!hasAccess) {
      throw new ForbiddenException(
        `No tiene acceso a la empresa ${idEmpresa} para esta operacion.`,
      );
    }
  }
}
