import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../auth/entities/user.entity';
import { AuthzModule } from '../authz/authz.module';
import { Company } from '../companies/entities/company.entity';
import { IntegrationModule } from '../integration/integration.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { ConfigAccessController } from './config-access.controller';
import { App } from './entities/app.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { UserApp } from './entities/user-app.entity';
import { UserCompany } from './entities/user-company.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRoleExclusion } from './entities/user-role-exclusion.entity';
import { UserRoleGlobal } from './entities/user-role-global.entity';
import { UserRole } from './entities/user-role.entity';
import { UserPermissionOverride } from './entities/user-permission-override.entity';
import { UserPermissionGlobalDeny } from './entities/user-permission-global-deny.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UserAssignmentController } from './user-assignment.controller';
import { UserAssignmentService } from './user-assignment.service';

@Module({
  imports: [
    NotificationsModule,
    IntegrationModule,
    AuthzModule,
    TypeOrmModule.forFeature([
      App,
      UserApp,
      UserCompany,
      Role,
      Permission,
      RolePermission,
      UserRole,
      UserRoleGlobal,
      UserRoleExclusion,
      UserPermissionOverride,
      UserPermissionGlobalDeny,
      Company,
      User,
    ]),
  ],
  controllers: [
    AppsController,
    RolesController,
    PermissionsController,
    UserAssignmentController,
    ConfigAccessController,
  ],
  providers: [AppsService, RolesService, PermissionsService, UserAssignmentService],
  exports: [AppsService, RolesService, PermissionsService, UserAssignmentService],
})
export class AccessControlModule {}
