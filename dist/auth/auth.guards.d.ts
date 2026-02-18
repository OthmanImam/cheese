import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { UserRole } from '../user.entity';
export interface JwtPayload {
    userId: string;
    merchantId: string | null;
    role: UserRole;
    sessionId: string;
    iat: number;
    exp: number;
}
export declare const ROLES_KEY = "roles";
export declare const IS_PUBLIC_KEY = "isPublic";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare class JwtAuthGuard implements CanActivate {
    private readonly jwtService;
    private readonly redis;
    private readonly reflector;
    constructor(jwtService: JwtService, redis: Redis, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
}
export declare class OptionalJwtAuthGuard implements CanActivate {
    private readonly jwtService;
    private readonly redis;
    constructor(jwtService: JwtService, redis: Redis);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
}
export declare class RolesGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
