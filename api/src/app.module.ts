import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { databaseConfig } from './config/database.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';
import { PersonalActionsModule } from './modules/personal-actions/personal-actions.module.js';
import { PayrollModule } from './modules/payroll/payroll.module.js';
import { AccessControlModule } from './modules/access-control/access-control.module.js';
import { IntegrationModule } from './modules/integration/integration.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { OpsModule } from './modules/ops/ops.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    EventEmitterModule.forRoot(),
    AuthModule,
    CompaniesModule,
    EmployeesModule,
    PersonalActionsModule,
    PayrollModule,
    AccessControlModule,
    IntegrationModule,
    NotificationsModule,
    OpsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
