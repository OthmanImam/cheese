import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  IsString,
} from 'class-validator';
import { Type, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAuditAction } from '../users/user.types';

// ================================================================
// QUERY DTO
// ================================================================

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Filter by target user ID' })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user who performed the action',
  })
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @ApiPropertyOptional({
    description: 'Filter by action type',
    enum: UserAuditAction,
  })
  @IsOptional()
  @IsEnum(UserAuditAction)
  action?: UserAuditAction;

  @ApiPropertyOptional({ description: 'Filter by merchant ID' })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

// ================================================================
// RESPONSE DTO
// ================================================================

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Unique audit log entry ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Action type that was performed' })
  @Expose()
  action: string;

  @ApiProperty({ description: 'User ID who performed the action' })
  @Expose()
  performedBy: string;

  @ApiProperty({ description: 'User ID who was affected by the action' })
  @Expose()
  targetUserId: string;

  @ApiPropertyOptional({ description: 'Merchant context (if applicable)' })
  @Expose()
  merchantId: string | null;

  @ApiPropertyOptional({ description: 'IP address of the action originator' })
  @Expose()
  ipAddress: string | null;

  @ApiPropertyOptional({ description: 'User agent string' })
  @Expose()
  userAgent: string | null;

  @ApiPropertyOptional({ description: 'Additional context data' })
  @Expose()
  metadata: Record<string, any> | null;

  @ApiProperty({ description: 'Timestamp when the action occurred' })
  @Expose()
  createdAt: Date;
}

// ================================================================
// PAGINATED RESPONSE DTO
// ================================================================

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({
    description: 'Array of audit log entries',
    type: [AuditLogResponseDto],
  })
  data: AuditLogResponseDto[];

  @ApiProperty({ description: 'Total number of records' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of records per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}
