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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'departments' };
  }

  @RequirePermissions('department:create')
  @Post()
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('department:view')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true })) inactiveOnly?: boolean,
  ) {
    return this.service.findAll(includeInactive ?? false, inactiveOnly ?? false);
  }

  @RequirePermissions('department:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('department:edit')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('department:inactivate')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('department:reactivate')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:departamentos:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(id, limit);
  }
}
