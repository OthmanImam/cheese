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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = exports.OptionalJwtAuthGuard = exports.JwtAuthGuard = exports.CurrentUser = exports.Public = exports.Roles = exports.IS_PUBLIC_KEY = exports.ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = __importDefault(require("ioredis"));
exports.ROLES_KEY = 'roles';
exports.IS_PUBLIC_KEY = 'isPublic';
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC_KEY, true);
exports.Public = Public;
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
        throw new common_1.UnauthorizedException({
            code: 'NOT_AUTHENTICATED',
            message: 'No authenticated user found on request',
        });
    }
    return request.user;
});
let JwtAuthGuard = class JwtAuthGuard {
    jwtService;
    redis;
    reflector;
    constructor(jwtService, redis, reflector) {
        this.jwtService = jwtService;
        this.redis = redis;
        this.reflector = reflector;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(exports.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context
            .switchToHttp()
            .getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException({
                code: 'TOKEN_MISSING',
                message: 'Authorization token is required',
            });
        }
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(token);
        }
        catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new common_1.UnauthorizedException({
                    code: 'TOKEN_EXPIRED',
                    message: 'Your session has expired. Please log in again.',
                });
            }
            throw new common_1.UnauthorizedException({
                code: 'TOKEN_INVALID',
                message: 'The provided token is invalid',
            });
        }
        const invalidationTimestamp = await this.redis.get(`sessions_invalidated:${payload.userId}`);
        if (invalidationTimestamp) {
            const invalidatedAt = new Date(invalidationTimestamp).getTime() / 1000;
            if (payload.iat < invalidatedAt) {
                throw new common_1.UnauthorizedException({
                    code: 'SESSION_INVALIDATED',
                    message: 'Your session has been invalidated. Please log in again.',
                });
            }
        }
        request.user = {
            userId: payload.userId,
            merchantId: payload.merchantId,
            role: payload.role,
            sessionId: payload.sessionId,
            ipAddress: request.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
                request.socket.remoteAddress ??
                'unknown',
            userAgent: request.headers['user-agent'] ?? 'unknown',
        };
        return true;
    }
    extractTokenFromHeader(request) {
        const authHeader = request.headers.authorization;
        if (!authHeader)
            return null;
        const [scheme, token] = authHeader.split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token)
            return null;
        return token;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object, ioredis_2.default,
        core_1.Reflector])
], JwtAuthGuard);
let OptionalJwtAuthGuard = class OptionalJwtAuthGuard {
    jwtService;
    redis;
    constructor(jwtService, redis) {
        this.jwtService = jwtService;
        this.redis = redis;
    }
    async canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token)
            return true;
        try {
            const payload = await this.jwtService.verifyAsync(token);
            const invalidationTimestamp = await this.redis.get(`sessions_invalidated:${payload.userId}`);
            if (invalidationTimestamp) {
                const invalidatedAt = new Date(invalidationTimestamp).getTime() / 1000;
                if (payload.iat < invalidatedAt) {
                    return true;
                }
            }
            request.user = {
                userId: payload.userId,
                merchantId: payload.merchantId,
                role: payload.role,
                sessionId: payload.sessionId,
                ipAddress: request.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
                    request.socket.remoteAddress ??
                    'unknown',
                userAgent: request.headers['user-agent'] ?? 'unknown',
            };
        }
        catch {
        }
        return true;
    }
    extractTokenFromHeader(request) {
        const authHeader = request.headers.authorization;
        if (!authHeader)
            return null;
        const [scheme, token] = authHeader.split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token)
            return null;
        return token;
    }
};
exports.OptionalJwtAuthGuard = OptionalJwtAuthGuard;
exports.OptionalJwtAuthGuard = OptionalJwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeof (_b = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _b : Object, ioredis_2.default])
], OptionalJwtAuthGuard);
let RolesGuard = class RolesGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(exports.ROLES_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        const request = context
            .switchToHttp()
            .getRequest();
        if (!request.user) {
            throw new common_1.UnauthorizedException({
                code: 'NOT_AUTHENTICATED',
                message: 'Authentication is required',
            });
        }
        const hasRole = requiredRoles.includes(request.user.role);
        if (!hasRole) {
            throw new common_1.ForbiddenException({
                code: 'INSUFFICIENT_ROLE',
                message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
                required: requiredRoles,
                current: request.user.role,
            });
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=auth.guards.js.map