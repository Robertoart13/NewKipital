import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppCacheService } from '../../common/services/app-cache.service';

import { OpsService } from './ops.service';

import type { ListQueueJobsDto, RequeueJobDto } from './dto/list-queue-jobs.dto';

@Controller('ops/queues')
export class OpsController {
  constructor(
    private readonly opsService: OpsService,
    private readonly cacheService: AppCacheService,
  ) {}

  @RequirePermissions('automation:monitor')
  @Get('summary')
  async summary() {
    const data = await this.opsService.getSummary();
    return { success: true, data, message: 'Resumen de colas', error: null };
  }

  @RequirePermissions('automation:monitor')
  @Get('identity')
  async identity(@Query() query: ListQueueJobsDto) {
    const data = await this.opsService.listQueue('identity', query);
    return { success: true, data, message: 'Cola identidad', error: null };
  }

  @RequirePermissions('automation:monitor')
  @Get('encrypt')
  async encrypt(@Query() query: ListQueueJobsDto) {
    const data = await this.opsService.listQueue('encrypt', query);
    return { success: true, data, message: 'Cola cifrado', error: null };
  }

  @RequirePermissions('automation:monitor')
  @Get('health-check')
  async healthCheck() {
    const data = await this.opsService.healthCheck();
    return {
      success: true,
      data,
      message: 'Estado de procesamiento',
      error: null,
    };
  }

  @RequirePermissions('automation:admin')
  @Post('rescan')
  async rescan() {
    const data = await this.opsService.rescanNow();
    return { success: true, data, message: 'Re-scan ejecutado', error: null };
  }

  @RequirePermissions('automation:admin')
  @Post('release-stuck')
  async releaseStuck() {
    const data = await this.opsService.releaseStuckNow();
    return {
      success: true,
      data,
      message: 'Locks vencidos liberados',
      error: null,
    };
  }

  @RequirePermissions('automation:admin')
  @Post('vacations/provision-now')
  async provisionVacationsNow() {
    const data = await this.opsService.runVacationProvisionNow();
    return {
      success: true,
      data,
      message: 'Provision de vacaciones ejecutada',
      error: null,
    };
  }

  @RequirePermissions('automation:admin')
  @Post('requeue/:id')
  async requeue(@Param('id', ParseIntPipe) id: number, @Body() body: RequeueJobDto) {
    const data = await this.opsService.requeue(body.queue, id);
    return { success: true, data, message: 'Job reencolado', error: null };
  }

  @RequirePermissions('automation:monitor')
  @Get('cache-metrics')
  getCacheMetrics() {
    return { success: true, data: this.cacheService.getStats() };
  }
}
