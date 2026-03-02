import { SetMetadata } from '@nestjs/common';
export const REQUIRE_DEVICE_SIGNATURE_KEY = 'requireDeviceSignature';
/**
 * Apply to any route that must be cryptographically signed by a whitelisted device.
 * Must be used alongside @UseGuards(JwtAuthGuard, DeviceSignatureGuard).
 */
export const RequireDeviceSignature = () =>
  SetMetadata(REQUIRE_DEVICE_SIGNATURE_KEY, true);
