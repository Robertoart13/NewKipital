import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ENCRYPTION_PREFIX = 'enc:v1';
const DEFAULT_KID = 'default';
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

@Injectable()
export class EmployeeSensitiveDataService {
  private readonly keyring: Map<string, Buffer>;
  private readonly activeKid: string;
  private readonly activeKey: Buffer;
  private readonly hashKey: string;

  constructor(private readonly configService: ConfigService) {
    this.keyring = new Map<string, Buffer>();
    const rawKey = this.configService.get<string>('EMPLOYEE_ENCRYPTION_KEY', '').trim();
    const rawKeys = this.configService.get<string>('EMPLOYEE_ENCRYPTION_KEYS', '').trim();
    const configuredActiveKid =
      this.configService.get<string>('EMPLOYEE_ENCRYPTION_ACTIVE_KID', '').trim() || DEFAULT_KID;

    if (rawKeys) {
      const parsedKeys = this.parseKeyring(rawKeys);
      for (const [kid, key] of Object.entries(parsedKeys)) {
        this.keyring.set(kid, this.normalizeKey(key));
      }
    } else if (rawKey) {
      this.keyring.set(DEFAULT_KID, this.normalizeKey(rawKey));
    }

    if (this.keyring.size === 0) {
      const nodeEnv = this.configService.get<string>('NODE_ENV', '').trim().toLowerCase();
      const isStrictEnv = ['production', 'staging', 'provision'].includes(nodeEnv);
      if (isStrictEnv) {
        throw new Error(
          'Security configuration error: EMPLOYEE_ENCRYPTION_KEY(S) is required for this environment.',
        );
      }

      // Solo fallback de desarrollo local.
      const fallback = createHash('sha256').update('kpital-dev-employee-encryption-key').digest();
      this.keyring.set(DEFAULT_KID, fallback);
    }

    if (!this.keyring.has(configuredActiveKid)) {
      if (configuredActiveKid !== DEFAULT_KID) {
        throw new Error(
          `Security configuration error: EMPLOYEE_ENCRYPTION_ACTIVE_KID="${configuredActiveKid}" does not exist in keyring.`,
        );
      }
      // Compatibilidad: si el activeKid por defecto no existe, usar el primero cargado.
      const firstKid = this.keyring.keys().next().value as string | undefined;
      if (!firstKid) {
        throw new Error('Security configuration error: encryption keyring is empty.');
      }
      this.activeKid = firstKid;
      this.activeKey = this.keyring.get(firstKid)!;
    } else {
      this.activeKid = configuredActiveKid;
      this.activeKey = this.keyring.get(configuredActiveKid)!;
    }

    this.hashKey =
      this.configService.get<string>('EMPLOYEE_HASH_KEY', '').trim() ||
      this.activeKey.toString('base64url');
  }

  encrypt(value: string | null | undefined): string | null {
    if (value == null) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    if (this.isEncrypted(normalized)) return normalized;

    const iv = randomBytes(GCM_IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.activeKey, iv);
    const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      ENCRYPTION_PREFIX,
      this.activeKid,
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

    const [, , kidPart, ivPart, tagPart, payloadPart] = parts;
    const key = this.resolveDecryptionKey(kidPart);
    if (!key) return null;

    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64url'));
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

  private resolveDecryptionKey(kid: string): Buffer | null {
    const key = this.keyring.get(kid);
    if (key) return key;

    // Compatibilidad defensiva: si llega un KID desconocido pero existe "default", usarla.
    const defaultKey = this.keyring.get(DEFAULT_KID);
    if (defaultKey) return defaultKey;

    return null;
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

  private parseKeyring(raw: string): Record<string, string> {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('EMPLOYEE_ENCRYPTION_KEYS must be a JSON object');
      }
      const entries = Object.entries(parsed as Record<string, unknown>)
        .filter(([kid, value]) => kid.trim().length > 0 && typeof value === 'string' && value.trim().length > 0)
        .map(([kid, value]) => [kid.trim(), (value as string).trim()] as const);
      if (entries.length === 0) {
        throw new Error('EMPLOYEE_ENCRYPTION_KEYS is empty');
      }
      return Object.fromEntries(entries);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid JSON';
      throw new Error(`Security configuration error: invalid EMPLOYEE_ENCRYPTION_KEYS (${message}).`);
    }
  }

  static getEncryptedVersion(): string {
    return 'v1';
  }

  static getGcmTagLength(): number {
    return GCM_TAG_LENGTH;
  }
}
