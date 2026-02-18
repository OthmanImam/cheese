"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_service_1 = require("./user.service");
const user_dto_1 = require("./user.dto");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async register(dto, req) {
        return this.userService.createUser(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
    }
    async verifyEmail(dto) {
        return this.userService.verifyEmail(dto);
    }
    async resendVerificationEmail(dto) {
        return this.userService.resendVerificationEmail(dto);
    }
    async forgotPassword(dto) {
        return this.userService.forgotPassword(dto);
    }
    async resetPassword(dto) {
        return this.userService.resetPassword(dto);
    }
    async getMe(req) {
        return this.userService.findById(req.user.userId, req.user);
    }
    async updateMe(dto, req) {
        return this.userService.updateUser(req.user.userId, dto, req.user);
    }
    async changePassword(dto, req) {
        return this.userService.changePassword(req.user.userId, dto, req.user);
    }
    async sendPhoneOtp(req) {
        return this.userService.sendPhoneVerificationCode(req.user.userId, req.user);
    }
    async verifyPhone(dto, req) {
        return this.userService.verifyPhone(req.user.userId, dto, req.user);
    }
    async setup2FA(dto, req) {
        return this.userService.setup2FA(req.user.userId, dto, req.user);
    }
    async confirm2FA(dto, req) {
        return this.userService.confirm2FA(req.user.userId, dto, req.user);
    }
    async disable2FA(dto, req) {
        return this.userService.disable2FA(req.user.userId, dto, req.user);
    }
    async use2FABackupCode(dto, req) {
        return this.userService.use2FABackupCode(req.user.userId, dto);
    }
    async findAll(query, req) {
        return this.userService.findAll(query, req.user);
    }
    async getStats(req) {
        return this.userService.getUserStats(req.user);
    }
    async inviteTeamMember(dto, req) {
        return this.userService.inviteTeamMember(dto, req.user);
    }
    async findOne(id, req) {
        return this.userService.findById(id, req.user);
    }
    async update(id, dto, req) {
        return this.userService.updateUser(id, dto, req.user);
    }
    async remove(id, req) {
        return this.userService.deleteUser(id, req.user);
    }
    async restore(id, req) {
        return this.userService.restoreUser(id, req.user);
    }
    async updateRole(id, dto, req) {
        return this.userService.updateUserRole(id, dto, req.user);
    }
    async updateStatus(id, dto, req) {
        return this.userService.updateUserStatus(id, dto, req.user);
    }
    async updateLimits(id, dto, req) {
        return this.userService.updateTransactionLimits(id, dto, req.user);
    }
    async unlock(id, req) {
        return this.userService.unlockUser(id, req.user);
    }
    async approveKyc(id, req) {
        return this.userService.approveKYC(id, req.user);
    }
    async rejectKyc(id, reason, req) {
        return this.userService.rejectKYC(id, reason, req.user);
    }
    async toggleApiAccess(id, enable, req) {
        return this.userService.toggleApiAccess(id, enable, req.user);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user account' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: user_dto_1.UserResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already exists' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.CreateUserDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email address using token from email link' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid token' }),
    (0, swagger_1.ApiResponse)({ status: 410, description: 'Token expired' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('resend-verification-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resend email verification link' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Rate limit exceeded' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.ResendVerificationEmailDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "resendVerificationEmail", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request a password reset email' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 429, description: 'Rate limit exceeded' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using token from email' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Password mismatch or same password' }),
    (0, swagger_1.ApiResponse)({ status: 410, description: 'Token expired' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current authenticated user profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Update current user profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.UpdateUserDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('me/change-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Change password (authenticated)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Current password incorrect' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.ChangePasswordDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('me/send-phone-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Send phone number verification OTP' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "sendPhoneOtp", null);
__decorate([
    (0, common_1.Post)('me/verify-phone'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify phone number with OTP code' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.VerifyPhoneDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "verifyPhone", null);
__decorate([
    (0, common_1.Post)('me/2fa/setup'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate 2FA setup — returns QR code or sends OTP' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.TwoFactorSetupResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.Enable2FADto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "setup2FA", null);
__decorate([
    (0, common_1.Post)('me/2fa/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm 2FA setup and activate — returns backup codes' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.TwoFactorSetupResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid 2FA code' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.Verify2FADto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "confirm2FA", null);
__decorate([
    (0, common_1.Post)('me/2fa/disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Disable 2FA — requires password and current 2FA code' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.Disable2FADto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "disable2FA", null);
__decorate([
    (0, common_1.Post)('me/2fa/backup-code'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Use a 2FA backup code (single-use)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid backup code' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.Use2FABackupCodeDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "use2FABackupCode", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all users (paginated, filterable)' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.PaginatedUsersResponseDto }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.UserQueryDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform user statistics (super admin only)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('invite'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Invite a team member to a merchant organization' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_dto_1.InviteTeamMemberDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "inviteTeamMember", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateUserDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete a user account' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/restore'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Restore a soft-deleted user (super admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "restore", null);
__decorate([
    (0, common_1.Patch)(':id/role'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user role' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateUserRoleDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user account status (suspend, ban, activate)' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateUserStatusDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/limits'),
    (0, swagger_1.ApiOperation)({ summary: 'Update transaction limits for a user' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_dto_1.UpdateTransactionLimitsDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateLimits", null);
__decorate([
    (0, common_1.Post)(':id/unlock'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Unlock a locked user account' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "unlock", null);
__decorate([
    (0, common_1.Post)(':id/kyc/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve KYC for a user' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "approveKyc", null);
__decorate([
    (0, common_1.Post)(':id/kyc/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject KYC for a user with a reason' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "rejectKyc", null);
__decorate([
    (0, common_1.Patch)(':id/api-access'),
    (0, swagger_1.ApiOperation)({ summary: 'Enable or disable API access for a user' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'string', format: 'uuid' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.MessageResponseDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('enable')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "toggleApiAccess", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map