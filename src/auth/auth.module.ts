import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { User } from '../users/users.entity';
import { Passkey } from './passkey.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletService } from './wallet.service';
import { JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard } from './auth.guards';
import { UserModule } from '../users/user.module';

/**
 * AuthModule
 * 
 * Complete authentication system for the Cheese platform.
 * 
 * Features:
 * - 4-step customer signup (email/password → OTP → wallet → passkey)
 * - Email/password login
 * - Passkey (biometric) login
 * - JWT token management
 * - Session management
 * - Blockchain wallet creation
 * 
 * Components:
 * - AuthService: Business logic for signup/login
 * - WalletService: Blockchain wallet creation
 * - AuthController: HTTP endpoints
 * - JwtAuthGuard: Route protection
 * - Passkey entity: WebAuthn credentials storage
 * 
 * Prerequisites (must be configured globally in AppModule):
 * - EventEmitterModule.forRoot()
 * - RedisModule (ioredis)
 * - ConfigModule.forRoot()
 * - TypeOrmModule.forRoot()
 * 
 * Environment Variables Required:
 * - JWT_SECRET: Secret for signing JWT tokens
 * - JWT_EXPIRES_IN: Access token expiry (e.g., "15m")
 * - BLOCKCHAIN_RPC_URL: RPC endpoint for blockchain connection
 * - FACTORY_PRIVATE_KEY: Private key for wallet factory contract
 * - WALLET_FACTORY_ADDRESS: Address of the wallet factory contract
 * - RP_ID: Relying party ID for WebAuthn (your domain, e.g., "cheese.app")
 * - RP_ORIGIN: Origin for WebAuthn (e.g., "https://cheese.app")
 * - ENCRYPTION_KEY: 64-char hex string for encrypting sensitive data
 */
@Module({
  imports: [
    // Register entities
    TypeOrmModule.forFeature([User, Passkey]),

    // JWT configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),

    // Passport for strategy support (if needed in future)
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Import UserModule to access UserService
    UserModule,
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    WalletService,
    // Guards
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],

  exports: [
    AuthService,
    WalletService,
    // Export guards so other modules can use them
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
    JwtModule, // Export for other modules that need to sign tokens
  ],
})
export class AuthModule {}
