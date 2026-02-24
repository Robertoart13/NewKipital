import {
  Controller, Get, Post, Put, Patch, Param, Body, Query,
  ParseIntPipe, ParseBoolPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'users' };
  }

  @RequirePermissions('config:users')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('config:users')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('configView', new ParseBoolPipe({ optional: true })) configView?: boolean,
  ) {
    return this.service.findAll(includeInactive ?? false, configView ?? false);
  }

  @RequirePermissions('config:users')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('config:users')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() user: { userId: number }) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('config:users')
  @Patch(':id/inactivate')
  inactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('motivo') motivo?: string,
  ) {
    return this.service.inactivate(id, user.userId, motivo);
  }

  @RequirePermissions('config:users')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:users')
  @Patch(':id/block')
  block(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('motivo') motivo?: string,
  ) {
    return this.service.block(id, user.userId, motivo);
  }
}
