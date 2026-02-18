import { AuditLogService } from './audit-log.service';
import { AuditLogEntry } from '../users/user.types';
export declare class UserAuditListener {
    private readonly auditLogService;
    private readonly logger;
    constructor(auditLogService: AuditLogService);
    handleAuditEvent(entry: AuditLogEntry): Promise<void>;
}
