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
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Controller('positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'positions' };
  }

  @RequirePermissions('position:create')
  @Post()
  create(
    @Body() dto: CreatePositionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('position:view')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true }))
    inactiveOnly?: boolean,
  ) {
    return this.service.findAll(
      includeInactive ?? false,
      inactiveOnly ?? false,
    );
  }

  @RequirePermissions('position:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('position:edit')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePositionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('position:inactivate')
  @Patch(':id/inactivate')
  inactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('position:reactivate')
  @Patch(':id/reactivate')
  reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:puestos:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(id, limit);
  }
}
