import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { redisClientProvider } from '../../config/redis.config';

import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, TypeOrmModule],
  controllers: [HealthController],
  providers: [redisClientProvider],
})
export class HealthModule {}
