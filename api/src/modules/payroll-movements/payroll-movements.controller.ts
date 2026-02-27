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
import { PayrollMovementsService } from './payroll-movements.service';
import { CreatePayrollMovementDto } from './dto/create-payroll-movement.dto';
import { UpdatePayrollMovementDto } from './dto/update-payroll-movement.dto';

@Controller('payroll-movements')
export class PayrollMovementsController {
  constructor(private readonly service: PayrollMovementsService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'payroll-movements' };
  }

  @RequirePermissions('payroll-movement:view')
  @Get('articles')
  listArticles(
    @Query('idEmpresa', new ParseIntPipe({ optional: true }))
    idEmpresa?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    if (!idEmpresa) return [];
    return this.service.listArticlesByCompany(
      idEmpresa,
      includeInactive ?? false,
    );
  }

  @RequirePermissions('payroll-movement:view')
  @Get('personal-action-types')
  listPersonalActionTypes(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.service.listPersonalActionTypes(includeInactive ?? false);
  }

  @RequirePermissions('payroll-movement:view')
  @Get('classes')
  listClasses(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return this.service.listClasses(includeInactive ?? false);
  }

  @RequirePermissions('payroll-movement:view')
  @Get('projects')
  listProjects(
    @Query('idEmpresa', new ParseIntPipe({ optional: true }))
    idEmpresa?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    if (!idEmpresa) return [];
    return this.service.listProjects(idEmpresa, includeInactive ?? false);
  }

  @RequirePermissions('payroll-movement:create')
  @Post()
  create(
    @Body() dto: CreatePayrollMovementDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('payroll-movement:view')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true }))
    inactiveOnly?: boolean,
    @Query('idEmpresa', new ParseIntPipe({ optional: true }))
    idEmpresa?: number,
    @Query('idEmpresas') idEmpresas?: string,
  ) {
    const parsedIds = idEmpresas
      ? idEmpresas
          .split(',')
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value))
      : undefined;
    return this.service.findAll(
      includeInactive ?? false,
      inactiveOnly ?? false,
      idEmpresa,
      parsedIds,
    );
  }

  @RequirePermissions('payroll-movement:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('payroll-movement:edit')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollMovementDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('payroll-movement:inactivate')
  @Patch(':id/inactivate')
  inactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('payroll-movement:reactivate')
  @Patch(':id/reactivate')
  reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:payroll-movements:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(id, limit);
  }
}
