// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly rtRepo: Repository<RefreshToken>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] || null,
      ]),
      secretOrKey: config.get<string>('jwt.refreshSecret'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: { sub: string },
  ): Promise<{ user: User; tokenHash: string }> {
    const rawToken = req.cookies?.['refresh_token'];
    if (!rawToken) throw new UnauthorizedException('No refresh token');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const stored = await this.rtRepo.findOne({
      where: { tokenHash, isRevoked: false },
      relations: ['user'],
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    return { user: stored.user, tokenHash };
  }
}
