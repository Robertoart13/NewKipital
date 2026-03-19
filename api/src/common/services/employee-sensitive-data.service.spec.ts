import { EmployeeSensitiveDataService } from './employee-sensitive-data.service';

import type { ConfigService } from '@nestjs/config';

describe('EmployeeSensitiveDataService', () => {
  let service: EmployeeSensitiveDataService;
  let config: Record<string, string>;

  beforeEach(() => {
    config = {};
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue ?? ''),
    } as unknown as ConfigService;
    service = new EmployeeSensitiveDataService(configService);
  });

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a value', () => {
      const original = 'test@example.com';
      const encrypted = service.encrypt(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain('enc:v1');
      expect(service.decrypt(encrypted)).toBe(original);
    });

    it('should return null for null/undefined input', () => {
      expect(service.encrypt(null)).toBeNull();
      expect(service.encrypt(undefined)).toBeNull();
      expect(service.decrypt(null)).toBeNull();
      expect(service.decrypt(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(service.encrypt('')).toBeNull();
      expect(service.encrypt('   ')).toBeNull();
    });

    it('should not double-encrypt', () => {
      const original = 'sensitive data';
      const encrypted = service.encrypt(original)!;
      const doubleEncrypted = service.encrypt(encrypted);
      expect(doubleEncrypted).toBe(encrypted);
    });

    it('should return different ciphertext each time (random IV)', () => {
      const val = 'same-value';
      const a = service.encrypt(val);
      const b = service.encrypt(val);
      expect(a).not.toBe(b);
      expect(service.decrypt(a)).toBe(val);
      expect(service.decrypt(b)).toBe(val);
    });
  });

  describe('isEncrypted', () => {
    it('should detect encrypted values', () => {
      const encrypted = service.encrypt('hello')!;
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(service.isEncrypted('hello')).toBe(false);
      expect(service.isEncrypted(null)).toBe(false);
      expect(service.isEncrypted(undefined)).toBe(false);
    });
  });

  describe('hashEmail / hashCedula', () => {
    it('should produce consistent hashes', () => {
      const h1 = service.hashEmail('Test@Example.com');
      const h2 = service.hashEmail('test@example.com');
      expect(h1).toBe(h2);
    });

    it('should return null for empty input', () => {
      expect(service.hashEmail(null)).toBeNull();
      expect(service.hashEmail(undefined)).toBeNull();
    });
  });

  describe('decrypt with corrupted data', () => {
    it('should return null for malformed encrypted string', () => {
      expect(service.decrypt('enc:v1:bad:data')).toBeNull();
    });

    it('should return plaintext for non-encrypted value', () => {
      expect(service.decrypt('plaintext-value')).toBe('plaintext-value');
    });
  });

  describe('key rotation and strict config', () => {
    it('should encrypt using active kid from keyring and decrypt with same keyring', () => {
      config = {
        EMPLOYEE_ENCRYPTION_KEYS: JSON.stringify({
          k202603: 'first-key',
          k202604: 'second-key',
        }),
        EMPLOYEE_ENCRYPTION_ACTIVE_KID: 'k202604',
      };
      const configService = {
        get: jest.fn((key: string, defaultValue?: string) => config[key] ?? defaultValue ?? ''),
      } as unknown as ConfigService;
      const rotatedService = new EmployeeSensitiveDataService(configService);

      const encrypted = rotatedService.encrypt('sensitive');
      expect(encrypted).toContain('enc:v1:k202604:');
      expect(rotatedService.decrypt(encrypted)).toBe('sensitive');
    });

    it('should decrypt data encrypted with old kid when keyring includes that kid', () => {
      const configOld = {
        EMPLOYEE_ENCRYPTION_KEYS: JSON.stringify({
          old: 'old-key',
          new: 'new-key',
        }),
        EMPLOYEE_ENCRYPTION_ACTIVE_KID: 'old',
      };
      const oldConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => configOld[key] ?? defaultValue ?? ''),
      } as unknown as ConfigService;
      const oldService = new EmployeeSensitiveDataService(oldConfigService);
      const encryptedWithOldKid = oldService.encrypt('legacy-data')!;

      const configNew = {
        EMPLOYEE_ENCRYPTION_KEYS: JSON.stringify({
          old: 'old-key',
          new: 'new-key',
        }),
        EMPLOYEE_ENCRYPTION_ACTIVE_KID: 'new',
      };
      const newConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => configNew[key] ?? defaultValue ?? ''),
      } as unknown as ConfigService;
      const newService = new EmployeeSensitiveDataService(newConfigService);

      expect(newService.decrypt(encryptedWithOldKid)).toBe('legacy-data');
    });

    it('should throw in production when no encryption key is provided', () => {
      const strictConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'NODE_ENV') return 'production';
          return defaultValue ?? '';
        }),
      } as unknown as ConfigService;

      expect(() => new EmployeeSensitiveDataService(strictConfigService)).toThrow(
        'Security configuration error: EMPLOYEE_ENCRYPTION_KEY(S) is required for this environment.',
      );
    });
  });
});
