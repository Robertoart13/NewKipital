import { Controller, Get, Post, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from '../access-control/entities/app.entity';

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
    const idApp = appCode ? (await this.appRepo.findOne({ where: { codigo: appCode.trim().toLowerCase(), estado: 1 } }))?.id : undefined;
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
    const idApp = appCode ? (await this.appRepo.findOne({ where: { codigo: appCode.trim().toLowerCase(), estado: 1 } }))?.id : undefined;
    const idEmpresa = companyId ? parseInt(companyId, 10) : undefined;
    const count = await this.notificationsService.getUnreadCount(
      user.userId,
      idApp,
      Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
    );
    return { count };
  }

  @Post(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post(':id/delete')
  markAsDeleted(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.notificationsService.markAsDeleted(id, user.userId);
  }

  @Post('read-all')
  markAllAsRead(
    @CurrentUser() user: { userId: number },
    @Query('appCode') appCode?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.notificationsService.markAllAsRead(user.userId);
  }
}
