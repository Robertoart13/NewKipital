import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @RequirePermissions('config:permissions')
  @Get('mode')
  getCatalogMode() {
    return { mode: this.service.getCatalogMode() };
  }

  @RequirePermissions('config:permissions')
  @Post()
  create(@Body() dto: CreatePermissionDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('config:roles')
  @Get()
  findAll(
    @Query('modulo') modulo?: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    return this.service.findAll(modulo, includeInactive ?? true);
  }

  @RequirePermissions('config:roles')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('config:permissions')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('config:permissions')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('config:permissions')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }
}
