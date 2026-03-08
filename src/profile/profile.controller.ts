// src/profile/profile.controller.ts
import { Body, Controller, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch()
  @ApiOperation({
    summary: 'Update profile',
    description:
      "Partially updates the user's profile. All fields are optional — only provided fields are changed. Username changes check uniqueness.",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated — returns the updated user object',
  })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  update(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.profileService.update(user.id, dto);
  }
}
