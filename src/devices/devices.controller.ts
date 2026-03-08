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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto';

@ApiTags('Devices')
@ApiBearerAuth('access-token')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new device',
    description:
      'Stores an ECDSA P-256 public key for the device. Used to verify signatures on sensitive operations (send, PIN change, bank transfer). A user can have multiple registered devices.',
  })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  @ApiResponse({ status: 409, description: 'Device ID already registered' })
  register(
    @CurrentUser() user: User,
    @Body() dto: RegisterDeviceDto,
    @Req() req: Request & { deviceId?: string },
  ) {
    return this.devicesService.register(user.id, dto, req.deviceId);
  }

  @Get()
  @ApiOperation({
    summary: 'List registered devices',
    description:
      'Returns all active devices for the authenticated user. The current device is flagged with isCurrent: true.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of registered devices with lastSeen timestamps',
  })
  list(@CurrentUser() user: User, @Req() req: Request & { deviceId?: string }) {
    return this.devicesService.listDevices(user.id, req.deviceId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Revoke a device',
    description:
      'Deactivates the device, preventing it from signing future operations. Useful when a device is lost or stolen.',
  })
  @ApiParam({
    name: 'id',
    description: 'Device ID to revoke',
    example: 'device-uuid-v4-here',
  })
  @ApiResponse({ status: 200, description: 'Device revoked' })
  @ApiResponse({
    status: 404,
    description: 'Device not found or does not belong to user',
  })
  revoke(@CurrentUser() user: User, @Param('id') id: string) {
    return this.devicesService.revoke(user.id, id);
  }
}
