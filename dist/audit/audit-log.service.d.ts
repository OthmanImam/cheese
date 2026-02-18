import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogQueryDto, AuditLogResponseDto, PaginatedAuditLogsResponseDto } from './audit-log.dto';
import { AuditLogEntry, RequestContext } from '../users/user.types';
export declare class AuditLogService {
    private readonly auditLogRepository;
    private readonly logger;
    constructor(auditLogRepository: Repository<AuditLog>);
    log(entry: AuditLogEntry): Promise<void>;
    findAll(query: AuditLogQueryDto, ctx: RequestContext): Promise<PaginatedAuditLogsResponseDto>;
    findByUser(userId: string, ctx: RequestContext): Promise<AuditLogResponseDto[]>;
    getMerchantStats(merchantId: string, ctx: RequestContext): Promise<{
        total: number;
        actionBreakdown: Record<string, number>;
        oldestEntry: Date | null;
        newestEntry: Date | null;
    }>;
    getRecentActivity(limit: number | undefined, ctx: RequestContext): Promise<AuditLogResponseDto[]>;
    cleanupOldLogs(retentionDays?: number, ctx?: RequestContext): Promise<number>;
}
