import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConfig } from '../../config/jwt.config';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { User } from './entities/user.entity';
import { App } from '../access-control/entities/app.entity';
import { UserApp } from '../access-control/entities/user-app.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';
import { UserRole } from '../access-control/entities/user-role.entity';
import { UserRoleGlobal } from '../access-control/entities/user-role-global.entity';
import { UserRoleExclusion } from '../access-control/entities/user-role-exclusion.entity';
import { Role } from '../access-control/entities/role.entity';
import { RolePermission } from '../access-control/entities/role-permission.entity';
import { Permission } from '../access-control/entities/permission.entity';
import { UserPermissionOverride } from '../access-control/entities/user-permission-override.entity';
import { UserPermissionGlobalDeny } from '../access-control/entities/user-permission-global-deny.entity';
import { Company } from '../companies/entities/company.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { IntegrationModule } from '../integration/integration.module';
import { AuthAuditService } from './auth-audit.service';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthzModule } from '../authz/authz.module';
import { redisClientProvider } from '../../config/redis.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      App,
      UserApp,
      UserCompany,
      Company,
      UserRole,
      UserRoleGlobal,
      UserRoleExclusion,
      Role,
      RolePermission,
      Permission,
      UserPermissionOverride,
      UserPermissionGlobalDeny,
      RefreshSession,
    ]),
    JwtModule.registerAsync(jwtConfig),
    PassportModule,
    IntegrationModule,
    AuthzModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    redisClientProvider,
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
