import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies.controller.js';
import { CompaniesService } from './companies.service.js';
import { Company } from './entities/company.entity.js';
import { IntegrationModule } from '../integration/integration.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), IntegrationModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
