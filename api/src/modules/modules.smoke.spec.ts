import { describe, expect, it } from '@jest/globals';

import { AccessControlModule } from './access-control/access-control.module';
import { AppsController } from './access-control/apps.controller';
import { AppsService } from './access-control/apps.service';
import { PermissionsController } from './access-control/permissions.controller';
import { PermissionsService } from './access-control/permissions.service';
import { RolesController } from './access-control/roles.controller';
import { RolesService } from './access-control/roles.service';
import { UserAssignmentController } from './access-control/user-assignment.controller';
import { UserAssignmentService } from './access-control/user-assignment.service';

import { PayrollModule } from './payroll/payroll.module';
import { PayrollController } from './payroll/payroll.controller';
import { PayrollService } from './payroll/payroll.service';

import { PersonalActionsModule } from './personal-actions/personal-actions.module';
import { PersonalActionsController } from './personal-actions/personal-actions.controller';
import { PersonalActionsService } from './personal-actions/personal-actions.service';

import { NotificationsModule } from './notifications/notifications.module';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsGateway } from './notifications/notifications.gateway';

import { OpsModule } from './ops/ops.module';
import { OpsController } from './ops/ops.controller';
import { OpsService } from './ops/ops.service';

import { IntegrationModule } from './integration/integration.module';
import { DomainEventsService } from './integration/domain-events.service';
import { AuditOutboxService } from './integration/audit-outbox.service';
import { AuditWorkerService } from './integration/audit-worker.service';
import { ClassesModule } from './classes/classes.module';
import { ClassesController } from './classes/classes.controller';
import { ClassesService } from './classes/classes.service';
import { ProjectsModule } from './projects/projects.module';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { DepartmentsModule } from './departments/departments.module';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';
import { PositionsModule } from './positions/positions.module';
import { PositionsController } from './positions/positions.controller';
import { PositionsService } from './positions/positions.service';
import { AccountingAccountsModule } from './accounting-accounts/accounting-accounts.module';
import { AccountingAccountsController } from './accounting-accounts/accounting-accounts.controller';
import { AccountingAccountsService } from './accounting-accounts/accounting-accounts.service';
import { PayrollArticlesModule } from './payroll-articles/payroll-articles.module';
import { PayrollArticlesController } from './payroll-articles/payroll-articles.controller';
import { PayrollArticlesService } from './payroll-articles/payroll-articles.service';
import { PayrollMovementsModule } from './payroll-movements/payroll-movements.module';
import { PayrollMovementsController } from './payroll-movements/payroll-movements.controller';
import { PayrollMovementsService } from './payroll-movements/payroll-movements.service';

describe('Modules Smoke', () => {
  it('loads access-control classes', () => {
    expect(AccessControlModule).toBeDefined();
    expect(AppsController).toBeDefined();
    expect(AppsService).toBeDefined();
    expect(PermissionsController).toBeDefined();
    expect(PermissionsService).toBeDefined();
    expect(RolesController).toBeDefined();
    expect(RolesService).toBeDefined();
    expect(UserAssignmentController).toBeDefined();
    expect(UserAssignmentService).toBeDefined();
  });

  it('loads payroll and personal-actions classes', () => {
    expect(PayrollModule).toBeDefined();
    expect(PayrollController).toBeDefined();
    expect(PayrollService).toBeDefined();
    expect(PersonalActionsModule).toBeDefined();
    expect(PersonalActionsController).toBeDefined();
    expect(PersonalActionsService).toBeDefined();
  });

  it('loads notifications, ops and integration classes', () => {
    expect(NotificationsModule).toBeDefined();
    expect(NotificationsController).toBeDefined();
    expect(NotificationsService).toBeDefined();
    expect(NotificationsGateway).toBeDefined();

    expect(OpsModule).toBeDefined();
    expect(OpsController).toBeDefined();
    expect(OpsService).toBeDefined();

    expect(IntegrationModule).toBeDefined();
    expect(DomainEventsService).toBeDefined();
    expect(AuditOutboxService).toBeDefined();
    expect(AuditWorkerService).toBeDefined();
  });

  it('loads classes module', () => {
    expect(ClassesModule).toBeDefined();
    expect(ClassesController).toBeDefined();
    expect(ClassesService).toBeDefined();
  });

  it('loads projects module', () => {
    expect(ProjectsModule).toBeDefined();
    expect(ProjectsController).toBeDefined();
    expect(ProjectsService).toBeDefined();
  });

  it('loads departments module', () => {
    expect(DepartmentsModule).toBeDefined();
    expect(DepartmentsController).toBeDefined();
    expect(DepartmentsService).toBeDefined();
  });

  it('loads positions module', () => {
    expect(PositionsModule).toBeDefined();
    expect(PositionsController).toBeDefined();
    expect(PositionsService).toBeDefined();
  });

  it('loads accounting accounts module', () => {
    expect(AccountingAccountsModule).toBeDefined();
    expect(AccountingAccountsController).toBeDefined();
    expect(AccountingAccountsService).toBeDefined();
  });

  it('loads payroll articles module', () => {
    expect(PayrollArticlesModule).toBeDefined();
    expect(PayrollArticlesController).toBeDefined();
    expect(PayrollArticlesService).toBeDefined();
  });

  it('loads payroll movements module', () => {
    expect(PayrollMovementsModule).toBeDefined();
    expect(PayrollMovementsController).toBeDefined();
    expect(PayrollMovementsService).toBeDefined();
  });
});
