import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IntegrationModule } from '../integration/integration.module';

import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { OrgClass } from './entities/class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrgClass]), IntegrationModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
