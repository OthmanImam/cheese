import {
  CanActivate, ExecutionContext, Injectable, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TransactionSignatureService } from '../services/transaction-signature.service';
import { SignedTransactionRequestDto } from '../../transactions/dto/signed-transaction-request.dto';
import { User } from '../../users/entities/user.entity'; // From auth module
import { REQUIRE_DEVICE_SIGNATURE_KEY } from '../decorators/require-device-signature.decorator';
import {
  DeviceNotFoundException,
  DeviceNotAuthorizedException,
  InvalidSignatureException,
  RequestExpiredException,
  NonceReplayException,
} from '../../common/exceptions/device.exceptions';

declare global {
  namespace Express {
    interface Request {
      verifiedDevice?: {
        deviceDbId: string;
        canonicalPayload: string;
      };
    }
  }
}

/**
 * DeviceSignatureGuard
 *
 * Applied to routes that require cryptographic device authorization.
 * Must be combined with JwtAuthGuard so request.user is populated.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, DeviceSignatureGuard)
 *   @RequireDeviceSignature()
 *   @Post('withdraw')
 *   async withdraw(@Body() dto: SignedTransactionRequestDto) { ... }
 *
 * What this guard does NOT do:
 *   - Validate the JWT (JwtAuthGuard handles that)
 *   - Rate limit (ThrottlerGuard handles that)
 *   - Business logic validation (controller / service handles that)
 *
 * On success: attaches verifiedDevice to request for downstream use.
 * On failure: throws the appropriate typed HttpException.
 */
@Injectable()
export class DeviceSignatureGuard implements CanActivate {
  private readonly logger = new Logger(DeviceSignatureGuard.name);

  constructor(
    private readonly txSigService: TransactionSignatureService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresSig = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_DEVICE_SIGNATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresSig) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user     = request.user as User;

    if (!user) {
      // Should not happen if JwtAuthGuard runs first — defensive check
      this.logger.error('DeviceSignatureGuard ran without an authenticated user');
      throw new DeviceNotAuthorizedException();
    }

    const dto = request.body as SignedTransactionRequestDto;

    if (!dto?.signature || !dto?.deviceId || !dto?.nonce) {
      this.logger.warn(`Missing required signature fields [userId=${user.id}]`);
      throw new InvalidSignatureException();
    }

    // Full pipeline: timestamp → device lookup → nonce → crypto verify
    const context2 = await this.txSigService.verify(dto, user.id);

    // Attach result — controller can read without re-fetching
    request.verifiedDevice = {
      deviceDbId:      context2.deviceDbId,
      canonicalPayload: context2.canonicalPayload,
    };

    return true;
  }
}
