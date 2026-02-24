import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { App } from './entities/app.entity';
import { UserApp } from './entities/user-app.entity';
import { UserCompany } from './entities/user-company.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { UserRoleGlobal } from './entities/user-role-global.entity';
import { UserRoleExclusion } from './entities/user-role-exclusion.entity';
import { UserPermissionOverride } from './entities/user-permission-override.entity';
import { UserPermissionGlobalDeny } from './entities/user-permission-global-deny.entity';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { UserAssignmentController } from './user-assignment.controller';
import { UserAssignmentService } from './user-assignment.service';
import { ConfigAccessController } from './config-access.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { Company } from '../companies/entities/company.entity';
import { User } from '../auth/entities/user.entity';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [
    NotificationsModule,
    IntegrationModule,
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
