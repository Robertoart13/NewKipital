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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractFromCookie,
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
