import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollMovementsController } from './payroll-movements.controller';
import { PayrollMovementsService } from './payroll-movements.service';
import { PayrollMovement } from './entities/payroll-movement.entity';
import { Company } from '../companies/entities/company.entity';
import { PayrollArticle } from '../payroll-articles/entities/payroll-article.entity';
import { PersonalActionType } from '../accounting-accounts/entities/personal-action-type.entity';
import { OrgClass } from '../classes/entities/class.entity';
import { OrgProject } from '../projects/entities/project.entity';
import { IntegrationModule } from '../integration/integration.module';

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
