import { UserAssignmentService } from './user-assignment.service';

type MockRepo = {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  query: jest.Mock;
  count: jest.Mock;
};

function createMockRepo(): MockRepo {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value),
    query: jest.fn(),
    count: jest.fn(),
  };
}

describe('UserAssignmentService', () => {
  it('reactiva rol global existente inactivo sin intentar insertar duplicado', async () => {
    const userRepo = createMockRepo();
    const userAppRepo = createMockRepo();
    const userCompanyRepo = createMockRepo();
    const userRoleRepo = createMockRepo();
    const userRoleGlobalRepo = createMockRepo();
    const userRoleExclusionRepo = createMockRepo();
    const userPermOverrideRepo = createMockRepo();
    const userPermGlobalDenyRepo = createMockRepo();
    const appRepo = createMockRepo();
    const roleRepo = createMockRepo();
    const permRepo = createMockRepo();

    const auditOutbox = { publish: jest.fn() } as any;
    const authzVersionService = { bumpUsers: jest.fn().mockResolvedValue(undefined) } as any;
    const authzRealtime = { notifyUsers: jest.fn() } as any;

    const service = new UserAssignmentService(
      userRepo as any,
      userAppRepo as any,
      userCompanyRepo as any,
      userRoleRepo as any,
      userRoleGlobalRepo as any,
      userRoleExclusionRepo as any,
      userPermOverrideRepo as any,
      userPermGlobalDenyRepo as any,
      appRepo as any,
      roleRepo as any,
      permRepo as any,
      auditOutbox,
      authzVersionService,
      authzRealtime,
    );

    jest.spyOn(service as any, 'assertUserCanBeMutated').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'resolveAppId').mockResolvedValue(1);
    jest.spyOn(service as any, 'getRoleLabels').mockResolvedValue(['Master Administrator (MASTER)']);
    jest.spyOn(service as any, 'getUserLabel').mockResolvedValue('Usuario Test (ID 2)');
    jest.spyOn(service as any, 'publishAudit').mockImplementation(() => undefined);
    jest.spyOn(service as any, 'bumpUserAuthz').mockResolvedValue(undefined);

    roleRepo.find.mockResolvedValue([{ id: 5, estado: 1, idApp: 1 }]);
    userRoleGlobalRepo.find.mockResolvedValue([
      {
        id: 10,
        idUsuario: 2,
        idApp: 1,
        idRol: 5,
        estado: 0,
        creadoPor: 1,
        modificadoPor: 1,
      },
    ]);
    userRoleGlobalRepo.save.mockImplementation(async (v) => v);

    const result = await service.replaceUserGlobalRoles(2, 'kpital', [5], 1);

    expect(result).toEqual({ appCode: 'kpital', roleIds: [5] });
    expect(userRoleGlobalRepo.create).not.toHaveBeenCalled();
    expect(userRoleGlobalRepo.save).toHaveBeenCalledTimes(1);
    expect(userRoleGlobalRepo.save.mock.calls[0][0]).toMatchObject({
      id: 10,
      idRol: 5,
      estado: 1,
      modificadoPor: 1,
    });
  });

  it('reactiva denegacion global existente inactiva sin insertar duplicado', async () => {
    const userRepo = createMockRepo();
    const userAppRepo = createMockRepo();
    const userCompanyRepo = createMockRepo();
    const userRoleRepo = createMockRepo();
    const userRoleGlobalRepo = createMockRepo();
    const userRoleExclusionRepo = createMockRepo();
    const userPermOverrideRepo = createMockRepo();
    const userPermGlobalDenyRepo = createMockRepo();
    const appRepo = createMockRepo();
    const roleRepo = createMockRepo();
    const permRepo = createMockRepo();

    const auditOutbox = { publish: jest.fn() } as any;
    const authzVersionService = { bumpUsers: jest.fn().mockResolvedValue(undefined) } as any;
    const authzRealtime = { notifyUsers: jest.fn() } as any;

    const service = new UserAssignmentService(
      userRepo as any,
      userAppRepo as any,
      userCompanyRepo as any,
      userRoleRepo as any,
      userRoleGlobalRepo as any,
      userRoleExclusionRepo as any,
      userPermOverrideRepo as any,
      userPermGlobalDenyRepo as any,
      appRepo as any,
      roleRepo as any,
      permRepo as any,
      auditOutbox,
      authzVersionService,
      authzRealtime,
    );

    jest.spyOn(service as any, 'assertUserCanBeMutated').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'resolveAppId').mockResolvedValue(1);
    jest.spyOn(service as any, 'getUserLabel').mockResolvedValue('Usuario Test (ID 2)');
    jest.spyOn(service as any, 'publishAudit').mockImplementation(() => undefined);
    jest.spyOn(service as any, 'bumpUserAuthz').mockResolvedValue(undefined);

    permRepo.find
      .mockResolvedValueOnce([{ id: 90, codigo: 'payroll-article:create', estado: 1 }]) // resolve normalized deny
      .mockResolvedValueOnce([{ id: 90, codigo: 'payroll-article:create', estado: 1 }]) // before labels by id
      .mockResolvedValueOnce([{ id: 90, codigo: 'payroll-article:create', estado: 1 }]); // getGlobalPermissionDenials

    userPermGlobalDenyRepo.find
      .mockResolvedValueOnce([
        {
          id: 15,
          idUsuario: 2,
          idApp: 1,
          idPermiso: 90,
          estado: 0,
          creadoPor: 1,
          modificadoPor: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 15,
          idUsuario: 2,
          idApp: 1,
          idPermiso: 90,
          estado: 1,
          creadoPor: 1,
          modificadoPor: 1,
        },
      ]);
    userPermGlobalDenyRepo.save.mockImplementation(async (v) => v);

    const result = await service.replaceGlobalPermissionDenials(
      2,
      'kpital',
      ['payroll-article:create'],
      1,
    );

    expect(result).toEqual({ appCode: 'kpital', deny: ['payroll-article:create'] });
    expect(userPermGlobalDenyRepo.create).not.toHaveBeenCalled();
    expect(userPermGlobalDenyRepo.save).toHaveBeenCalledTimes(1);
    expect(userPermGlobalDenyRepo.save.mock.calls[0][0]).toMatchObject({
      id: 15,
      idPermiso: 90,
      estado: 1,
      modificadoPor: 1,
    });
  });
});
