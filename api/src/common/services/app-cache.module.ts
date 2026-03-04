import { Global, Module } from '@nestjs/common';
import { redisClientProvider } from '../../config/redis.config';
import { AppCacheService } from './app-cache.service';

@Global()
@Module({
  providers: [redisClientProvider, AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
