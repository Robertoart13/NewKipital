import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { COOKIE_NAME } from '../../config/cookie.config';

export interface TokenPayload {
  sub: number;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
  iat: number;
  exp: number;
}

function extractFromCookie(req: Request): string | null {
  return req?.cookies?.[COOKIE_NAME] ?? null;
}

function extractFromAuthHeader(req: Request): string | null {
  const header = req?.headers?.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => extractFromCookie(req) ?? extractFromAuthHeader(req),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: TokenPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token inválido');
    }
    return { userId: payload.sub, email: payload.email };
  }
}
