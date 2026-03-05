import { Body, Controller, Post } from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { IntercompanyTransferService } from './intercompany-transfer.service';

import { ExecuteIntercompanyTransferDto } from './dto/execute-intercompany-transfer.dto';
import { SimulateIntercompanyTransferDto } from './dto/simulate-intercompany-transfer.dto';

@Controller('payroll/intercompany-transfer')
export class IntercompanyTransferController {
  constructor(private readonly service: IntercompanyTransferService) {}

  @RequirePermissions('payroll:intercompany-transfer')
  @Post('simulate')
  simulate(
    @Body() dto: SimulateIntercompanyTransferDto,
    @CurrentUser() user: { userId: number },
  ): ReturnType<IntercompanyTransferService['simulate']> {
    return this.service.simulate(dto, user.userId);
  }

  @RequirePermissions('payroll:intercompany-transfer')
  @Post('execute')
  execute(
    @Body() dto: ExecuteIntercompanyTransferDto,
    @CurrentUser() user: { userId: number },
  ): ReturnType<IntercompanyTransferService['execute']> {
    return this.service.execute(dto, user.userId);
  }
}
