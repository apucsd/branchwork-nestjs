import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStaffDto {
    @ApiPropertyOptional({ example: 'Demo Clerk Updated' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'uuid-of-new-branch' })
    @IsString()
    @IsOptional()
    branchId?: string;

    @ApiPropertyOptional({ example: 'uuid-of-new-role' })
    @IsString()
    @IsOptional()
    roleId?: string;
}
