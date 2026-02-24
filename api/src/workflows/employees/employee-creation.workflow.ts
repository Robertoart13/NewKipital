import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { Employee, MonedaSalarioEmpleado } from '../../modules/employees/entities/employee.entity';
import {
  EmployeeAguinaldoProvision,
  EstadoProvisionAguinaldoEmpleado,
} from '../../modules/employees/entities/employee-aguinaldo-provision.entity';
import { User } from '../../modules/auth/entities/user.entity';
import { App } from '../../modules/access-control/entities/app.entity';
import { UserApp } from '../../modules/access-control/entities/user-app.entity';
import { UserCompany } from '../../modules/access-control/entities/user-company.entity';
import { UserRole } from '../../modules/access-control/entities/user-role.entity';
import { WorkflowResult } from '../common/workflow.interface';
import { DOMAIN_EVENTS } from '../../common/events/event-names';
import { CreateEmployeeDto } from '../../modules/employees/dto/create-employee.dto';
import { UserStatus } from '../../modules/auth/constants/user-status.enum';
import { EmployeeSensitiveDataService } from '../../common/services/employee-sensitive-data.service';

export interface EmployeeCreationResult {
  employee: Employee;
  user?: User;
  appsAssigned: string[];
}

@Injectable()
export class EmployeeCreationWorkflow {
  private readonly logger = new Logger(EmployeeCreationWorkflow.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly sensitiveDataService: EmployeeSensitiveDataService,
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
      const emailHash = this.sensitiveDataService.hashEmail(normalizedEmail);
      const cedulaHash = this.sensitiveDataService.hashCedula(dto.cedula);

      let savedUser: User | undefined;
      const appsAssigned: string[] = [];
      const needsAccess = dto.crearAccesoTimewise || dto.crearAccesoKpital;

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

        if (dto.crearAccesoTimewise) {
          const twApp = await manager.findOne(App, { where: { codigo: 'timewise', estado: 1 } });
          if (twApp) {
            await manager.save(
              UserApp,
              manager.create(UserApp, {
                idUsuario: savedUser.id,
                idApp: twApp.id,
                estado: 1,
              }),
            );
            appsAssigned.push('timewise');
          } else {
            this.logger.warn('App TIMEWISE no encontrada en sys_apps');
          }
        }

        if (dto.crearAccesoKpital) {
          const kpApp = await manager.findOne(App, { where: { codigo: 'kpital', estado: 1 } });
          if (kpApp) {
            await manager.save(
              UserApp,
              manager.create(UserApp, {
                idUsuario: savedUser.id,
                idApp: kpApp.id,
                estado: 1,
              }),
            );
            appsAssigned.push('kpital');
          } else {
            this.logger.warn('App KPITAL no encontrada en sys_apps');
          }
        }

        await manager.save(
          UserCompany,
          manager.create(UserCompany, {
            idUsuario: savedUser.id,
            idEmpresa: dto.idEmpresa,
            estado: 1,
          }),
        );

        const creator = creatorId ?? savedUser.id;
        if (dto.crearAccesoTimewise && dto.idRolTimewise) {
          const twApp = await manager.findOne(App, { where: { codigo: 'timewise', estado: 1 } });
          if (twApp) {
            await manager.save(
              UserRole,
              manager.create(UserRole, {
                idUsuario: savedUser.id,
                idRol: dto.idRolTimewise,
                idEmpresa: dto.idEmpresa,
                idApp: twApp.id,
                estado: 1,
                creadoPor: creator,
                modificadoPor: creator,
              }),
            );
          }
        }
        if (dto.crearAccesoKpital && dto.idRolKpital) {
          const kpApp = await manager.findOne(App, { where: { codigo: 'kpital', estado: 1 } });
          if (kpApp) {
            await manager.save(
              UserRole,
              manager.create(UserRole, {
                idUsuario: savedUser.id,
                idRol: dto.idRolKpital,
                idEmpresa: dto.idEmpresa,
                idApp: kpApp.id,
                estado: 1,
                creadoPor: creator,
                modificadoPor: creator,
              }),
            );
          }
        }
      }

      const codigoBase = dto.codigo.trim();
      const employee = manager.create(Employee, {
        idUsuario: savedUser?.id ?? null,
        idEmpresa: dto.idEmpresa,
        codigo: codigoBase,
        cedula: this.sensitiveDataService.encrypt(dto.cedula) ?? '',
        cedulaHash,
        nombre: this.sensitiveDataService.encrypt(dto.nombre) ?? '',
        apellido1: this.sensitiveDataService.encrypt(dto.apellido1) ?? '',
        apellido2: this.sensitiveDataService.encrypt(dto.apellido2 ?? null),
        genero: dto.genero ?? null,
        estadoCivil: dto.estadoCivil ?? null,
        cantidadHijos: dto.cantidadHijos ?? 0,
        telefono: this.sensitiveDataService.encrypt(dto.telefono ?? null),
        direccion: this.sensitiveDataService.encrypt(dto.direccion ?? null),
        email: this.sensitiveDataService.encrypt(normalizedEmail) ?? '',
        emailHash,
        idDepartamento: dto.idDepartamento ?? null,
        idPuesto: dto.idPuesto ?? null,
        idSupervisor: dto.idSupervisor ?? null,
        fechaIngreso: new Date(dto.fechaIngreso),
        tipoContrato: dto.tipoContrato ?? null,
        jornada: dto.jornada ?? null,
        idPeriodoPago: dto.idPeriodoPago ?? null,
        salarioBase:
          dto.salarioBase == null ? null : this.sensitiveDataService.encrypt(String(dto.salarioBase)),
        monedaSalario: dto.monedaSalario ?? MonedaSalarioEmpleado.CRC,
        numeroCcss: this.sensitiveDataService.encrypt(dto.numeroCcss ?? null),
        cuentaBanco: this.sensitiveDataService.encrypt(dto.cuentaBanco ?? null),
        vacacionesAcumuladas: this.sensitiveDataService.encrypt(dto.vacacionesAcumuladas ?? null),
        cesantiaAcumulada: this.sensitiveDataService.encrypt(dto.cesantiaAcumulada ?? null),
        estado: 1,
        creadoPor: creatorId ?? null,
        modificadoPor: creatorId ?? null,
        datosEncriptados: 1,
        versionEncriptacion: EmployeeSensitiveDataService.getEncryptedVersion(),
        fechaEncriptacion: new Date(),
      });

      let savedEmployee = await manager.save(Employee, employee);
      const codigoFinal = `KPid-${savedEmployee.id}-${codigoBase}`;
      await manager.update(Employee, savedEmployee.id, { codigo: codigoFinal });
      savedEmployee = { ...savedEmployee, codigo: codigoFinal };

      if (dto.provisionesAguinaldo?.length) {
        const provisions = dto.provisionesAguinaldo.map((item) =>
          manager.create(EmployeeAguinaldoProvision, {
            idEmpleado: savedEmployee.id,
            idEmpresa: item.idEmpresa,
            montoProvisionado:
              this.sensitiveDataService.encrypt(String(item.montoProvisionado)) ?? '0',
            fechaInicioLaboral: new Date(item.fechaInicioLaboral),
            fechaFinLaboral: item.fechaFinLaboral ? new Date(item.fechaFinLaboral) : null,
            registroEmpresa: this.sensitiveDataService.encrypt(item.registroEmpresa?.trim() || null),
            estado: item.estado ?? EstadoProvisionAguinaldoEmpleado.PENDIENTE,
            creadoPor: creatorId ?? null,
            modificadoPor: creatorId ?? null,
            datosEncriptados: 1,
            versionEncriptacion: EmployeeSensitiveDataService.getEncryptedVersion(),
            fechaEncriptacion: new Date(),
          }),
        );
        await manager.save(EmployeeAguinaldoProvision, provisions);
      }

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
          (savedUser
            ? ` con usuario #${savedUser.id} (apps: ${appsAssigned.join(', ')})`
            : ' sin acceso digital'),
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

