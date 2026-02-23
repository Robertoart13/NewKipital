import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalActionsController } from './personal-actions.controller.js';
import { PersonalActionsService } from './personal-actions.service.js';
import { PersonalAction } from './entities/personal-action.entity.js';
import { ActionQuota } from './entities/action-quota.entity.js';
import { UserCompany } from '../access-control/entities/user-company.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalAction, ActionQuota, UserCompany])],
  controllers: [PersonalActionsController],
  providers: [PersonalActionsService],
})
export class PersonalActionsModule {}
