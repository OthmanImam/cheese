import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Extracts real client IP, respecting X-Forwarded-For from trusted proxies */
export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest();
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    return forwarded?.split(',')[0].trim() ?? req.socket?.remoteAddress;
  },
);
