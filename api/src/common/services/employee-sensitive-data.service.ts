import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

const ENCRYPTION_PREFIX = 'enc:v1';
const DEFAULT_KID = 'default';
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

@Injectable()
export class EmployeeSensitiveDataService {
  private readonly key: Buffer;
  private readonly hashKey: string;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('EMPLOYEE_ENCRYPTION_KEY', '').trim();
    if (!rawKey) {
      const fallback = createHash('sha256')
        .update('kpital-dev-employee-encryption-key')
        .digest();
      this.key = fallback;
    } else {
      this.key = this.normalizeKey(rawKey);
    }
    this.hashKey =
      this.configService.get<string>('EMPLOYEE_HASH_KEY', '').trim() || this.key.toString('base64url');
  }

  encrypt(value: string | null | undefined): string | null {
    if (value == null) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (this.isEncrypted(normalized)) return normalized;

    const iv = randomBytes(GCM_IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      ENCRYPTION_PREFIX,
      DEFAULT_KID,
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  decrypt(value: string | null | undefined): string | null {
    if (value == null) return null;
    if (!this.isEncrypted(value)) return value;

    const parts = value.split(':');
    if (parts.length !== 6) return null;

    const [, , , ivPart, tagPart, payloadPart] = parts;
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(ivPart, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(payloadPart, 'base64url')),
        decipher.final(),
      ]);
      return plain.toString('utf8');
    } catch {
      return null;
    }
  }

  isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    return value.startsWith(`${ENCRYPTION_PREFIX}:`);
  }

  hashEmail(value: string | null | undefined): string | null {
    if (!value) return null;
    return this.hash(value.trim().toLowerCase());
  }

  hashCedula(value: string | null | undefined): string | null {
    if (!value) return null;
    return this.hash(value.trim());
  }

  private hash(raw: string): string {
    return createHmac('sha256', this.hashKey).update(raw).digest('hex');
  }

  private normalizeKey(rawKey: string): Buffer {
    const clean = rawKey.trim();
    const isHex = /^[0-9a-fA-F]{64}$/.test(clean);
    if (isHex) return Buffer.from(clean, 'hex');

    const maybeBase64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    try {
      const decoded = Buffer.from(maybeBase64, 'base64');
      if (decoded.length === 32) return decoded;
    } catch {
      // no-op
    }

    const hashed = createHash('sha256').update(clean).digest();
    return hashed.subarray(0, 32);
  }

  static getEncryptedVersion(): string {
    return 'v1';
  }

  static getGcmTagLength(): number {
    return GCM_TAG_LENGTH;
  }
}
