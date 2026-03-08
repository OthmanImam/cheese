// src/devices/devices.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  register(
    @CurrentUser() user: User,
    @Body() dto: RegisterDeviceDto,
    @Req() req: Request & { deviceId?: string },
  ) {
    return this.devicesService.register(user.id, dto, req.deviceId);
  }

  @Get()
  list(@CurrentUser() user: User, @Req() req: Request & { deviceId?: string }) {
    return this.devicesService.listDevices(user.id, req.deviceId);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: User, @Param('id') id: string) {
    return this.devicesService.revoke(user.id, id);
  }
}

// ────────────────────────────────────────────────────────────
// src/devices/devices.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService, TypeOrmModule],
})
export class DevicesModule {}
