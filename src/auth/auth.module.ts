import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { WaitlistTokenService } from './services/waitlist-token.service';
import { UsersService } from './services/users.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { Otp } from '../otp/entities/otp.entity';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { Referral } from '../referrals/entities/referral.entity';
import { WaitlistReservation } from '../waitlist/entities/waitlist-reservation.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // Secrets injected per-call via ConfigService
    TypeOrmModule.forFeature([
      User,
      Otp,
      RefreshToken,
      Referral,
      WaitlistReservation,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    WaitlistTokenService,
    UsersService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    UsersService,
    JwtAuthGuard,
    TypeOrmModule,
  ],
})
export class AuthModule {}
