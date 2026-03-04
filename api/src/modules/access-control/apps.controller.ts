import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';

import { CacheScope } from '../../common/decorators/cache-scope.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CacheResponseInterceptor } from '../../common/interceptors/cache-response.interceptor';

import { AppsService } from './apps.service';
import type { CreateAppDto } from './dto/create-app.dto';

@CacheScope('apps')
@UseInterceptors(CacheResponseInterceptor)
@Controller('apps')
export class AppsController {
  constructor(private readonly service: AppsService) {}

  @RequirePermissions('config:roles')
  @Post()
  create(@Body() dto: CreateAppDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('config:users')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('config:users')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('config:roles')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.inactivate(id);
  }

  @RequirePermissions('config:roles')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivate(id);
  }
}
