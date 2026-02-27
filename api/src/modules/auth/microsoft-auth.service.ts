import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, createVerify } from 'crypto';

interface MicrosoftTokenResponse {
  token_type?: string;
  scope?: string;
  expires_in?: number;
  ext_expires_in?: number;
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface MicrosoftJwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
}

interface MicrosoftIdTokenClaims {
  aud?: string;
  iss?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  tid?: string;
  oid?: string;
  upn?: string;
  email?: string;
  preferred_username?: string;
}

interface MicrosoftJwk {
  kid: string;
  kty: string;
  n?: string;
  e?: string;
  use?: string;
  x5c?: string[];
  alg?: string;
}

interface MicrosoftJwksResponse {
  keys: MicrosoftJwk[];
}

export interface ValidatedMicrosoftIdentity {
  tenantId: string;
  objectId: string;
  login: string;
  emailDomain: string;
  accessToken?: string;
}

@Injectable()
export class MicrosoftAuthService {
  private readonly logger = new Logger(MicrosoftAuthService.name);
  private readonly jwksCache = new Map<
    string,
    { expiresAt: number; keys: MicrosoftJwk[] }
  >();

  constructor(private readonly config: ConfigService) {}

  async exchangeCodeAndValidateIdentity(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<ValidatedMicrosoftIdentity> {
    const clientId =
      this.config.get<string>('MICROSOFT_CLIENT_ID') ??
      this.config.get<string>('MSAL_CLIENT_ID');
    const clientSecret =
      this.config.get<string>('MICROSOFT_CLIENT_SECRET') ??
      this.config.get<string>('MSAL_CLIENT_SECRET');
    const tenantId =
      this.config.get<string>('MICROSOFT_TENANT_ID') ??
      this.resolveTenantIdFromAuthority();

    if (!clientId || !tenantId) {
      throw new InternalServerErrorException(
        'Configuracion Microsoft incompleta en API (clientId/tenantId)',
      );
    }
    const expectedRedirectUri =
      this.config.get<string>('MICROSOFT_REDIRECT_URI') ??
      this.config.get<string>('MSAL_REDIRECT_URI_PRODUCCION');
    if (expectedRedirectUri && expectedRedirectUri !== redirectUri) {
      throw new UnauthorizedException('Redirect URI de Microsoft invalido');
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const tokenPayload = (await tokenResponse.json()) as MicrosoftTokenResponse;
    if (!tokenResponse.ok || !tokenPayload.id_token) {
      this.logger.warn(
        `Microsoft token exchange rejected: ${tokenPayload.error ?? 'unknown_error'}`,
      );
      throw new UnauthorizedException(
        'No se pudo validar el login de Microsoft',
      );
    }

    const claims = await this.verifyMicrosoftIdToken(
      tokenPayload.id_token,
      clientId,
      tenantId,
    );

    const login = claims.preferred_username ?? claims.upn ?? claims.email;
    if (!login) {
      throw new UnauthorizedException(
        'Token Microsoft invalido: login no presente',
      );
    }

    const parsedDomain = this.extractDomain(login);
    this.validateAllowedDomain(parsedDomain);

    return {
      tenantId,
      objectId: claims.oid!,
      login: login.toLowerCase(),
      emailDomain: parsedDomain,
      accessToken: tokenPayload.access_token,
    };
  }

  private async verifyMicrosoftIdToken(
    idToken: string,
    expectedAudience: string,
    expectedTenantId: string,
  ): Promise<MicrosoftIdTokenClaims> {
    const [encodedHeader, encodedPayload, encodedSignature] =
      idToken.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException('Token Microsoft malformado');
    }

    const header = this.parseBase64Json<MicrosoftJwtHeader>(encodedHeader);
    const claims = this.parseBase64Json<MicrosoftIdTokenClaims>(encodedPayload);

    if (header.alg !== 'RS256') {
      throw new UnauthorizedException(
        'Algoritmo de token Microsoft no permitido',
      );
    }

    if (!header.kid) {
      throw new UnauthorizedException('Token Microsoft sin kid');
    }

    const now = Math.floor(Date.now() / 1000);
    if (!claims.exp || claims.exp <= now) {
      throw new UnauthorizedException('Token Microsoft expirado');
    }
    if (claims.nbf && claims.nbf > now) {
      throw new UnauthorizedException('Token Microsoft aun no valido');
    }
    if (claims.aud !== expectedAudience) {
      throw new UnauthorizedException('Audience de token Microsoft invalida');
    }
    if (claims.tid !== expectedTenantId) {
      throw new UnauthorizedException('Tenant de token Microsoft invalido');
    }

    const validIssuers = new Set([
      `https://login.microsoftonline.com/${expectedTenantId}/v2.0`,
      `https://sts.windows.net/${expectedTenantId}/`,
    ]);
    if (!claims.iss || !validIssuers.has(claims.iss)) {
      throw new UnauthorizedException('Issuer de token Microsoft invalido');
    }
    if (!claims.oid) {
      throw new UnauthorizedException('Token Microsoft sin object id (oid)');
    }

    const jwks = await this.getJwks(expectedTenantId);
    const jwk = jwks.find((k) => k.kid === header.kid && k.kty === 'RSA');
    if (!jwk) {
      throw new UnauthorizedException(
        'No se encontro llave publica de Microsoft para el token',
      );
    }

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' });
    const signature = this.base64UrlDecodeToBuffer(encodedSignature);
    const isValid = verifier.verify(publicKey, signature);

    if (!isValid) {
      throw new UnauthorizedException('Firma de token Microsoft invalida');
    }

    return claims;
  }

  private async getJwks(tenantId: string): Promise<MicrosoftJwk[]> {
    const cacheKey = tenantId;
    const cache = this.jwksCache.get(cacheKey);
    const now = Date.now();

    if (cache && cache.expiresAt > now) {
      return cache.keys;
    }

    const jwksUrl = `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`;
    const response = await fetch(jwksUrl, { method: 'GET' });
    if (!response.ok) {
      throw new UnauthorizedException('No se pudo obtener JWKS de Microsoft');
    }

    const payload = (await response.json()) as MicrosoftJwksResponse;
    if (!payload.keys || payload.keys.length === 0) {
      throw new UnauthorizedException('JWKS de Microsoft vacio');
    }

    this.jwksCache.set(cacheKey, {
      keys: payload.keys,
      expiresAt: now + 10 * 60 * 1000,
    });

    return payload.keys;
  }

  private validateAllowedDomain(domain: string): void {
    const raw =
      this.config.get<string>('MICROSOFT_ALLOWED_DOMAINS') ??
      this.config.get<string>('MSAL_ALLOWED_DOMAINS') ??
      '';
    const allowedDomains = raw
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    if (allowedDomains.length === 0) return;

    if (!allowedDomains.includes(domain.toLowerCase())) {
      throw new ForbiddenException('Dominio de cuenta Microsoft no permitido');
    }
  }

  private extractDomain(emailLike: string): string {
    const atIndex = emailLike.lastIndexOf('@');
    if (atIndex <= 0 || atIndex === emailLike.length - 1) {
      throw new UnauthorizedException('Token Microsoft sin email/UPN valido');
    }
    return emailLike.slice(atIndex + 1).toLowerCase();
  }

  private parseBase64Json<T>(base64UrlValue: string): T {
    const decoded =
      this.base64UrlDecodeToBuffer(base64UrlValue).toString('utf8');
    try {
      return JSON.parse(decoded) as T;
    } catch {
      throw new UnauthorizedException('Token Microsoft con payload invalido');
    }
  }

  private base64UrlDecodeToBuffer(value: string): Buffer {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const paddingNeeded = (4 - (normalized.length % 4)) % 4;
    const padded = `${normalized}${'='.repeat(paddingNeeded)}`;
    return Buffer.from(padded, 'base64');
  }

  private resolveTenantIdFromAuthority(): string | null {
    const authority = this.config.get<string>('MSAL_AUTHORITY');
    if (!authority) return null;

    try {
      const parsed = new URL(authority);
      const segments = parsed.pathname
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
      return segments[0] || null;
    } catch {
      return null;
    }
  }
}
