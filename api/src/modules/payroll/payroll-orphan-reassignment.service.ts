import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { PayrollCalendar, EstadoCalendarioNomina } from './entities/payroll-calendar.entity';
import { PayrollService } from './payroll.service';

@Injectable()
export class PayrollOrphanReassignmentService {
  private readonly logger = new Logger(PayrollOrphanReassignmentService.name);

  constructor(
    @InjectRepository(PayrollCalendar)
    private readonly payrollRepo: Repository<PayrollCalendar>,
    private readonly payrollService: PayrollService,
  ) {}

  @Cron('0 */5 * * * *', { name: 'payroll-orphan-reassignment' })
  async processPendingOrphans(): Promise<void> {
    const reassociated = await this.processPendingOrphansNow();
    if (reassociated > 0) {
      this.logger.log(
        JSON.stringify({
          job: 'payroll-orphan-reassignment',
          reassociated,
        }),
      );
    }
  }

  async processPendingOrphansNow(): Promise<number> {
    const activePayrolls = await this.payrollRepo.find({
      where: {
        esInactivo: 1,
        estado: In([
          EstadoCalendarioNomina.ABIERTA,
          EstadoCalendarioNomina.EN_PROCESO,
          EstadoCalendarioNomina.VERIFICADA,
        ]),
      },
      order: {
        fechaInicioPeriodo: 'ASC',
        id: 'ASC',
      },
    });

    let totalReassociated = 0;
    for (const payroll of activePayrolls) {
      try {
        const reassociated = await this.payrollService.reassignOrphanActionsForPayroll(
          payroll.id,
          undefined,
          'cron',
        );
        totalReassociated += reassociated;
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            job: 'payroll-orphan-reassignment',
            payrollId: payroll.id,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    return totalReassociated;
  }
}

