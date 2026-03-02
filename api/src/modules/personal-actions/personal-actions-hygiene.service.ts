import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PersonalAction,
  PersonalActionEstado,
  PERSONAL_ACTION_APPROVED_STATES,
} from './entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from './personal-action-auto-invalidation.service';

@Injectable()
export class PersonalActionsHygieneService {
  private readonly logger = new Logger(PersonalActionsHygieneService.name);

  constructor(
    @InjectRepository(PersonalAction)
    private readonly personalActionRepo: Repository<PersonalAction>,
    private readonly autoInvalidationService: PersonalActionAutoInvalidationService,
  ) {}

  @Cron('0 0 0 * * *', { name: 'personal-actions-expire-approved' })
  async expireApprovedActionsPastEffectiveEnd(): Promise<void> {
    const affected = await this.expireApprovedActionsPastEffectiveEndNow();
    const invalidation = await this.invalidateApprovedActionsByEmployeeContextNow();
    this.logger.log(
      JSON.stringify({
        job: 'personal-actions-expire-approved',
        affected,
        rule: 'APPROVED sin consumo con fin de efecto vencido -> EXPIRED',
        invalidated: invalidation,
      }),
    );
  }

  async expireApprovedActionsPastEffectiveEndNow(): Promise<number> {
    const result = await this.personalActionRepo
      .createQueryBuilder()
      .update(PersonalAction)
      .set({
        estado: PersonalActionEstado.EXPIRED,
        expiredAt: new Date(),
        expiredReason: 'Expirada automaticamente por job nocturno',
        modificadoPor: null,
        versionLock: () => 'version_lock_accion + 1',
      })
      .where('estado_accion IN (:...approvedStates)', {
        approvedStates: PERSONAL_ACTION_APPROVED_STATES,
      })
      .andWhere('id_calendario_nomina IS NULL')
      .andWhere(
        'COALESCE(fecha_fin_efecto_accion, fecha_inicio_efecto_accion, fecha_efecto_accion) IS NOT NULL',
      )
      .andWhere(
        'COALESCE(fecha_fin_efecto_accion, fecha_inicio_efecto_accion, fecha_efecto_accion) < CURDATE()',
      )
      .execute();

    return Number(result.affected ?? 0);
  }

  async invalidateApprovedActionsByEmployeeContextNow(): Promise<{
    termination: number;
    companyMismatch: number;
    currencyMismatch: number;
    total: number;
  }> {
    const summary = await this.autoInvalidationService.run({
      source: 'hygiene_job',
    });

    return {
      termination: summary.byReason.TERMINATION_EFFECTIVE,
      companyMismatch: summary.byReason.COMPANY_MISMATCH,
      currencyMismatch: summary.byReason.CURRENCY_MISMATCH,
      total: summary.totalInvalidated,
    };
  }
}
