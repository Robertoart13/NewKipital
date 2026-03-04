import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CsrfGuard } from './common/guards/csrf.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AppCacheModule } from './common/services/app-cache.module';
import { databaseConfig } from './config/database.config';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AccountingAccountsModule } from './modules/accounting-accounts/accounting-accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PositionsModule } from './modules/positions/positions.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PersonalActionsModule } from './modules/personal-actions/personal-actions.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OpsModule } from './modules/ops/ops.module';
import { HealthModule } from './modules/health/health.module';
import { PayrollArticlesModule } from './modules/payroll-articles/payroll-articles.module';
import { PayrollHolidaysModule } from './modules/payroll-holidays/payroll-holidays.module';
import { PayrollMovementsModule } from './modules/payroll-movements/payroll-movements.module';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AppCacheModule,
    AuthModule,
    CompaniesModule,
    ClassesModule,
    ProjectsModule,
    AccountingAccountsModule,
    PayrollArticlesModule,
    PayrollMovementsModule,
    PayrollHolidaysModule,
    DepartmentsModule,
    PositionsModule,
    EmployeesModule,
    PersonalActionsModule,
    PayrollModule,
    AccessControlModule,
    IntegrationModule,
    NotificationsModule,
    OpsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
