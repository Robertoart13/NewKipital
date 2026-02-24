import type { PlatformApp } from '../../../common/constants/apps';

/**
 * Payload que viaja dentro del JWT.
 * Token único para toda la plataforma (KPITAL + TimeWise).
 * La identidad es única; la autorización es contextual.
 */
export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  enabledApps: PlatformApp[];
  companyIds: string[];
  iat?: number;
  exp?: number;
}
