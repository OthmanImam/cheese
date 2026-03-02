import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { SignatureNonce } from '../nonces/entities/nonce.entity';
import { DevicesController } from './devices.controller';
import { DeviceService } from './services/device.service';
import { SignatureVerifierService } from './services/signature-verifier.service';
import { NonceService } from './services/nonce.service';
import { TransactionSignatureService } from './services/transaction-signature.service';
import { DeviceSignatureGuard } from './guards/device-signature.guard';
import { DevicesScheduler } from './devices.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, SignatureNonce]),
  ],
  controllers: [DevicesController],
  providers: [
    // Services
    DeviceService,
    SignatureVerifierService,
    NonceService,
    TransactionSignatureService,
    // Guard (also exported so other modules can apply it)
    DeviceSignatureGuard,
    // Maintenance
    DevicesScheduler,
  ],
  exports: [
    DeviceService,
    SignatureVerifierService,
    TransactionSignatureService,
    DeviceSignatureGuard,
    TypeOrmModule,
  ],
})
export class DevicesModule {}
