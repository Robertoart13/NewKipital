import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { redisClientProvider } from '../../config/redis.config';

import { AppCacheService } from './app-cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisClientProvider, AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
