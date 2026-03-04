import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  UseInterceptors,
} from '@nestjs/common';

import { CacheScope } from '../../common/decorators/cache-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CacheResponseInterceptor } from '../../common/interceptors/cache-response.interceptor';

import { ClassesService } from './classes.service';

import type { CreateClassDto } from './dto/create-class.dto';
import type { UpdateClassDto } from './dto/update-class.dto';

@CacheScope('classes')
@UseInterceptors(CacheResponseInterceptor)
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'classes' };
  }

  @RequirePermissions('class:create')
  @Post()
  create(@Body() dto: CreateClassDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('class:view')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true }))
    inactiveOnly?: boolean,
  ) {
    return this.service.findAll(includeInactive ?? false, inactiveOnly ?? false);
  }

  @RequirePermissions('class:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('class:edit')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('class:inactivate')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('class:reactivate')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:clases:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(id, limit);
  }
}
