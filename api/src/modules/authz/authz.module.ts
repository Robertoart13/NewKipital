import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzVersion } from './entities/authz-version.entity';
import { AuthzVersionService } from './authz-version.service';
import { PermissionsCacheService } from './permissions-cache.service';
import { AuthzRealtimeService } from './authz-realtime.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthzVersion])],
  providers: [
    AuthzVersionService,
    PermissionsCacheService,
    AuthzRealtimeService,
  ],
  exports: [AuthzVersionService, PermissionsCacheService, AuthzRealtimeService],
})
export class AuthzModule {}
