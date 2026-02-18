"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditLogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const class_transformer_1 = require("class-transformer");
const audit_log_entity_1 = require("./audit-log.entity");
const audit_log_dto_1 = require("./audit-log.dto");
const users_entity_1 = require("../users/users.entity");
const user_exceptions_1 = require("../users/user.exceptions");
let AuditLogService = AuditLogService_1 = class AuditLogService {
    auditLogRepository;
    logger = new common_1.Logger(AuditLogService_1.name);
    constructor(auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }
    async log(entry) {
        try {
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
            this.logger.debug(`Audit log persisted: [${entry.action}] by=${entry.performedBy} target=${entry.targetUserId}`);
        }
        catch (error) {
            this.logger.warn(`Failed to persist audit log entry [${entry.action}] for user ${entry.targetUserId}: ${error.message}`, error.stack);
        }
    }
    async findAll(query, ctx) {
        const { page = 1, limit = 50, sortOrder = 'DESC', targetUserId, performedBy, action, merchantId, fromDate, toDate, } = query;
        const qb = this.auditLogRepository.createQueryBuilder('log');
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            if (merchantId && merchantId !== ctx.merchantId) {
                throw new user_exceptions_1.InsufficientPermissionsException('query audit logs from another merchant');
            }
            qb.andWhere('log.merchantId = :merchantId', {
                merchantId: ctx.merchantId,
            });
        }
        else if (merchantId) {
            qb.andWhere('log.merchantId = :merchantId', { merchantId });
        }
        if (targetUserId) {
            qb.andWhere('log.targetUserId = :targetUserId', { targetUserId });
        }
        if (performedBy) {
            qb.andWhere('log.performedBy = :performedBy', { performedBy });
        }
        if (action) {
            qb.andWhere('log.action = :action', { action });
        }
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
        const [logs, total] = await qb
            .orderBy('log.createdAt', sortOrder)
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        const totalPages = Math.ceil(total / limit);
        const data = logs.map((log) => (0, class_transformer_1.plainToInstance)(audit_log_dto_1.AuditLogResponseDto, log, {
            excludeExtraneousValues: true,
        }));
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
    async findByUser(userId, ctx) {
        const isSelf = ctx.userId === userId;
        const isPrivileged = ctx.role === users_entity_1.UserRole.SUPER_ADMIN || ctx.role === users_entity_1.UserRole.SUPPORT;
        const qb = this.auditLogRepository
            .createQueryBuilder('log')
            .where('log.targetUserId = :userId', { userId })
            .orderBy('log.createdAt', 'DESC')
            .take(100);
        if (!isSelf && !isPrivileged) {
            if (!ctx.merchantId) {
                throw new user_exceptions_1.CrossMerchantAccessException();
            }
            qb.andWhere('log.merchantId = :merchantId', {
                merchantId: ctx.merchantId,
            });
        }
        const logs = await qb.getMany();
        return logs.map((log) => (0, class_transformer_1.plainToInstance)(audit_log_dto_1.AuditLogResponseDto, log, {
            excludeExtraneousValues: true,
        }));
    }
    async getMerchantStats(merchantId, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.role !== users_entity_1.UserRole.MERCHANT_OWNER) {
            throw new user_exceptions_1.InsufficientPermissionsException('view audit statistics');
        }
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN && ctx.merchantId !== merchantId) {
            throw new user_exceptions_1.CrossMerchantAccessException();
        }
        const total = await this.auditLogRepository.count({
            where: { merchantId },
        });
        const actionBreakdownRaw = await this.auditLogRepository
            .createQueryBuilder('log')
            .select('log.action', 'action')
            .addSelect('COUNT(*)', 'count')
            .where('log.merchantId = :merchantId', { merchantId })
            .groupBy('log.action')
            .getRawMany();
        const actionBreakdown = {};
        for (const row of actionBreakdownRaw) {
            actionBreakdown[row.action] = parseInt(row.count, 10);
        }
        const dateRange = await this.auditLogRepository
            .createQueryBuilder('log')
            .select('MIN(log.createdAt)', 'oldest')
            .addSelect('MAX(log.createdAt)', 'newest')
            .where('log.merchantId = :merchantId', { merchantId })
            .getRawOne();
        return {
            total,
            actionBreakdown,
            oldestEntry: dateRange?.oldest ?? null,
            newestEntry: dateRange?.newest ?? null,
        };
    }
    async getRecentActivity(limit = 50, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('view recent activity');
        }
        const logs = await this.auditLogRepository.find({
            order: { createdAt: 'DESC' },
            take: Math.min(limit, 200),
        });
        return logs.map((log) => (0, class_transformer_1.plainToInstance)(audit_log_dto_1.AuditLogResponseDto, log, {
            excludeExtraneousValues: true,
        }));
    }
    async cleanupOldLogs(retentionDays = 365, ctx) {
        if (ctx && ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('delete audit logs');
        }
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await this.auditLogRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .execute();
        const deletedCount = result.affected ?? 0;
        this.logger.log(`Audit log cleanup: Deleted ${deletedCount} logs older than ${retentionDays} days`);
        return deletedCount;
    }
};
exports.AuditLogService = AuditLogService;
exports.AuditLogService = AuditLogService = AuditLogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditLogService);
//# sourceMappingURL=audit-log.service.js.map