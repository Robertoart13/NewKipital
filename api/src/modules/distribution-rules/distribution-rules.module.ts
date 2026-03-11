import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountingAccount } from '../accounting-accounts/entities/accounting-account.entity';
import { PersonalActionType } from '../accounting-accounts/entities/personal-action-type.entity';
import { Company } from '../companies/entities/company.entity';
import { Department } from '../employees/entities/department.entity';
import { Position } from '../employees/entities/position.entity';
import { IntegrationModule } from '../integration/integration.module';

import { DistributionRulesController } from './distribution-rules.controller';
import { DistributionRulesService } from './distribution-rules.service';
import { DistributionRuleDetail } from './entities/distribution-rule-detail.entity';
import { DistributionRule } from './entities/distribution-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DistributionRule,
      DistributionRuleDetail,
      Company,
      Department,
      Position,
      PersonalActionType,
      AccountingAccount,
    ]),
    IntegrationModule,
  ],
  controllers: [DistributionRulesController],
  providers: [DistributionRulesService],
})
export class DistributionRulesModule {}
