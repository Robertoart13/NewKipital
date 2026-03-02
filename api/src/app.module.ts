import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AccountingAccountsModule } from './modules/accounting-accounts/accounting-accounts.module';
import { PayrollArticlesModule } from './modules/payroll-articles/payroll-articles.module';
import { PayrollMovementsModule } from './modules/payroll-movements/payroll-movements.module';
import { PayrollHolidaysModule } from './modules/payroll-holidays/payroll-holidays.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PositionsModule } from './modules/positions/positions.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PersonalActionsModule } from './modules/personal-actions/personal-actions.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OpsModule } from './modules/ops/ops.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
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
