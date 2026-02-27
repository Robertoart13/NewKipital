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
import { PayrollArticlesService } from './payroll-articles.service';
import { CreatePayrollArticleDto } from './dto/create-payroll-article.dto';
import { UpdatePayrollArticleDto } from './dto/update-payroll-article.dto';

@Controller('payroll-articles')
export class PayrollArticlesController {
  constructor(private readonly service: PayrollArticlesService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'payroll-articles' };
  }

  @RequirePermissions('payroll-article:view')
  @Get('types')
  listTypes() {
    return this.service.listTypes();
  }

  @RequirePermissions('payroll-article:view')
  @Get('personal-action-types')
  listPersonalActionTypes() {
    return this.service.listPersonalActionTypes();
  }

  @RequirePermissions('payroll-article:view')
  @Get('accounts')
  listAccounts(
    @Query('idEmpresa', new ParseIntPipe({ optional: true })) idEmpresa?: number,
    @Query('idsReferencia') idsReferenciaRaw?: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    if (!idEmpresa) return [];
    const idsReferencia = idsReferenciaRaw
      ? idsReferenciaRaw
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
      : undefined;
    if (!idsReferencia || idsReferencia.length === 0) return [];
    return this.service.listAccountsByCompany(idEmpresa, includeInactive ?? false, idsReferencia);
  }

  @RequirePermissions('payroll-article:create')
  @Post()
  create(@Body() dto: CreatePayrollArticleDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('payroll-article:view')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true })) inactiveOnly?: boolean,
    @Query('idEmpresa', new ParseIntPipe({ optional: true })) idEmpresa?: number,
    @Query('idEmpresas') idEmpresas?: string,
  ) {
    const parsedIds = idEmpresas
      ? idEmpresas
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
      : undefined;
    return this.service.findAll(includeInactive ?? false, inactiveOnly ?? false, idEmpresa, parsedIds);
  }

  @RequirePermissions('payroll-article:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('payroll-article:edit')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePayrollArticleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('payroll-article:inactivate')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('payroll-article:reactivate')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:payroll-articles:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(id, limit);
  }
}
