import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Request } from 'express';
import { UserRole } from '../user.entity';
import { RequestContext } from '../user.types';

// ================================================================
// JWT PAYLOAD INTERFACE
// ================================================================

export interface JwtPayload {
  userId: string;
  merchantId: string | null;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
}

// ================================================================
// METADATA KEYS
// ================================================================

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

// ================================================================
// DECORATORS
// ================================================================

/**
 * Attach required roles to a route handler.
 * Used together with RolesGuard.
 *
 * @example
 * @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER)
 * @Get('admin/users')
 */
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Mark a route as public — bypasses JwtAuthGuard entirely.
 * Used on registration, login, forgot-password, etc.
 *
 * @example
 * @Public()
 * @Post('register')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Parameter decorator — extracts the authenticated RequestContext
 * from the request object populated by JwtAuthGuard.
 *
 * @example
 * async getMe(@CurrentUser() ctx: RequestContext) {}
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: RequestContext }>();

    if (!request.user) {
      throw new UnauthorizedException({
        code: 'NOT_AUTHENTICATED',
        message: 'No authenticated user found on request',
      });
    }

    return request.user;
  },
);

// ================================================================
// JWT AUTH GUARD
// ================================================================

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,

    @InjectRedis()
    private readonly redis: Redis,

    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow routes decorated with @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestContext }>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'TOKEN_MISSING',
        message: 'Authorization token is required',
      });
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'The provided token is invalid',
      });
    }

    // Check if all sessions for this user were invalidated after token was issued
    // e.g. after password change or account suspension
    const invalidationTimestamp = await this.redis.get(
      `sessions_invalidated:${payload.userId}`,
    );

    if (invalidationTimestamp) {
      const invalidatedAt = new Date(invalidationTimestamp).getTime() / 1000; // to unix seconds
      if (payload.iat < invalidatedAt) {
        throw new UnauthorizedException({
          code: 'SESSION_INVALIDATED',
          message: 'Your session has been invalidated. Please log in again.',
        });
      }
    }

    // Attach the RequestContext to the request object
    // This is what @CurrentUser() and service-level scope checks read
    request.user = {
      userId: payload.userId,
      merchantId: payload.merchantId,
      role: payload.role,
      sessionId: payload.sessionId,
      ipAddress:
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        request.socket.remoteAddress ??
        'unknown',
      userAgent: request.headers['user-agent'] ?? 'unknown',
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

    return token;
  }
}

// ================================================================
// OPTIONAL JWT AUTH GUARD
// ================================================================

/**
 * Allows unauthenticated requests through but attaches
 * the user context if a valid token IS present.
 *
 * Useful for endpoints that behave differently
 * for authenticated vs. anonymous users.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,

    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestContext }>();

    const token = this.extractTokenFromHeader(request);

    // No token — allow through without attaching user
    if (!token) return true;

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Still check session invalidation even for optional auth
      const invalidationTimestamp = await this.redis.get(
        `sessions_invalidated:${payload.userId}`,
      );

      if (invalidationTimestamp) {
        const invalidatedAt = new Date(invalidationTimestamp).getTime() / 1000;
        if (payload.iat < invalidatedAt) {
          // Invalid session — treat as unauthenticated, don't attach user
          return true;
        }
      }

      request.user = {
        userId: payload.userId,
        merchantId: payload.merchantId,
        role: payload.role,
        sessionId: payload.sessionId,
        ipAddress:
          (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
          request.socket.remoteAddress ??
          'unknown',
        userAgent: request.headers['user-agent'] ?? 'unknown',
      };
    } catch {
      // Any token error — allow through without user context
      // The endpoint itself decides if it needs auth
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

    return token;
  }
}

// ================================================================
// ROLES GUARD
// ================================================================

/**
 * Enforces role-based access control on routes decorated with @Roles().
 * Must be used AFTER JwtAuthGuard in the guard chain.
 *
 * If no @Roles() decorator is present, the guard allows all authenticated users.
 *
 * @example
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.SUPER_ADMIN)
 * @Delete(':id')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator — allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestContext }>();

    // Guard should only run after JwtAuthGuard — user must be set
    if (!request.user) {
      throw new UnauthorizedException({
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication is required',
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const hasRole = requiredRoles.includes(request.user.role);

    if (!hasRole) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_ROLE',
        message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
        required: requiredRoles,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        current: request.user.role,
      });
    }

    return true;
  }
}
