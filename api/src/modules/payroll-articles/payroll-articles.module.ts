import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollArticlesController } from './payroll-articles.controller';
import { PayrollArticlesService } from './payroll-articles.service';
import { PayrollArticle } from './entities/payroll-article.entity';
import { PayrollArticleType } from './entities/payroll-article-type.entity';
import { PersonalActionType } from '../accounting-accounts/entities/personal-action-type.entity';
import { AccountingAccount } from '../accounting-accounts/entities/accounting-account.entity';
import { Company } from '../companies/entities/company.entity';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollArticle,
      PayrollArticleType,
      PersonalActionType,
      AccountingAccount,
      Company,
    ]),
    IntegrationModule,
  ],
  controllers: [PayrollArticlesController],
  providers: [PayrollArticlesService],
})
export class PayrollArticlesModule {}
