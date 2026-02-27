import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './users.entity'; // ← Changed from './user.entity' to match your import
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuditLogModule } from '../audit/audit-log.module';
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
} from '../auth/auth.guards';

/**
 * UserModule
 *
 * Wires together:
 *   - UserService + UserController
 *   - AuditLogModule (for event-driven audit persistence)
 *   - JwtModule (for guard token verification)
 *   - Guards exported so other modules can use them without re-importing
 *
 * Prerequisites (registered globally at AppModule level):
 *   - EventEmitterModule.forRoot()
 *   - RedisModule (ioredis) — provides @InjectRedis()
 *   - ConfigModule.forRoot()
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),

    // JWT — guards need JwtService for token verification
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

    // Audit log persistence — listens to 'audit.log' events
    AuditLogModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    // Guards registered as providers so they can inject dependencies
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    UserService,
    // Export guards so AuthModule and other modules can use them
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RolesGuard,
  ],
})
export class UserModule {}