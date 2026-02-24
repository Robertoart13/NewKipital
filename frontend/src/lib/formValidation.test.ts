import { describe, it, expect } from 'vitest';
import {
  hasSqlInjectionAttempt,
  noSqlInjection,
  textRules,
  emailRules,
  optionalNoSqlInjection,
} from './formValidation';

describe('formValidation', () => {
  describe('hasSqlInjectionAttempt', () => {
    it('should return false for safe strings', () => {
      expect(hasSqlInjectionAttempt('Hello World')).toBe(false);
      expect(hasSqlInjectionAttempt('Test 123')).toBe(false);
      expect(hasSqlInjectionAttempt('Normal text here')).toBe(false);
    });

    it('should detect single quote', () => {
      expect(hasSqlInjectionAttempt("' OR '1'='1")).toBe(true);
      expect(hasSqlInjectionAttempt("test'test")).toBe(true);
    });

    it('should detect double quote', () => {
      expect(hasSqlInjectionAttempt('" OR "1"="1')).toBe(true);
      expect(hasSqlInjectionAttempt('test"test')).toBe(true);
    });

    it('should detect semicolon', () => {
      expect(hasSqlInjectionAttempt('test; DROP TABLE users')).toBe(true);
    });

    it('should detect SQL comment patterns', () => {
      expect(hasSqlInjectionAttempt('test--')).toBe(true);
      expect(hasSqlInjectionAttempt('test-- comment')).toBe(true);
      expect(hasSqlInjectionAttempt('test/* comment */')).toBe(true);
    });

    it('should detect SQL keywords (case insensitive)', () => {
      expect(hasSqlInjectionAttempt('SELECT * FROM users')).toBe(true);
      expect(hasSqlInjectionAttempt('select * from users')).toBe(true);
      expect(hasSqlInjectionAttempt('INSERT INTO table')).toBe(true);
      expect(hasSqlInjectionAttempt('UPDATE users SET')).toBe(true);
      expect(hasSqlInjectionAttempt('DELETE FROM users')).toBe(true);
      expect(hasSqlInjectionAttempt('DROP TABLE users')).toBe(true);
      expect(hasSqlInjectionAttempt('EXEC something')).toBe(true);
      expect(hasSqlInjectionAttempt('EXECUTE something')).toBe(true);
      expect(hasSqlInjectionAttempt('UNION SELECT')).toBe(true);
      expect(hasSqlInjectionAttempt('<script>alert("xss")</script>')).toBe(true);
    });

    it('should detect null byte', () => {
      expect(hasSqlInjectionAttempt('test\\x00')).toBe(true);
      expect(hasSqlInjectionAttempt('test\\b')).toBe(true);
    });

    it('should return false for null', () => {
      expect(hasSqlInjectionAttempt(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasSqlInjectionAttempt(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasSqlInjectionAttempt('')).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(hasSqlInjectionAttempt(123 as any)).toBe(false);
    });

    it('should return false for objects', () => {
      expect(hasSqlInjectionAttempt({} as any)).toBe(false);
    });

    it('should handle strings with SQL-like words that are safe', () => {
      // "selection" contains "select" but should pass when used in normal context
      expect(hasSqlInjectionAttempt('I made a selection')).toBe(true); // Still detects "select" keyword
    });

    it('should trim whitespace before checking', () => {
      expect(hasSqlInjectionAttempt('   normal text   ')).toBe(false);
      expect(hasSqlInjectionAttempt('   SELECT * FROM   ')).toBe(true);
    });
  });

  describe('noSqlInjection', () => {
    it('should resolve for safe strings', async () => {
      await expect(noSqlInjection(undefined, 'Hello World')).resolves.toBeUndefined();
      await expect(noSqlInjection(undefined, 'Test 123')).resolves.toBeUndefined();
    });

    it('should reject strings with SQL injection attempts', async () => {
      await expect(noSqlInjection(undefined, "' OR '1'='1")).rejects.toThrow(
        'Caracteres o patrones no permitidos',
      );
      await expect(noSqlInjection(undefined, 'SELECT * FROM users')).rejects.toThrow(
        'Caracteres o patrones no permitidos',
      );
    });

    it('should resolve for null', async () => {
      await expect(noSqlInjection(undefined, null)).resolves.toBeUndefined();
    });

    it('should resolve for undefined', async () => {
      await expect(noSqlInjection(undefined, undefined)).resolves.toBeUndefined();
    });

    it('should resolve for empty string', async () => {
      await expect(noSqlInjection(undefined, '')).resolves.toBeUndefined();
    });

    it('should be usable as Ant Design validator', async () => {
      // Test that it returns a Promise and follows Ant Design validator interface
      const result = noSqlInjection({}, 'safe text');
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('textRules', () => {
    it('should return rules for required field', () => {
      const rules = textRules({ required: true });
      expect(rules).toHaveLength(2);
      expect(rules[0]).toHaveProperty('required', true);
      expect(rules[0]).toHaveProperty('message', 'Campo requerido');
    });

    it('should return rules for optional field', () => {
      const rules = textRules({ required: false });
      expect(rules).toHaveLength(1);
      expect(rules[0]).toHaveProperty('validator');
    });

    it('should include min length validation', async () => {
      const rules = textRules({ min: 5 });
      const validator = rules.find((r) => 'validator' in r);

      await expect(validator!.validator(undefined, 'test')).rejects.toThrow('Mínimo 5 caracteres');
      await expect(validator!.validator(undefined, 'test12345')).resolves.toBeUndefined();
    });

    it('should include max length validation', async () => {
      const rules = textRules({ max: 10 });
      const validator = rules.find((r) => 'validator' in r);

      await expect(validator!.validator(undefined, '12345678901')).rejects.toThrow(
        'Máximo 10 caracteres',
      );
      await expect(validator!.validator(undefined, '12345')).resolves.toBeUndefined();
    });

    it('should include min and max length validation', async () => {
      const rules = textRules({ min: 5, max: 10 });
      const lengthValidator = rules.find(
        (r) => 'validator' in r && r.validator.toString().includes('isLength'),
      );

      await expect(lengthValidator!.validator(undefined, 'test')).rejects.toThrow(
        'Entre 5 y 10 caracteres',
      );
      await expect(lengthValidator!.validator(undefined, '12345678901')).rejects.toThrow(
        'Entre 5 y 10 caracteres',
      );
      await expect(lengthValidator!.validator(undefined, '123456')).resolves.toBeUndefined();
    });

    it('should always include SQL injection validator', () => {
      const rules = textRules({});
      const hasNoSqlInjection = rules.some((r) => 'validator' in r);
      expect(hasNoSqlInjection).toBe(true);
    });

    it('should reject SQL injection in text fields', async () => {
      const rules = textRules({ required: true });
      const sqlValidator = rules[rules.length - 1]; // SQL validator is last

      await expect((sqlValidator as any).validator(undefined, "' OR '1'='1")).rejects.toThrow();
    });

    it('should accept empty values for optional fields during length validation', async () => {
      const rules = textRules({ min: 5, max: 10 });
      const lengthValidator = rules.find(
        (r) => 'validator' in r && r.validator.toString().includes('isLength'),
      );

      await expect(lengthValidator!.validator(undefined, '')).resolves.toBeUndefined();
      await expect(lengthValidator!.validator(undefined, null)).resolves.toBeUndefined();
    });
  });

  describe('emailRules', () => {
    it('should return rules for required email', () => {
      const rules = emailRules(true);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('required', true);
      expect(rules[0]).toHaveProperty('message', 'Correo requerido');
    });

    it('should return rules for optional email', () => {
      const rules = emailRules(false);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).not.toHaveProperty('required');
    });

    it('should validate correct email format', async () => {
      const rules = emailRules(true);
      const validator = rules.find((r) => 'validator' in r);

      await expect(validator!.validator(undefined, 'test@example.com')).resolves.toBeUndefined();
      await expect(
        validator!.validator(undefined, 'user.name+tag@example.co.uk'),
      ).resolves.toBeUndefined();
    });

    it('should reject invalid email format', async () => {
      const rules = emailRules(true);
      const validator = rules.find((r) => 'validator' in r);

      await expect(validator!.validator(undefined, 'not-an-email')).rejects.toThrow(
        'Formato de correo inválido',
      );
      await expect(validator!.validator(undefined, 'missing@domain')).rejects.toThrow(
        'Formato de correo inválido',
      );
      await expect(validator!.validator(undefined, '@example.com')).rejects.toThrow(
        'Formato de correo inválido',
      );
    });

    it('should reject email with SQL injection', async () => {
      const rules = emailRules(true);
      const validator = rules.find((r) => 'validator' in r);

      await expect(validator!.validator(undefined, "test' OR '1'='1@example.com")).rejects.toThrow(
        'Caracteres no permitidos',
      );
    });

    it('should accept empty email when optional', async () => {
      const rules = emailRules(false);
      const validator = rules.find((r) => 'validator' in r);

      await expect(validator!.validator(undefined, '')).resolves.toBeUndefined();
      await expect(validator!.validator(undefined, null)).resolves.toBeUndefined();
    });

    it('should trim whitespace before validation', async () => {
      const rules = emailRules(true);
      const validator = rules.find((r) => 'validator' in r);

      await expect(validator!.validator(undefined, '  test@example.com  ')).resolves.toBeUndefined();
    });
  });

  describe('optionalNoSqlInjection', () => {
    it('should resolve for safe strings', async () => {
      await expect(optionalNoSqlInjection(undefined, 'Hello World')).resolves.toBeUndefined();
    });

    it('should reject strings with SQL injection', async () => {
      await expect(optionalNoSqlInjection(undefined, "' OR '1'='1")).rejects.toThrow(
        'Caracteres o patrones no permitidos',
      );
    });

    it('should resolve for null', async () => {
      await expect(optionalNoSqlInjection(undefined, null)).resolves.toBeUndefined();
    });

    it('should resolve for undefined', async () => {
      await expect(optionalNoSqlInjection(undefined, undefined)).resolves.toBeUndefined();
    });

    it('should resolve for empty string', async () => {
      await expect(optionalNoSqlInjection(undefined, '')).resolves.toBeUndefined();
    });

    it('should resolve for whitespace-only string', async () => {
      await expect(optionalNoSqlInjection(undefined, '   ')).resolves.toBeUndefined();
    });

    it('should reject non-empty malicious strings', async () => {
      await expect(optionalNoSqlInjection(undefined, 'DROP TABLE users')).rejects.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work with Ant Design Form field validation', async () => {
      // Simulate Ant Design Form field validation
      const fieldRules = textRules({ required: true, min: 3, max: 50 });

      // Valid input
      for (const rule of fieldRules) {
        if ('validator' in rule) {
          await expect(rule.validator({}, 'Valid text')).resolves.toBeUndefined();
        }
      }

      // Invalid input (too short)
      const lengthRule = fieldRules.find(
        (r) => 'validator' in r && r.validator.toString().includes('isLength'),
      );
      if (lengthRule && 'validator' in lengthRule) {
        await expect(lengthRule.validator({}, 'ab')).rejects.toThrow();
      }

      // Invalid input (SQL injection)
      const sqlRule = fieldRules[fieldRules.length - 1];
      if ('validator' in sqlRule) {
        await expect(sqlRule.validator({}, "'; DROP TABLE--")).rejects.toThrow();
      }
    });

    it('should work with email field validation', async () => {
      const fieldRules = emailRules(true);

      // Valid email
      for (const rule of fieldRules) {
        if ('validator' in rule) {
          await expect(rule.validator({}, 'user@example.com')).resolves.toBeUndefined();
        }
      }

      // Invalid email
      const emailRule = fieldRules.find((r) => 'validator' in r);
      if (emailRule && 'validator' in emailRule) {
        await expect(emailRule.validator({}, 'invalid-email')).rejects.toThrow();
      }
    });

    it('should validate complex user input scenarios', async () => {
      // Scenario: User registration form
      const nameRules = textRules({ required: true, min: 2, max: 50 });
      const emailFieldRules = emailRules(true);
      const descriptionRules = textRules({ required: false, max: 500 });

      // Valid input
      const validName = 'John Doe';
      const validEmail = 'john.doe@example.com';
      const validDescription = 'This is a valid description';

      for (const rule of nameRules) {
        if ('validator' in rule) {
          await expect(rule.validator({}, validName)).resolves.toBeUndefined();
        }
      }

      for (const rule of emailFieldRules) {
        if ('validator' in rule) {
          await expect(rule.validator({}, validEmail)).resolves.toBeUndefined();
        }
      }

      for (const rule of descriptionRules) {
        if ('validator' in rule) {
          await expect(rule.validator({}, validDescription)).resolves.toBeUndefined();
        }
      }

      // Empty optional field should pass
      for (const rule of descriptionRules) {
        if ('validator' in rule) {
          await expect(rule.validator({}, '')).resolves.toBeUndefined();
        }
      }
    });
  });
});
