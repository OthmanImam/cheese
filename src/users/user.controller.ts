import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationEmailDto,
  VerifyPhoneDto,
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
  Use2FABackupCodeDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpdateTransactionLimitsDto,
  InviteTeamMemberDto,
  UserQueryDto,
  UserResponseDto,
  PaginatedUsersResponseDto,
  TwoFactorSetupResponseDto,
  MessageResponseDto,
} from './user.dto';

/**
 * NOTE: JwtAuthGuard, RolesGuard, and CurrentUser decorator
 * are assumed to be implemented in the AuthModule.
 * They are referenced here but their implementation lives in auth/.
 *
 * @JwtAuthGuard      — validates Bearer JWT, attaches req.user
 * @CurrentUser()     — extracts RequestContext from req.user
 * @Roles(...)        — role-based access guard
 */

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ================================================================
  // PUBLIC ROUTES (no auth required)
  // ================================================================

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: CreateUserDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.createUser(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token from email link' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  @ApiResponse({ status: 410, description: 'Token expired' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<MessageResponseDto> {
    return this.userService.verifyEmail(dto);
  }

  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async resendVerificationEmail(
    @Body() dto: ResendVerificationEmailDto,
  ): Promise<MessageResponseDto> {
    return this.userService.resendVerificationEmail(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.userService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Password mismatch or same password' })
  @ApiResponse({ status: 410, description: 'Token expired' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.userService.resetPassword(dto);
  }

  // ================================================================
  // AUTHENTICATED — SELF OPERATIONS
  // ================================================================

  @Get('me')
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getMe(@Req() req: any): Promise<UserResponseDto> {
    return this.userService.findById(req.user.userId, req.user);
  }

  @Patch('me')
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateMe(
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.updateUser(req.user.userId, dto, req.user);
  }

  @Post('me/change-password')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.changePassword(req.user.userId, dto, req.user);
  }

  @Post('me/send-phone-otp')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send phone number verification OTP' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async sendPhoneOtp(@Req() req: any): Promise<MessageResponseDto> {
    return this.userService.sendPhoneVerificationCode(
      req.user.userId,
      req.user,
    );
  }

  @Post('me/verify-phone')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone number with OTP code' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async verifyPhone(
    @Body() dto: VerifyPhoneDto,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.verifyPhone(req.user.userId, dto, req.user);
  }

  // ================================================================
  // AUTHENTICATED — 2FA
  // ================================================================

  @Post('me/2fa/setup')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate 2FA setup — returns QR code or sends OTP' })
  @ApiResponse({ status: 200, type: TwoFactorSetupResponseDto })
  async setup2FA(
    @Body() dto: Enable2FADto,
    @Req() req: any,
  ): Promise<TwoFactorSetupResponseDto> {
    return this.userService.setup2FA(req.user.userId, dto, req.user);
  }

  @Post('me/2fa/confirm')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm 2FA setup and activate — returns backup codes' })
  @ApiResponse({ status: 200, type: TwoFactorSetupResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async confirm2FA(
    @Body() dto: Verify2FADto,
    @Req() req: any,
  ): Promise<TwoFactorSetupResponseDto> {
    return this.userService.confirm2FA(req.user.userId, dto, req.user);
  }

  @Post('me/2fa/disable')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA — requires password and current 2FA code' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async disable2FA(
    @Body() dto: Disable2FADto,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.disable2FA(req.user.userId, dto, req.user);
  }

  @Post('me/2fa/backup-code')
  // @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Use a 2FA backup code (single-use)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid backup code' })
  async use2FABackupCode(
    @Body() dto: Use2FABackupCodeDto,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.use2FABackupCode(req.user.userId, dto);
  }

  // ================================================================
  // ADMIN — USER MANAGEMENT
  // ================================================================

  @Get()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER, UserRole.MERCHANT_ADMIN, UserRole.SUPPORT)
  @ApiOperation({ summary: 'List all users (paginated, filterable)' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  async findAll(
    @Query() query: UserQueryDto,
    @Req() req: any,
  ): Promise<PaginatedUsersResponseDto> {
    return this.userService.findAll(query, req.user);
  }

  @Get('stats')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get platform user statistics (super admin only)' })
  async getStats(@Req() req: any): Promise<Record<string, number>> {
    return this.userService.getUserStats(req.user);
  }

  @Post('invite')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER, UserRole.MERCHANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a team member to a merchant organization' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  async inviteTeamMember(
    @Body() dto: InviteTeamMemberDto,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.inviteTeamMember(dto, req.user);
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.findById(id, req.user);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.updateUser(id, dto, req.user);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a user account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.deleteUser(id, req.user);
  }

  @Post(':id/restore')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted user (super admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.restoreUser(id, req.user);
  }

  @Patch(':id/role')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER)
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.updateUserRole(id, dto, req.user);
  }

  @Patch(':id/status')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER, UserRole.SUPPORT)
  @ApiOperation({ summary: 'Update user account status (suspend, ban, activate)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.updateUserStatus(id, dto, req.user);
  }

  @Patch(':id/limits')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER)
  @ApiOperation({ summary: 'Update transaction limits for a user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateLimits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionLimitsDto,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.updateTransactionLimits(id, dto, req.user);
  }

  @Post(':id/unlock')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER, UserRole.SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock a locked user account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async unlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.unlockUser(id, req.user);
  }

  @Post(':id/kyc/approve')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve KYC for a user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async approveKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.approveKYC(id, req.user);
  }

  @Post(':id/kyc/reject')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject KYC for a user with a reason' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async rejectKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ): Promise<UserResponseDto> {
    return this.userService.rejectKYC(id, reason, req.user);
  }

  @Patch(':id/api-access')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.SUPER_ADMIN, UserRole.MERCHANT_OWNER)
  @ApiOperation({ summary: 'Enable or disable API access for a user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async toggleApiAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('enable') enable: boolean,
    @Req() req: any,
  ): Promise<MessageResponseDto> {
    return this.userService.toggleApiAccess(id, enable, req.user);
  }
}