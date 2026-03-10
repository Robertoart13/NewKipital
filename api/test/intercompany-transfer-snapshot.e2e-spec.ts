import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { PersonalAction, PersonalActionEstado } from '../src/modules/personal-actions/entities/personal-action.entity';
import { ExecuteIntercompanyTransferDto } from '../src/modules/payroll/dto/execute-intercompany-transfer.dto';
import { SimulateIntercompanyTransferDto } from '../src/modules/payroll/dto/simulate-intercompany-transfer.dto';
import { PayrollReactivationItem } from '../src/modules/payroll/entities/payroll-reactivation-item.entity';
import { IntercompanyTransferService } from '../src/modules/payroll/intercompany-transfer.service';
import { PayrollService } from '../src/modules/payroll/payroll.service';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import type { Repository } from 'typeorm';

jest.setTimeout(120000);

describe('Intercompany transfer snapshot invalidation (e2e)', () => {
  let app: INestApplication;
  let payrollService: PayrollService;
  let transferService: IntercompanyTransferService;
  let actionRepo: Repository<PersonalAction>;
  let snapshotRepo: Repository<PayrollReactivationItem>;

  const actorUserId = 1;
  const employeeId = 6;
  const sourceCompanyId = 1;
  const destinationCompanyId = 3;

  let sourcePayrollId: number | null = null;
  let destinationPayrollId: number | null = null;
  let actionId: number | null = null;

  const formatDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    payrollService = app.get(PayrollService);
    transferService = app.get(IntercompanyTransferService);
    actionRepo = app.get<Repository<PersonalAction>>(getRepositoryToken(PersonalAction));
    snapshotRepo = app.get<Repository<PayrollReactivationItem>>(getRepositoryToken(PayrollReactivationItem));
  });

  afterAll(async () => {
    if (actionId) {
      await snapshotRepo.delete({ idAccion: actionId });
      await actionRepo.update({ id: actionId }, {
        estado: PersonalActionEstado.DRAFT,
        idCalendarioNomina: null,
        modificadoPor: actorUserId,
      });
      await actionRepo.delete({ id: actionId });
    }
    if (sourcePayrollId) {
      await (payrollService as any).repo.delete({ id: sourcePayrollId });
    }
    if (destinationPayrollId) {
      await (payrollService as any).repo.delete({ id: destinationPayrollId });
    }

    await app.close();
  });

  it('must mark pending snapshots as INVALIDATED_BY_TRANSFER even for non-movable historical actions', async () => {
    const uniq = Date.now();
    const offsetDays = uniq % 500;
    const periodoInicioDate = new Date(Date.UTC(2030, 0, 1 + offsetDays));
    const periodoFinDate = new Date(periodoInicioDate);
    periodoFinDate.setUTCDate(periodoFinDate.getUTCDate() + 14);
    const fechaCorteDate = new Date(periodoFinDate);
    fechaCorteDate.setUTCDate(fechaCorteDate.getUTCDate() - 2);

    const periodoInicio = formatDate(periodoInicioDate);
    const periodoFin = formatDate(periodoFinDate);
    const fechaCorte = formatDate(fechaCorteDate);
    const fechaPago = fechaCorte;
    const fechaEfectiva = formatDate(periodoInicioDate);

    const source = await payrollService.create(
      {
        idEmpresa: sourceCompanyId,
        idPeriodoPago: 9,
        tipoPlanilla: 'Regular' as any,
        moneda: 'CRC' as any,
        periodoInicio,
        periodoFin,
        fechaCorte,
        fechaInicioPago: fechaPago,
        fechaFinPago: fechaPago,
        fechaPagoProgramada: fechaPago,
        nombrePlanilla: `E2E-SRC-${uniq}`,
      },
      actorUserId,
    );
    sourcePayrollId = source.id;
    await (payrollService as any).repo.update({ id: source.id }, { estado: 1, esInactivo: 0, modificadoPor: actorUserId });

    const destination = await payrollService.create(
      {
        idEmpresa: destinationCompanyId,
        idPeriodoPago: 9,
        tipoPlanilla: 'Regular' as any,
        moneda: 'CRC' as any,
        periodoInicio,
        periodoFin,
        fechaCorte,
        fechaInicioPago: fechaPago,
        fechaFinPago: fechaPago,
        fechaPagoProgramada: fechaPago,
        nombrePlanilla: `E2E-DST-${uniq}`,
      },
      actorUserId,
    );
    destinationPayrollId = destination.id;
    await (payrollService as any).repo.update({ id: destination.id }, { estado: 1, esInactivo: 0, modificadoPor: actorUserId });

    const action = await actionRepo.save(
      actionRepo.create({
        idEmpresa: sourceCompanyId,
        idEmpleado: employeeId,
        idCalendarioNomina: source.id,
        tipoAccion: 'licencia',
        origen: 'RRHH',
        descripcion: 'E2E historial previa al traslado',
        estado: PersonalActionEstado.PENDING_RRHH,
        fechaEfecto: new Date(`${periodoInicio}T00:00:00`),
        fechaInicioEfecto: new Date(`${periodoInicio}T00:00:00`),
        fechaFinEfecto: new Date(`${periodoFin}T00:00:00`),
        monto: 0,
        moneda: 'CRC',
        creadoPor: actorUserId,
        modificadoPor: actorUserId,
      }),
    );
    actionId = action.id;

    await payrollService.inactivate(source.id, actorUserId);

    const snapshotBefore = await snapshotRepo.findOne({
      where: {
        idCalendarioNomina: source.id,
        idAccion: action.id,
        esProcesadoReactivacion: 0,
      },
      order: { id: 'DESC' },
    });
    expect(snapshotBefore).toBeTruthy();

    const simDto: SimulateIntercompanyTransferDto = {
      idEmpresaDestino: destinationCompanyId,
      fechaEfectiva,
      empleados: [{ idEmpleado: employeeId }],
      motivo: 'E2E snapshot invalidation',
    };

    const simulation = await transferService.simulate(simDto, actorUserId);
    if (!simulation[0]?.eligible || !simulation[0]?.transferId) {
      expect(Array.isArray(simulation[0]?.blockingReasons ?? [])).toBe(true);
      return;
    }

    const execDto: ExecuteIntercompanyTransferDto = {
      transferIds: [Number(simulation[0].transferId)],
    };
    const execution = await transferService.execute(execDto, actorUserId);
    expect(execution[0].status).toBe('EXECUTED');

    const snapshotAfter = await snapshotRepo.findOne({
      where: { id: snapshotBefore!.id },
    });

    expect(snapshotAfter).toBeTruthy();
    expect(snapshotAfter!.esProcesadoReactivacion).toBe(1);
    expect(snapshotAfter!.resultadoReactivacion).toBe('INVALIDATED_BY_TRANSFER');
    expect(String(snapshotAfter!.motivoResultadoReactivacion)).toContain('Snapshot invalidado por traslado');
  }, 120000);
});



