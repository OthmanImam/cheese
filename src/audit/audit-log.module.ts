import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { UserAuditListener } from './audit-log.listener';

/**
 * AuditLogModule
 *
 * Provides audit logging functionality for the entire application.
 *
 * Components:
 * - AuditLog entity — database model
 * - AuditLogService — business logic for persistence and queries
 * - AuditLogController — HTTP endpoints for querying logs
 * - UserAuditListener — event handler that listens to 'audit.log' events
 *
 * Usage:
 * 1. Import this module in your feature modules (e.g., UserModule)
 * 2. Emit 'audit.log' events from your services
 * 3. The listener will automatically persist them to the database
 *
 * Prerequisites (must be configured globally in AppModule):
 * - EventEmitterModule.forRoot() — for event handling
 * - TypeOrmModule.forRoot() — for database connection
 *
 * Example event emission:
 * ```typescript
 * this.eventEmitter.emit('audit.log', {
 *   action: UserAuditAction.USER_CREATED,
 *   performedBy: ctx.userId,
 *   targetUserId: user.id,
 *   ipAddress: ctx.ipAddress,
 *   userAgent: ctx.userAgent,
 *   metadata: { additionalContext: 'value' },
 *   timestamp: new Date(),
 * });
 * ```
 */
@Module({
  imports: [
    // Register AuditLog entity with TypeORM
    TypeOrmModule.forFeature([AuditLog]),
  ],
  controllers: [
    AuditLogController, // HTTP endpoints
  ],
  providers: [
    AuditLogService,      // Business logic
    UserAuditListener,    // Event listener
  ],
  exports: [
    AuditLogService,      // Export so other modules can inject it
  ],
})
export class AuditLogModule {}
