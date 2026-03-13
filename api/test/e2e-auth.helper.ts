import * as bcrypt from 'bcrypt';
import supertest from 'supertest';

import { AuthService } from '../src/modules/auth/auth.service';

import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface E2ELoginResult {
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  session: Record<string, unknown> | null;
  permissions: string[];
}

export interface EnsureE2ELoginOptions {
  requiredPermissions?: string[];
}

const DEFAULT_E2E_PASSWORD = 'Demo2026!';
const PREFERRED_E2E_EMAIL = 'rzuniga@roccacr.com';

function normalizePermissionCodes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
    .filter((item) => item.length > 0);
}

function hasAllPermissions(current: string[], required: string[]): boolean {
  if (!required.length) return true;
  const currentSet = new Set(current);
  return required.every((permission) => currentSet.has(permission));
}

async function resolvePermissionsForApp(
  app: INestApplication,
  accessToken: string,
  appCode = 'kpital',
): Promise<string[]> {
  const requestFactory = typeof supertest === 'function' ? supertest : (supertest as any).default;
  const server = app.getHttpServer();
  const urls = [
    `/auth/me?appCode=${encodeURIComponent(appCode)}&bypassCache=true`,
    `/api/auth/me?appCode=${encodeURIComponent(appCode)}&bypassCache=true`,
  ];
  let response: any = null;
  for (const url of urls) {
    const current = await requestFactory(server)
      .get(url)
      .set('Authorization', `Bearer ${accessToken}`);
    if (current.status === 200) {
      response = current;
      break;
    }
  }
  if (!response) {
    throw new Error('No se pudo resolver session para appCode en E2E helper.');
  }

  return normalizePermissionCodes(
    (response.body?.session as Record<string, unknown> | null)?.permissions,
  );
}

export async function ensureE2ELogin(
  app: INestApplication,
  options: EnsureE2ELoginOptions = {},
): Promise<E2ELoginResult> {
  const dataSource = app.get(DataSource);
  const configuredEmail = String(process.env.E2E_EMAIL ?? '').trim().toLowerCase();
  const forceConfiguredEmail = configuredEmail.length > 0;
  const requiredPermissions = (options.requiredPermissions ?? [])
    .map((permission) => String(permission).trim().toLowerCase())
    .filter((permission) => permission.length > 0);

  const candidateEmails: string[] = [];
  const pushCandidate = (value: unknown): void => {
    const email = String(value ?? '').trim().toLowerCase();
    if (!email) return;
    if (!candidateEmails.includes(email)) {
      candidateEmails.push(email);
    }
  };

  pushCandidate(configuredEmail);
  if (forceConfiguredEmail) {
    // Cuando E2E_EMAIL viene definido, usamos ese usuario de forma determinista.
    candidateEmails.length = 0;
    candidateEmails.push(configuredEmail);
  }

  if (!forceConfiguredEmail) {
    const preferredUsers = await dataSource.query(
      `
        SELECT email_usuario AS email
        FROM sys_usuarios
        WHERE estado_usuario = 1
          AND password_hash_usuario IS NOT NULL
          AND LOWER(email_usuario) = ?
        LIMIT 1
      `,
      [PREFERRED_E2E_EMAIL],
    );
    pushCandidate(preferredUsers?.[0]?.email);
  }

  if (!forceConfiguredEmail && requiredPermissions.length > 0) {
    const placeholders = requiredPermissions.map(() => '?').join(',');
    const privilegedUsers = await dataSource.query(
      `
        SELECT u.email_usuario AS email
        FROM sys_usuarios u
        INNER JOIN sys_usuario_rol_global urg ON urg.id_usuario = u.id_usuario
        INNER JOIN sys_rol_permiso rp ON rp.id_rol = urg.id_rol
        INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
        WHERE u.estado_usuario = 1
          AND u.password_hash_usuario IS NOT NULL
          AND p.codigo_permiso IN (${placeholders})
        GROUP BY u.id_usuario, u.email_usuario
        HAVING COUNT(DISTINCT p.codigo_permiso) = ?
        ORDER BY u.id_usuario ASC
      `,
      [...requiredPermissions, requiredPermissions.length],
    );

    for (const user of privilegedUsers as Array<{ email?: string }>) {
      pushCandidate(user.email);
    }
  }

  if (!forceConfiguredEmail) {
    const fallbackUsers = await dataSource.query(`
      SELECT email_usuario AS email
      FROM sys_usuarios
      WHERE estado_usuario = 1
        AND password_hash_usuario IS NOT NULL
      ORDER BY id_usuario ASC
      LIMIT 10
    `);
    for (const user of fallbackUsers as Array<{ email?: string }>) {
      pushCandidate(user.email);
    }
  }

  if (!candidateEmails.length) {
    throw new Error('No se encontro usuario activo con password hash para pruebas E2E');
  }

  const password = String(process.env.E2E_PASSWORD ?? '').trim().length > 0
    ? String(process.env.E2E_PASSWORD ?? '').trim()
    : DEFAULT_E2E_PASSWORD;

  const passwordHash = await bcrypt.hash(password, 10);
  const authService = app.get(AuthService);
  let lastError: unknown = null;

  for (const email of candidateEmails) {
    try {
      await dataSource.query(
        `
          UPDATE sys_usuarios
          SET password_hash_usuario = ?,
              failed_attempts_usuario = 0,
              locked_until_usuario = NULL,
              estado_usuario = 1
          WHERE email_usuario = ?
        `,
        [passwordHash, email],
      );

      const issued = await authService.login(email, password, '127.0.0.1', 'e2e-test');
      if (!issued?.accessToken) {
        lastError = new Error(`Login E2E sin accessToken para ${email}`);
        continue;
      }

      let effectivePermissions = normalizePermissionCodes(
        (issued.session as Record<string, unknown> | null)?.permissions,
      );
      if (!hasAllPermissions(effectivePermissions, requiredPermissions)) {
        try {
          effectivePermissions = await resolvePermissionsForApp(
            app,
            String(issued.accessToken),
            'kpital',
          );
        } catch {
          // keep fallback permissions from issued.session
        }
      }

      if (!hasAllPermissions(effectivePermissions, requiredPermissions) && !forceConfiguredEmail) {
        lastError = new Error(`Usuario ${email} sin permisos requeridos E2E.`);
        continue;
      }

      return {
        email,
        password,
        accessToken: String(issued.accessToken),
        refreshToken: String(issued.refreshToken ?? ''),
        session:
          issued.session && typeof issued.session === 'object'
            ? (issued.session as Record<string, unknown>)
            : null,
        permissions: effectivePermissions,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `No se pudo autenticar un usuario E2E valido. Error: ${String((lastError as Error | null)?.message ?? lastError)}`,
  );
}
