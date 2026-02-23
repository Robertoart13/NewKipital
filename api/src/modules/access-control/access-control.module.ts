import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { App } from './entities/app.entity.js';
import { UserApp } from './entities/user-app.entity.js';
import { UserCompany } from './entities/user-company.entity.js';
import { Role } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import { UserRole } from './entities/user-role.entity.js';
import { UserRoleGlobal } from './entities/user-role-global.entity.js';
import { UserRoleExclusion } from './entities/user-role-exclusion.entity.js';
import { UserPermissionOverride } from './entities/user-permission-override.entity.js';
import { UserPermissionGlobalDeny } from './entities/user-permission-global-deny.entity.js';
import { AppsController } from './apps.controller.js';
import { AppsService } from './apps.service.js';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsService } from './permissions.service.js';
import { UserAssignmentController } from './user-assignment.controller.js';
import { UserAssignmentService } from './user-assignment.service.js';
import { ConfigAccessController } from './config-access.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../auth/entities/user.entity.js';

@Module({
  imports: [
    NotificationsModule,
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
  providers: [
    AppsService,
    RolesService,
    PermissionsService,
    UserAssignmentService,
  ],
  exports: [
    AppsService,
    RolesService,
    PermissionsService,
    UserAssignmentService,
  ],
})
export class AccessControlModule {}
