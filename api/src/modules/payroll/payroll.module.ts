import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserCompany } from '../access-control/entities/user-company.entity';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeAguinaldoProvision } from '../employees/entities/employee-aguinaldo-provision.entity';
import { Employee } from '../employees/entities/employee.entity';
import { IntegrationModule } from '../integration/integration.module';
import { PersonalAction } from '../personal-actions/entities/personal-action.entity';
import { PersonalActionsModule } from '../personal-actions/personal-actions.module';

import { EmployeeTransfer } from './entities/employee-transfer.entity';
import { PayPeriod } from './entities/pay-period.entity';
import { PayrollCalendar } from './entities/payroll-calendar.entity';
import { PayrollReactivationItem } from './entities/payroll-reactivation-item.entity';
import { PayrollEmployeeSnapshot } from './entities/payroll-employee-snapshot.entity';
import { PayrollEmployeeVerification } from './entities/payroll-employee-verification.entity';
import { PayrollInputSnapshot } from './entities/payroll-input-snapshot.entity';
import { PayrollPlanillaSnapshotJson } from './entities/payroll-planilla-snapshot.entity';
import { PayrollResult } from './entities/payroll-result.entity';
import { PayrollSocialCharge } from './entities/payroll-social-charge.entity';
import { IntercompanyTransferController } from './intercompany-transfer.controller';
import { IntercompanyTransferService } from './intercompany-transfer.service';
import { PayrollOrphanReassignmentService } from './payroll-orphan-reassignment.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayPeriod,
      PayrollReactivationItem,
      PayrollCalendar,
      Employee,
      UserCompany,
      PayrollEmployeeSnapshot,
      PayrollInputSnapshot,
      PayrollResult,
      PayrollPlanillaSnapshotJson,
      PayrollSocialCharge,
      PayrollEmployeeVerification,
      PersonalAction,
      EmployeeTransfer,
      EmployeeAguinaldoProvision,
    ]),
    IntegrationModule,
    EmployeesModule,
    PersonalActionsModule,
  ],
  controllers: [PayrollController, IntercompanyTransferController],
  providers: [PayrollService, IntercompanyTransferService, PayrollOrphanReassignmentService],
})
export class PayrollModule {}
