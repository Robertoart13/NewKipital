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
import { AccountingAccountsService } from './accounting-accounts.service';
import { CreateAccountingAccountDto } from './dto/create-accounting-account.dto';
import { UpdateAccountingAccountDto } from './dto/update-accounting-account.dto';

@Controller('accounting-accounts')
export class AccountingAccountsController {
  constructor(private readonly service: AccountingAccountsService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'accounting-accounts' };
  }

  @RequirePermissions('accounting-account:view')
  @Get('types')
  listTypes() {
    return this.service.listAccountTypes();
  }

  @RequirePermissions('accounting-account:view')
  @Get('personal-action-types')
  listPersonalActionTypes() {
    return this.service.listPersonalActionTypes();
  }

  @RequirePermissions('accounting-account:create')
  @Post()
  create(@Body() dto: CreateAccountingAccountDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('accounting-account:view')
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

  @RequirePermissions('accounting-account:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @RequirePermissions('accounting-account:edit')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountingAccountDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('accounting-account:inactivate')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('accounting-account:reactivate')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('config:cuentas-contables:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(id, limit);
  }
}
