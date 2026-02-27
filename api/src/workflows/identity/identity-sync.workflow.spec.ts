import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IdentitySyncWorkflow } from './identity-sync.workflow';
import { User } from '../../modules/auth/entities/user.entity';
import { DOMAIN_EVENTS } from '../../common/events/event-names';

describe('IdentitySyncWorkflow', () => {
  let workflow: IdentitySyncWorkflow;
  let userRepo: jest.Mocked<Repository<User>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const baseUser: User = {
    id: 1,
    email: 'old.email@example.com',
    nombre: 'Test',
    apellido: 'User',
    passwordHash: 'hashed',
    avatarUrl: null,
    estado: 1,
    failedAttempts: 0,
    lastFailedAt: null,
    lastSuccessfulLoginAt: null,
    passwordUpdatedAt: new Date(),
    requiresPasswordReset: 0,
    microsoftOid: null,
    microsoftTid: null,
    creadoPor: 1,
    modificadoPor: 1,
    fechaCreacion: new Date(),
    fechaModificacion: new Date(),
  };
  const createMockUser = (): User => ({ ...baseUser });

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentitySyncWorkflow,
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    workflow = module.get<IdentitySyncWorkflow>(IdentitySyncWorkflow);
    userRepo = module.get(getRepositoryToken(User));
    eventEmitter = module.get(EventEmitter2);
  });

  describe('handleEmailChange', () => {
    it('should sync email from employee to user', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old.email@example.com',
          newEmail: 'new.email@example.com',
          changedBy: 5,
        },
      };

      userRepo.findOne.mockResolvedValueOnce(createMockUser()).mockResolvedValueOnce(null);
      userRepo.save.mockResolvedValue({ ...createMockUser(), email: 'new.email@example.com' });

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new.email@example.com',
          modificadoPor: 5,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.IDENTITY.LOGIN_UPDATED,
        expect.objectContaining({
          eventName: DOMAIN_EVENTS.IDENTITY.LOGIN_UPDATED,
          payload: expect.objectContaining({
            userId: '1',
            newEmail: 'new.email@example.com',
            previousEmail: 'old.email@example.com',
          }),
        }),
      );
    });

    it('should skip sync when employee has no user', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '', // No user linked
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          changedBy: 5,
        },
      };

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.findOne).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should skip sync when user not found', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '999',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          changedBy: 5,
        },
      };

      userRepo.findOne.mockResolvedValue(null);

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should skip sync when email already matches', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'same@example.com',
          newEmail: 'same@example.com',
          changedBy: 5,
        },
      };

      const userWithSameEmail = { ...createMockUser(), email: 'same@example.com' };
      userRepo.findOne.mockResolvedValue(userWithSameEmail);

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should skip sync when new email conflicts with existing user', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old@example.com',
          newEmail: 'existing@example.com',
          changedBy: 5,
        },
      };

      const conflictingUser = { ...createMockUser(), id: 999, email: 'existing@example.com' };
      userRepo.findOne
        .mockResolvedValueOnce(createMockUser())
        .mockResolvedValueOnce(conflictingUser);

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'OLD@EXAMPLE.COM',
          newEmail: 'NEW@EXAMPLE.COM',
          changedBy: 5,
        },
      };

      userRepo.findOne.mockResolvedValueOnce(createMockUser()).mockResolvedValueOnce(null);
      userRepo.save.mockResolvedValue({ ...createMockUser(), email: 'new@example.com' });

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com', // Lowercase
        }),
      );
    });

    it('should trim whitespace from email', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old@example.com',
          newEmail: '  new@example.com  ',
          changedBy: 5,
        },
      };

      userRepo.findOne.mockResolvedValueOnce(createMockUser()).mockResolvedValueOnce(null);
      userRepo.save.mockResolvedValue({ ...createMockUser(), email: 'new@example.com' });

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com', // Trimmed
        }),
      );
    });

    it('should emit identity.login_updated event with correct payload', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          changedBy: 5,
        },
      };

      userRepo.findOne.mockResolvedValueOnce(createMockUser()).mockResolvedValueOnce(null);
      userRepo.save.mockResolvedValue({ ...createMockUser(), email: 'new@example.com' });

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DOMAIN_EVENTS.IDENTITY.LOGIN_UPDATED,
        {
          eventName: DOMAIN_EVENTS.IDENTITY.LOGIN_UPDATED,
          occurredAt: expect.any(Date),
          payload: {
            userId: '1',
            previousEmail: 'old.email@example.com',
            newEmail: 'new@example.com',
            updatedBy: 5,
            trigger: 'employee.email_changed',
          },
        },
      );
    });

    it('should handle multiple sync requests for the same user', async () => {
      // Arrange
      const event1 = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old@example.com',
          newEmail: 'temp@example.com',
          changedBy: 5,
        },
      };

      const event2 = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'temp@example.com',
          newEmail: 'final@example.com',
          changedBy: 5,
        },
      };

      userRepo.findOne
        .mockResolvedValueOnce(createMockUser())
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...createMockUser(), email: 'temp@example.com' })
        .mockResolvedValueOnce(null);

      userRepo.save
        .mockResolvedValueOnce({ ...createMockUser(), email: 'temp@example.com' })
        .mockResolvedValueOnce({ ...createMockUser(), email: 'final@example.com' });

      // Act
      await workflow.handleEmailChange(event1);
      await workflow.handleEmailChange(event2);

      // Assert
      expect(userRepo.save).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    });

    it('should not throw error when event handling fails', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          changedBy: 5,
        },
      };

      userRepo.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(workflow.handleEmailChange(event)).rejects.toThrow('Database error');
    });

    it('should update modificadoPor to changedBy user', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          changedBy: 42,
        },
      };

      userRepo.findOne.mockResolvedValueOnce(createMockUser()).mockResolvedValueOnce(null);
      userRepo.save.mockResolvedValue({ ...createMockUser(), email: 'new@example.com' });

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          modificadoPor: 42,
        }),
      );
    });

    it('should preserve other user properties when syncing email', async () => {
      // Arrange
      const event = {
        payload: {
          employeeId: '10',
          userId: '1',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          changedBy: 5,
        },
      };

      const userWithData = {
        ...createMockUser(),
        nombre: 'John',
        apellido: 'Doe',
        passwordHash: 'secret-hash',
        failedAttempts: 3,
      };

      userRepo.findOne.mockResolvedValueOnce(userWithData).mockResolvedValueOnce(null);
      userRepo.save.mockResolvedValue({ ...userWithData, email: 'new@example.com' });

      // Act
      await workflow.handleEmailChange(event);

      // Assert
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'John',
          apellido: 'Doe',
          passwordHash: 'secret-hash',
          failedAttempts: 3,
        }),
      );
    });
  });
});
