import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { Employee, MonedaSalarioEmpleado } from '../../modules/employees/entities/employee.entity.js';
import { User } from '../../modules/auth/entities/user.entity.js';
import { App } from '../../modules/access-control/entities/app.entity.js';
import { UserApp } from '../../modules/access-control/entities/user-app.entity.js';
import { UserCompany } from '../../modules/access-control/entities/user-company.entity.js';
import { UserRole } from '../../modules/access-control/entities/user-role.entity.js';
import { WorkflowResult } from '../common/workflow.interface.js';
import { DOMAIN_EVENTS } from '../../common/events/event-names.js';
import { CreateEmployeeDto } from '../../modules/employees/dto/create-employee.dto.js';
import { UserStatus } from '../../modules/auth/constants/user-status.enum.js';

export interface EmployeeCreationResult {
  employee: Employee;
  user?: User;
  appsAssigned: string[];
}

/**
 * EmployeeCreationWorkflow — Orquesta la creación de empleado con acceso digital.
 *
 * Usa queryRunner.manager para TODO: user, employee, assignments.
 * Garantiza atomicidad real (ACID).
 * id_usuario se asigna internamente; nunca viene del DTO.
 */
@Injectable()
export class EmployeeCreationWorkflow {
  private readonly logger = new Logger(EmployeeCreationWorkflow.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    dto: CreateEmployeeDto,
    creatorId?: number,
  ): Promise<WorkflowResult<EmployeeCreationResult>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const normalizedEmail = dto.email.toLowerCase().trim();

      let savedUser: User | undefined;
      const appsAssigned: string[] = [];
      const needsAccess = dto.crearAccesoTimewise || dto.crearAccesoKpital;

      // === Paso 1: Crear usuario (si necesita acceso digital) ===
      if (needsAccess) {
        const existingUser = await manager.findOne(User, { where: { email: normalizedEmail } });
        if (existingUser) {
          throw new ConflictException(`Ya existe un usuario con email '${normalizedEmail}'`);
        }

        let passwordHash: string | null = null;
        if (dto.passwordInicial) {
          const salt = await bcrypt.genSalt(12);
          passwordHash = await bcrypt.hash(dto.passwordInicial, salt);
        }

        const user = manager.create(User, {
          email: normalizedEmail,
          passwordHash,
          passwordUpdatedAt: passwordHash ? new Date() : null,
          requiresPasswordReset: passwordHash ? 1 : 0,
          nombre: dto.nombre,
          apellido: dto.apellido1,
          estado: UserStatus.ACTIVO,
          failedAttempts: 0,
          creadoPor: creatorId ?? null,
          modificadoPor: creatorId ?? null,
        });

        savedUser = await manager.save(User, user);

        // === Paso 2: Asignar app(s) ===
        if (dto.crearAccesoTimewise) {
          const twApp = await manager.findOne(App, { where: { codigo: 'timewise', estado: 1 } });
          if (twApp) {
            await manager.save(UserApp, manager.create(UserApp, {
              idUsuario: savedUser.id,
              idApp: twApp.id,
              estado: 1,
            }));
            appsAssigned.push('timewise');
          } else {
            this.logger.warn('App TIMEWISE no encontrada en sys_apps');
          }
        }

        if (dto.crearAccesoKpital) {
          const kpApp = await manager.findOne(App, { where: { codigo: 'kpital', estado: 1 } });
          if (kpApp) {
            await manager.save(UserApp, manager.create(UserApp, {
              idUsuario: savedUser.id,
              idApp: kpApp.id,
              estado: 1,
            }));
            appsAssigned.push('kpital');
          } else {
            this.logger.warn('App KPITAL no encontrada en sys_apps');
          }
        }

        // === Paso 3: Asignar empresa al usuario ===
        await manager.save(UserCompany, manager.create(UserCompany, {
          idUsuario: savedUser.id,
          idEmpresa: dto.idEmpresa,
          estado: 1,
        }));

        // === Paso 3b: Asignar roles por app ===
        const creator = creatorId ?? savedUser.id;
        if (dto.crearAccesoTimewise && dto.idRolTimewise) {
          const twApp = await manager.findOne(App, { where: { codigo: 'timewise', estado: 1 } });
          if (twApp) {
            await manager.save(UserRole, manager.create(UserRole, {
              idUsuario: savedUser.id,
              idRol: dto.idRolTimewise,
              idEmpresa: dto.idEmpresa,
              idApp: twApp.id,
              estado: 1,
              creadoPor: creator,
              modificadoPor: creator,
            }));
          }
        }
        if (dto.crearAccesoKpital && dto.idRolKpital) {
          const kpApp = await manager.findOne(App, { where: { codigo: 'kpital', estado: 1 } });
          if (kpApp) {
            await manager.save(UserRole, manager.create(UserRole, {
              idUsuario: savedUser.id,
              idRol: dto.idRolKpital,
              idEmpresa: dto.idEmpresa,
              idApp: kpApp.id,
              estado: 1,
              creadoPor: creator,
              modificadoPor: creator,
            }));
          }
        }
      }

      // === Paso 4: Crear empleado ===
      const codigoBase = dto.codigo.trim();
      const employee = manager.create(Employee, {
        idUsuario: savedUser?.id ?? null,
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
        email: normalizedEmail,
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

      let savedEmployee = await manager.save(Employee, employee);
      const codigoFinal = `KPid-${savedEmployee.id}-${codigoBase}`;
      await manager.update(Employee, savedEmployee.id, { codigo: codigoFinal });
      savedEmployee = { ...savedEmployee, codigo: codigoFinal };

      // === COMMIT ===
      await queryRunner.commitTransaction();

      this.eventEmitter.emit(DOMAIN_EVENTS.EMPLOYEE.CREATED, {
        eventName: DOMAIN_EVENTS.EMPLOYEE.CREATED,
        occurredAt: new Date(),
        payload: {
          employeeId: String(savedEmployee.id),
          companyId: String(savedEmployee.idEmpresa),
          fullName: `${savedEmployee.nombre} ${savedEmployee.apellido1}`,
          userId: savedUser ? String(savedUser.id) : undefined,
        },
      });

      this.logger.log(
        `Empleado #${savedEmployee.id} creado` +
        (savedUser ? ` con usuario #${savedUser.id} (apps: ${appsAssigned.join(', ')})` : ' sin acceso digital'),
      );

      return {
        success: true,
        data: { employee: savedEmployee, user: savedUser, appsAssigned },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Rollback creación empleado: ${(error as Error).message}`);
      return { success: false, error: (error as Error).message };
    } finally {
      await queryRunner.release();
    }
  }
}
