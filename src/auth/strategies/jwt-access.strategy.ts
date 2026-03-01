import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../users/entities/user.entity';
import { JwtAccessPayload } from '../types/jwt-payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Called after Passport verifies the JWT signature and expiry.
   * We do a DB lookup on every request to:
   *   - Catch suspended/banned accounts mid-session
   *   - Ensure the user still exists (deletion edge cases)
   *
   * For extreme scale: replace with Redis-cached user status lookup
   * instead of hitting Postgres on every request.
   */
  async validate(payload: JwtAccessPayload): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });

    if (!user)                              throw new UnauthorizedException({ code: 'INVALID_TOKEN' });
    if (user.status !== UserStatus.ACTIVE)  throw new UnauthorizedException({ code: 'ACCOUNT_INACTIVE' });
    if (user.isLocked)                      throw new UnauthorizedException({ code: 'ACCOUNT_LOCKED' });

    return user; // Attached to request.user
  }
}
