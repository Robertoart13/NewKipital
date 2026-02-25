import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthzVersion } from './entities/authz-version.entity';
import { AuthzVersionService } from './authz-version.service';
import { PermissionsCacheService } from './permissions-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuthzVersion])],
  providers: [AuthzVersionService, PermissionsCacheService],
  exports: [AuthzVersionService, PermissionsCacheService],
})
export class AuthzModule {}

