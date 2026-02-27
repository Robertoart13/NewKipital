import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PersonalActionsService } from './personal-actions.service';
import { CreatePersonalActionDto } from './dto/create-personal-action.dto';
import { PersonalActionEstado } from './entities/personal-action.entity';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('personal-actions')
export class PersonalActionsController {
  constructor(private readonly service: PersonalActionsService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'personal-actions' };
  }

  @RequirePermissions('personal-action:view')
  @Get()
  findAll(
    @CurrentUser() user: { userId: number },
    @Query('idEmpresa') idEmpresaRaw?: string,
    @Query('estado') estado?: string,
  ) {
    const idEmpresa = idEmpresaRaw ? parseInt(idEmpresaRaw, 10) : undefined;
    const est = estado
      ? (parseInt(estado, 10) as PersonalActionEstado)
      : undefined;
    return this.service.findAll(
      user.userId,
      Number.isNaN(idEmpresa!) ? undefined : idEmpresa,
      est,
    );
  }

  @RequirePermissions('personal-action:view')
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findOne(id, user.userId);
  }

  @RequirePermissions('personal-action:create')
  @Post()
  create(
    @Body() dto: CreatePersonalActionDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('personal-action:approve')
  @Patch(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.approve(id, user.userId);
  }

  @RequirePermissions('personal-action:approve')
  @Patch(':id/associate-to-payroll')
  associateToPayroll(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('idPlanilla') idPlanilla: number,
    @Body('idCalendarioNomina') idCalendarioNomina?: number,
  ) {
    const calId = idCalendarioNomina ?? idPlanilla; // idPlanilla = idCalendarioNomina (retrocompat)
    return this.service.associateToPayroll(id, calId, user.userId);
  }

  @RequirePermissions('personal-action:approve')
  @Patch(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Body('motivo') motivo?: string,
  ) {
    return this.service.reject(id, motivo ?? '', user.userId);
  }
}
