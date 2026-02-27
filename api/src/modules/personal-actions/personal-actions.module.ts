import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalActionsController } from './personal-actions.controller';
import { PersonalActionsService } from './personal-actions.service';
import { PersonalAction } from './entities/personal-action.entity';
import { ActionQuota } from './entities/action-quota.entity';
import { UserCompany } from '../access-control/entities/user-company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalAction, ActionQuota, UserCompany]),
  ],
  controllers: [PersonalActionsController],
  providers: [PersonalActionsService],
})
export class PersonalActionsModule {}
