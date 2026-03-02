import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalActionsHygieneService } from './personal-actions-hygiene.service';
import { PersonalAction } from './entities/personal-action.entity';
import { PersonalActionAutoInvalidationService } from './personal-action-auto-invalidation.service';

describe('PersonalActionsHygieneService', () => {
  let service: PersonalActionsHygieneService;
  let repo: jest.Mocked<Repository<PersonalAction>>;

  beforeEach(async () => {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 3 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalActionsHygieneService,
        {
          provide: PersonalActionAutoInvalidationService,
          useValue: {
            run: jest.fn().mockResolvedValue({
              totalInvalidated: 6,
              byReason: {
                TERMINATION_EFFECTIVE: 2,
                COMPANY_MISMATCH: 1,
                CURRENCY_MISMATCH: 3,
                MANUAL_INVALIDATION: 0,
              },
              sampleActionIds: [10, 11],
            }),
          },
        },
        {
          provide: getRepositoryToken(PersonalAction),
          useValue: {
            createQueryBuilder: jest.fn(() => qb),
          },
        },
      ],
    }).compile();

    service = module.get(PersonalActionsHygieneService);
    repo = module.get(getRepositoryToken(PersonalAction));
  });

  it('expires approved actions out of effective range and not consumed', async () => {
    const affected = await service.expireApprovedActionsPastEffectiveEndNow();
    expect(affected).toBe(3);
    expect(repo.createQueryBuilder).toHaveBeenCalled();
  });

  it('invalidates only approved non-consumed actions by employee context', async () => {
    const result = await service.invalidateApprovedActionsByEmployeeContextNow();
    expect(result).toEqual({
      termination: 2,
      companyMismatch: 1,
      currencyMismatch: 3,
      total: 6,
    });
  });
});
