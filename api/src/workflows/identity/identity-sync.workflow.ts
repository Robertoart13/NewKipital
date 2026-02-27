import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/auth/entities/user.entity';
import { DOMAIN_EVENTS } from '../../common/events/event-names';

interface EmployeeEmailChangedPayload {
  employeeId: string;
  userId: string;
  oldEmail: string;
  newEmail: string;
  changedBy: number;
}

/**
 * IdentitySyncWorkflow — Sincroniza cambios de identidad del empleado con sys_usuarios.
 *
 * Propósito: Cuando cambia el email de un empleado que tiene usuario vinculado,
 *            actualizar sys_usuarios para mantener coherencia de login.
 * Evento que lo dispara: employee.email_changed
 * Servicios: Accede directamente a User repository (auditoría + transacción interna)
 * Eventos que emite: identity.login_updated
 * Posibles fallos: email duplicado en sys_usuarios → no actualiza, log de error
 */
@Injectable()
export class IdentitySyncWorkflow {
  private readonly logger = new Logger(IdentitySyncWorkflow.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(DOMAIN_EVENTS.EMPLOYEE.EMAIL_CHANGED)
  async handleEmailChange(event: {
    payload: EmployeeEmailChangedPayload;
  }): Promise<void> {
    const { userId, oldEmail, newEmail, changedBy, employeeId } = event.payload;

    if (!userId) {
      this.logger.debug(
        `Empleado #${employeeId} sin usuario vinculado — no se sincroniza`,
      );
      return;
    }

    const normalizedNew = newEmail.toLowerCase().trim();

    const user = await this.userRepo.findOne({ where: { id: Number(userId) } });
    if (!user) {
      this.logger.error(
        `Usuario #${userId} no encontrado para sincronizar email`,
      );
      return;
    }

    if (user.email === normalizedNew) {
      this.logger.debug(`Email ya sincronizado para usuario #${userId}`);
      return;
    }

    const conflict = await this.userRepo.findOne({
      where: { email: normalizedNew },
    });
    if (conflict) {
      this.logger.error(
        `No se puede sincronizar: email '${normalizedNew}' ya existe en sys_usuarios (usuario #${conflict.id})`,
      );
      return;
    }

    const previousEmail = user.email;
    user.email = normalizedNew;
    user.modificadoPor = changedBy;
    await this.userRepo.save(user);

    this.eventEmitter.emit(DOMAIN_EVENTS.IDENTITY.LOGIN_UPDATED, {
      eventName: DOMAIN_EVENTS.IDENTITY.LOGIN_UPDATED,
      occurredAt: new Date(),
      payload: {
        userId,
        previousEmail,
        newEmail: normalizedNew,
        updatedBy: changedBy,
        trigger: 'employee.email_changed',
      },
    });

    this.logger.log(
      `Identidad sincronizada: usuario #${userId} email ${previousEmail} → ${normalizedNew} (por empleado #${employeeId})`,
    );
  }
}
