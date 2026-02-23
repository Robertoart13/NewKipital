import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity.js';
import { Position } from './entities/position.entity.js';
import { PayPeriod } from '../payroll/entities/pay-period.entity.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { AllowWithoutCompany } from '../../common/decorators/allow-without-company.decorator.js';

@Controller('catalogs')
@AllowWithoutCompany()
export class CatalogsController {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Position)
    private readonly posRepo: Repository<Position>,
    @InjectRepository(PayPeriod)
    private readonly periodRepo: Repository<PayPeriod>,
  ) {}

  @RequirePermissions('employee:view')
  @Get('departments')
  async departments() {
    return this.deptRepo.find({
      where: { estado: 1 },
      order: { nombre: 'ASC' },
      select: ['id', 'nombre', 'estado'],
    });
  }

  @RequirePermissions('employee:view')
  @Get('positions')
  async positions() {
    return this.posRepo.find({
      where: { estado: 1 },
      order: { nombre: 'ASC' },
      select: ['id', 'nombre', 'estado'],
    });
  }

  @RequirePermissions('employee:view')
  @Get('pay-periods')
  async payPeriods() {
    return this.periodRepo.find({
      where: { esInactivo: 0 },
      order: { dias: 'ASC' },
      select: ['id', 'nombre', 'dias'],
    });
  }
}
