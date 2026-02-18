import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { AuditLog } from './audit-log.entity';
import {
  AuditLogQueryDto,
  AuditLogResponseDto,
  PaginatedAuditLogsResponseDto,
} from './audit-log.dto';
import { AuditLogEntry, RequestContext } from '../users/user.types';
import { UserRole } from '../users/users.entity';
import {
  CrossMerchantAccessException,
  InsufficientPermissionsException,
} from '../users/user.exceptions';

/**
 * AuditLogService
 *
 * Handles persistence and querying of audit logs.
 *
 * Key principles:
 * - log() method NEVER throws — audit failures must not break main flow
 * - All queries enforce merchant scoping for non-super-admins
 * - Results always ordered newest-first for dashboard UX
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Persist a single audit log entry.
   *
   * CRITICAL: This method NEVER throws. Audit logging is a side effect
   * and must not break the main business operation.
   *
   * Called by:
   * - UserAuditListener via @OnEvent('audit.log')
   * - Can also be called directly if needed
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Extract merchantId from metadata if present
      const merchantId = entry.metadata?.merchantId ?? null;

      const record = this.auditLogRepository.create({
        action: entry.action,
        performedBy: entry.performedBy,
        targetUserId: entry.targetUserId,
        merchantId,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata ?? null,
      });

      await this.auditLogRepository.save(record);

      this.logger.debug(
        `Audit log persisted: [${entry.action}] by=${entry.performedBy} target=${entry.targetUserId}`,
      );
    } catch (error) {
      // Swallow all errors — audit failure must never propagate
      this.logger.warn(
        `Failed to persist audit log entry [${entry.action}] for user ${entry.targetUserId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Query audit logs with flexible filtering and pagination.
   * 
   * Access rules:
   * - SUPER_ADMIN: Unrestricted access to all logs
   * - Merchant-scoped roles: Can only query their own merchantId
   * - Results paginated and ordered newest-first
   * 
   * @throws InsufficientPermissionsException for cross-merchant queries
   */
  async findAll(
    query: AuditLogQueryDto,
    ctx: RequestContext,
  ): Promise<PaginatedAuditLogsResponseDto> {
    const { 
      page = 1, 
      limit = 50,
      sortOrder = 'DESC',
      targetUserId,
      performedBy,
      action,
      merchantId,
      fromDate,
      toDate,
    } = query;

    const qb = this.auditLogRepository.createQueryBuilder('log');

    // Enforce merchant scope for non-super-admins
    if (ctx.role !== UserRole.SUPER_ADMIN) {
      if (merchantId && merchantId !== ctx.merchantId) {
        throw new InsufficientPermissionsException(
          'query audit logs from another merchant',
        );
      }
      // Always scope to the requesting user's merchant
      qb.andWhere('log.merchantId = :merchantId', {
        merchantId: ctx.merchantId,
      });
    } else if (merchantId) {
      // Super admin filtering by specific merchant
      qb.andWhere('log.merchantId = :merchantId', { merchantId });
    }

    // Apply filters
    if (targetUserId) {
      qb.andWhere('log.targetUserId = :targetUserId', { targetUserId });
    }

    if (performedBy) {
      qb.andWhere('log.performedBy = :performedBy', { performedBy });
    }

    if (action) {
      qb.andWhere('log.action = :action', { action });
    }

    // Date range filtering
    if (fromDate) {
      qb.andWhere('log.createdAt >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    }

    if (toDate) {
      qb.andWhere('log.createdAt <= :toDate', {
        toDate: new Date(toDate),
      });
    }

    // Execute query with pagination
    const [logs, total] = await qb
      .orderBy('log.createdAt', sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    // Transform to DTOs
    const data = logs.map((log) =>
      plainToInstance(AuditLogResponseDto, log, {
        excludeExtraneousValues: true,
      }),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Fetch the most recent audit entries for a specific user.
   *
   * Useful for:
   * - User's own activity history
   * - Admin investigation of a specific user
   *
   * Access rules:
   * - The user themselves can always see their own logs
   * - SUPER_ADMIN and SUPPORT can see any user's logs
   * - Merchant-scoped roles can only see logs for users in their merchant
   *
   * @throws CrossMerchantAccessException for cross-merchant access by non-admin
   */
  async findByUser(
    userId: string,
    ctx: RequestContext,
  ): Promise<AuditLogResponseDto[]> {
    // Self-access is always allowed
    const isSelf = ctx.userId === userId;

    // SUPER_ADMIN and SUPPORT can access any user's logs
    const isPrivileged =
      ctx.role === UserRole.SUPER_ADMIN || ctx.role === UserRole.SUPPORT;

    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.targetUserId = :userId', { userId })
      .orderBy('log.createdAt', 'DESC')
      .take(100); // Last 100 entries

    // Merchant-scoped non-self access: restrict to own merchant's logs
    if (!isSelf && !isPrivileged) {
      if (!ctx.merchantId) {
        throw new CrossMerchantAccessException();
      }
      qb.andWhere('log.merchantId = :merchantId', {
        merchantId: ctx.merchantId,
      });
    }

    const logs = await qb.getMany();

    return logs.map((log) =>
      plainToInstance(AuditLogResponseDto, log, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Get audit log statistics for a merchant.
   *
   * Returns:
   * - Total log count
   * - Breakdown by action type
   * - Date range of logs
   *
   * Only accessible by SUPER_ADMIN and MERCHANT_OWNER
   */
  async getMerchantStats(
    merchantId: string,
    ctx: RequestContext,
  ): Promise<{
    total: number;
    actionBreakdown: Record<string, number>;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    // Enforce access control
    if (
      ctx.role !== UserRole.SUPER_ADMIN &&
      ctx.role !== UserRole.MERCHANT_OWNER
    ) {
      throw new InsufficientPermissionsException('view audit statistics');
    }

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.merchantId !== merchantId) {
      throw new CrossMerchantAccessException();
    }

    // Total count
    const total = await this.auditLogRepository.count({
      where: { merchantId },
    });

    // Action breakdown
    const actionBreakdownRaw = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.merchantId = :merchantId', { merchantId })
      .groupBy('log.action')
      .getRawMany<{ action: string; count: string }>();

    const actionBreakdown: Record<string, number> = {};
    for (const row of actionBreakdownRaw) {
      actionBreakdown[row.action] = parseInt(row.count, 10);
    }

    // Date range
    const dateRange = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('MIN(log.createdAt)', 'oldest')
      .addSelect('MAX(log.createdAt)', 'newest')
      .where('log.merchantId = :merchantId', { merchantId })
      .getRawOne<{ oldest: Date; newest: Date }>();

    return {
      total,
      actionBreakdown,
      oldestEntry: dateRange?.oldest ?? null,
      newestEntry: dateRange?.newest ?? null,
    };
  }

  /**
   * Get recent activity across all users (admin dashboard).
   *
   * Returns the most recent N audit entries across the entire platform
   * or scoped to a merchant.
   *
   * Only accessible by SUPER_ADMIN
   */
  async getRecentActivity(
    limit: number = 50,
    ctx: RequestContext,
  ): Promise<AuditLogResponseDto[]> {
    if (ctx.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionsException('view recent activity');
    }

    const logs = await this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200), // Cap at 200 for performance
    });

    return logs.map((log) =>
      plainToInstance(AuditLogResponseDto, log, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Delete old audit logs (data retention compliance).
   *
   * Deletes logs older than the specified retention period.
   * Should be called by a scheduled job.
   *
   * Only accessible by SUPER_ADMIN
   *
   * @param retentionDays - Number of days to retain logs (default 365)
   * @returns Number of records deleted
   */
  async cleanupOldLogs(
    retentionDays: number = 365,
    ctx?: RequestContext,
  ): Promise<number> {
    if (ctx && ctx.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionsException('delete audit logs');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    const deletedCount = result.affected ?? 0;

    this.logger.log(
      `Audit log cleanup: Deleted ${deletedCount} logs older than ${retentionDays} days`,
    );

    return deletedCount;
  }
}
