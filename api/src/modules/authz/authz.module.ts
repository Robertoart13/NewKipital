import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthzRealtimeService } from './authz-realtime.service';
import { AuthzVersionService } from './authz-version.service';
import { AuthzVersion } from './entities/authz-version.entity';
import { PermissionsCacheService } from './permissions-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthzVersion])],
  providers: [AuthzVersionService, PermissionsCacheService, AuthzRealtimeService],
  exports: [AuthzVersionService, PermissionsCacheService, AuthzRealtimeService],
})
export class AuthzModule {}
