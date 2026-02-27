import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

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
