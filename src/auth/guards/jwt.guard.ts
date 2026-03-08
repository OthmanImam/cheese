// src/auth/guards/jwt-access.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(ctx);
  }
}

// src/auth/guards/jwt-refresh.guard.ts (inline)
import { Injectable as Inj2 } from '@nestjs/common';
import { AuthGuard as AG2 } from '@nestjs/passport';

@Inj2()
export class JwtRefreshGuard extends AG2('jwt-refresh') {}
