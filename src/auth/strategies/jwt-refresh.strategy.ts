import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtRefreshPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      // Refresh token submitted in request body
      jwtFromRequest:   ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtRefreshPayload,
  ): Promise<JwtRefreshPayload & { rawToken: string }> {
    const rawToken = req.body?.refreshToken;
    if (!rawToken) throw new UnauthorizedException('Refresh token missing');
    return { ...payload, rawToken };
  }
}
