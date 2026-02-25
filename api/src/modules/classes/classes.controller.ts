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
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

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
  create(@Body() dto: CreateClassDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('config:clases')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true })) inactiveOnly?: boolean,
  ) {
    return this.service.findAll(includeInactive ?? false, inactiveOnly ?? false);
  }

  @RequirePermissions('config:clases')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('class:edit')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClassDto) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('class:inactivate')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.inactivate(id);
  }

  @RequirePermissions('class:reactivate')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivate(id);
  }
}

