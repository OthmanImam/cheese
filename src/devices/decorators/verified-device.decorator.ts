import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the verified device context from the request.
 * Only available on routes guarded by DeviceSignatureGuard.
 */
export const VerifiedDevice = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().verifiedDevice,
);
