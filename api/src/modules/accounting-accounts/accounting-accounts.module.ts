import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from '../companies/entities/company.entity';
import { IntegrationModule } from '../integration/integration.module';

import { AccountingAccountsController } from './accounting-accounts.controller';
import { AccountingAccountsService } from './accounting-accounts.service';
import { AccountingAccountType } from './entities/accounting-account-type.entity';
import { AccountingAccount } from './entities/accounting-account.entity';
import { PersonalActionType } from './entities/personal-action-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingAccount,
      AccountingAccountType,
      PersonalActionType,
      Company,
    ]),
    IntegrationModule,
  ],
  controllers: [AccountingAccountsController],
  providers: [AccountingAccountsService],
})
export class AccountingAccountsModule {}
