import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntry } from '../users/user.types';

/**
 * UserAuditListener
 *
 * Listens to the 'audit.log' event emitted by UserService.audit()
 * and persists the entry to the database via AuditLogService.
 *
 * This decouples UserService from AuditLogService:
 * - UserService only emits events, doesn't inject AuditLogService
 * - Prevents circular dependency issues
 * - Allows multiple listeners if needed (e.g., real-time notifications)
 *
 * The event is marked as async to prevent blocking the main flow.
 */
@Injectable()
export class UserAuditListener {
  private readonly logger = new Logger(UserAuditListener.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Handle 'audit.log' events emitted from UserService.
   *
   * Event format:
   * {
   *   action: UserAuditAction,
   *   performedBy: string,
   *   targetUserId: string,
   *   ipAddress?: string,
   *   userAgent?: string,
   *   metadata?: Record<string, any>,
   *   timestamp: Date
   * }
   *
   * This method is async and non-blocking — if audit persistence fails,
   * it won't crash the main request flow.
   */
  @OnEvent('audit.log', { async: true })
  async handleAuditEvent(entry: AuditLogEntry): Promise<void> {
    this.logger.debug(
      `Received audit event: [${entry.action}] by=${entry.performedBy} target=${entry.targetUserId}`,
    );

    // Delegate to service — service.log() never throws
    await this.auditLogService.log(entry);
  }

  /**
   * Optional: Handle user deletion events to mark related audit logs
   *
   * If you want to soft-delete or flag audit logs when a user is deleted,
   * you can listen to user.deleted events here.
   *
   * This is commented out by default since audit logs are typically
   * immutable and retained even after user deletion for compliance.
   */
  // @OnEvent('user.deleted', { async: true })
  // async handleUserDeleted(payload: { userId: string }): Promise<void> {
  //   this.logger.log(`User ${payload.userId} deleted — audit logs retained`);
  //   // Optionally: Add a metadata flag to logs for this user
  // }
}