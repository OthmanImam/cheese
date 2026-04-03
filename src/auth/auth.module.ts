// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpModule } from '../otp/otp.module';
import { EmailModule } from '../email/email.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import {WalletModule} from "../wallet/wallet.module";
import { Device } from '../devices/entities/device.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { WaitlistEntry } from '../waitlist/entities/waitlist-entry.entity';
import { ReferralEvent } from '../waitlist/entities/referral-event.entity';
import { BullModule } from '@nestjs/bullmq';
import { WalletCreationProcessor } from './processors/wallet-creation.processor';


@Module({
  imports: [
    TypeOrmModule.forFeature([User, 
                              RefreshToken, 
                              Device, 
                              WaitlistEntry, 
                              ReferralEvent,  
                              BullModule.registerQueue({ name: 'wallet-creation' })]),
    PassportModule,
    JwtModule.register({}), // secrets supplied per sign() call
    OtpModule,
    BlockchainModule,
    WalletModule,
    EmailModule,
    WaitlistModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy, WalletCreationProcessor],
  exports: [AuthService, TypeOrmModule, WaitlistModule],
})
export class AuthModule {}
