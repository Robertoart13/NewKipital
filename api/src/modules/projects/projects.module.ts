import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgProject } from './entities/project.entity';
import { Company } from '../companies/entities/company.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { IntegrationModule } from '../integration/integration.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrgProject, Company]), IntegrationModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
