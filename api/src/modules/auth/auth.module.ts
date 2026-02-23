import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConfig } from '../../config/jwt.config.js';
import { JwtStrategy } from '../../common/strategies/jwt.strategy.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { MicrosoftAuthService } from './microsoft-auth.service.js';
import { User } from './entities/user.entity.js';
import { App } from '../access-control/entities/app.entity.js';
import { UserApp } from '../access-control/entities/user-app.entity.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';
import { UserRole } from '../access-control/entities/user-role.entity.js';
import { UserRoleGlobal } from '../access-control/entities/user-role-global.entity.js';
import { UserRoleExclusion } from '../access-control/entities/user-role-exclusion.entity.js';
import { RolePermission } from '../access-control/entities/role-permission.entity.js';
import { Permission } from '../access-control/entities/permission.entity.js';
import { UserPermissionOverride } from '../access-control/entities/user-permission-override.entity.js';
import { UserPermissionGlobalDeny } from '../access-control/entities/user-permission-global-deny.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { RefreshSession } from './entities/refresh-session.entity.js';
import { IntegrationModule } from '../integration/integration.module.js';
import { AuthAuditService } from './auth-audit.service.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, App, UserApp, UserCompany, Company,
      UserRole, UserRoleGlobal, UserRoleExclusion, RolePermission, Permission, UserPermissionOverride, UserPermissionGlobalDeny, RefreshSession,
    ]),
    JwtModule.registerAsync(jwtConfig),
    PassportModule,
    IntegrationModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    UsersService,
    JwtStrategy,
    MicrosoftAuthService,
    AuthAuditService,
    AuthRateLimitService,
  ],
  exports: [UsersService, AuthService],
})
export class AuthModule {}
