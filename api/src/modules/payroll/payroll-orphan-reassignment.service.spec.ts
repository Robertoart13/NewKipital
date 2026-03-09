import { In } from 'typeorm';

import { EstadoCalendarioNomina } from './entities/payroll-calendar.entity';
import { PayrollOrphanReassignmentService } from './payroll-orphan-reassignment.service';

describe('PayrollOrphanReassignmentService', () => {
  const buildService = () => {
    const payrollRepo = {
      find: jest.fn(),
    } as any;

    const payrollService = {
      reassignOrphanActionsForPayroll: jest.fn(),
    } as any;

    const service = new PayrollOrphanReassignmentService(payrollRepo, payrollService);
    return { service, payrollRepo, payrollService };
  };

  it('processPendingOrphansNow reassociates across active payrolls and returns total', async () => {
    const { service, payrollRepo, payrollService } = buildService();

    payrollRepo.find.mockResolvedValue([{ id: 10 }, { id: 20 }]);
    payrollService.reassignOrphanActionsForPayroll
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);

    const total = await service.processPendingOrphansNow();

    expect(total).toBe(5);
    expect(payrollRepo.find).toHaveBeenCalledWith({
      where: {
        esInactivo: 1,
        estado: In([
          EstadoCalendarioNomina.ABIERTA,
          EstadoCalendarioNomina.EN_PROCESO,
          EstadoCalendarioNomina.VERIFICADA,
        ]),
      },
      order: {
        fechaInicioPeriodo: 'ASC',
        id: 'ASC',
      },
    });
    expect(payrollService.reassignOrphanActionsForPayroll).toHaveBeenNthCalledWith(
      1,
      10,
      undefined,
      'cron',
    );
    expect(payrollService.reassignOrphanActionsForPayroll).toHaveBeenNthCalledWith(
      2,
      20,
      undefined,
      'cron',
    );
  });

  it('processPendingOrphansNow continues when one payroll fails', async () => {
    const { service, payrollRepo, payrollService } = buildService();

    payrollRepo.find.mockResolvedValue([{ id: 10 }, { id: 20 }]);
    payrollService.reassignOrphanActionsForPayroll
      .mockRejectedValueOnce(new Error('db timeout'))
      .mockResolvedValueOnce(4);

    const total = await service.processPendingOrphansNow();

    expect(total).toBe(4);
    expect(payrollService.reassignOrphanActionsForPayroll).toHaveBeenCalledTimes(2);
  });
});
