import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PersonalActionType } from '../accounting-accounts/entities/personal-action-type.entity';
import { OrgClass } from '../classes/entities/class.entity';
import { Company } from '../companies/entities/company.entity';
import { IntegrationModule } from '../integration/integration.module';
import { PayrollArticle } from '../payroll-articles/entities/payroll-article.entity';
import { OrgProject } from '../projects/entities/project.entity';

import { PayrollMovement } from './entities/payroll-movement.entity';
import { PayrollMovementsController } from './payroll-movements.controller';
import { PayrollMovementsService } from './payroll-movements.service';

@Module({
  imports: [
    IntegrationModule,
    TypeOrmModule.forFeature([
      PayrollMovement,
      Company,
      PayrollArticle,
      PersonalActionType,
      OrgClass,
      OrgProject,
    ]),
  ],
  controllers: [PayrollMovementsController],
  providers: [PayrollMovementsService],
})
export class PayrollMovementsModule {}
