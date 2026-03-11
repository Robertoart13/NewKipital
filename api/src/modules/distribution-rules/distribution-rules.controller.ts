import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';

import { CacheScope } from '../../common/decorators/cache-scope.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CacheResponseInterceptor } from '../../common/interceptors/cache-response.interceptor';

import { CreateDistributionRuleDto } from './dto/create-distribution-rule.dto';
import { ListDistributionRulesDto } from './dto/list-distribution-rules.dto';
import { UpdateDistributionRuleDto } from './dto/update-distribution-rule.dto';
import { DistributionRulesService } from './distribution-rules.service';

@CacheScope('distribution-rules')
@UseInterceptors(CacheResponseInterceptor)
@Controller('distribution-rules')
export class DistributionRulesController {
  constructor(private readonly service: DistributionRulesService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'distribution-rules' };
  }

  @RequirePermissions('config:reglas-distribucion')
  @Get()
  findAll(@Query() query: ListDistributionRulesDto) {
    return this.service.findAll(query);
  }

  @RequirePermissions('config:reglas-distribucion:view')
  @Get(':publicId')
  findOne(@Param('publicId') publicId: string) {
    return this.service.findOneByPublicId(publicId);
  }

  @RequirePermissions('config:reglas-distribucion:edit')
  @Post()
  create(@Body() dto: CreateDistributionRuleDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('config:reglas-distribucion:edit')
  @Put(':publicId')
  update(
    @Param('publicId') publicId: string,
    @Body() dto: UpdateDistributionRuleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.update(publicId, dto, user.userId);
  }

  @RequirePermissions('config:reglas-distribucion:edit')
  @Patch(':publicId/inactivate')
  inactivate(@Param('publicId') publicId: string, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(publicId, user.userId);
  }

  @RequirePermissions('config:reglas-distribucion:edit')
  @Patch(':publicId/reactivate')
  reactivate(@Param('publicId') publicId: string, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(publicId, user.userId);
  }

  @RequirePermissions('config:reglas-distribucion:audit')
  @Get(':publicId/audit-trail')
  getAuditTrail(
    @Param('publicId') publicId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.getAuditTrail(publicId, limit);
  }
}
