import { UserAuditAction } from '../users/user.types';
export declare class AuditLogQueryDto {
    targetUserId?: string;
    performedBy?: string;
    action?: UserAuditAction;
    merchantId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
    sortOrder?: 'ASC' | 'DESC';
}
export declare class AuditLogResponseDto {
    id: string;
    action: string;
    performedBy: string;
    targetUserId: string;
    merchantId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Record<string, any> | null;
    createdAt: Date;
}
export declare class PaginatedAuditLogsResponseDto {
    data: AuditLogResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
