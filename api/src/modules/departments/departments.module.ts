import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../employees/entities/department.entity';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [TypeOrmModule.forFeature([Department]), IntegrationModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
