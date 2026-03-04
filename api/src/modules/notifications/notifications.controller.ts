import { Controller, Get, Post, Param, Query, ParseIntPipe, UseInterceptors } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CacheScope } from '../../common/decorators/cache-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CacheResponseInterceptor } from '../../common/interceptors/cache-response.interceptor';
import { App } from '../access-control/entities/app.entity';

import type { NotificationsService } from './notifications.service';
import type { Repository } from 'typeorm';

@CacheScope('notifications')
@UseInterceptors(CacheResponseInterceptor)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: { userId: number },
    @Query('status') status?: 'unread' | 'all',
    @Query('appCode') appCode?: string,
    @Query('companyId') companyId?: string,
  ) {
    const idApp = appCode
      ? (
          await this.appRepo.findOne({
            where: { codigo: appCode.trim().toLowerCase(), estado: 1 },
          })
        )?.id
      : undefined;
    const idEmpresa = companyId ? parseInt(companyId, 10) : undefined;
    return this.notificationsService.listForUser(
      user.userId,
      status === 'unread' ? 'unread' : 'all',
      idApp,
      Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
    );
  }

  @Get('unread-count')
  async unreadCount(
    @CurrentUser() user: { userId: number },
    @Query('appCode') appCode?: string,
    @Query('companyId') companyId?: string,
  ) {
    const idApp = appCode
      ? (
          await this.appRepo.findOne({
            where: { codigo: appCode.trim().toLowerCase(), estado: 1 },
          })
        )?.id
      : undefined;
    const idEmpresa = companyId ? parseInt(companyId, 10) : undefined;
    const count = await this.notificationsService.getUnreadCount(
      user.userId,
      idApp,
      Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
    );
    return { count };
  }

  @Post(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post(':id/delete')
  markAsDeleted(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.notificationsService.markAsDeleted(id, user.userId);
  }

  @Post('read-all')
  markAllAsRead(
    @CurrentUser() user: { userId: number },
    @Query('appCode') _appCode?: string,
    @Query('companyId') _companyId?: string,
  ) {
    return this.notificationsService.markAllAsRead(user.userId);
  }
}
