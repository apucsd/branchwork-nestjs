import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchDto {
    @ApiPropertyOptional({ example: 'Dhanmondi' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'Dhaka' })
    @IsString()
    @IsOptional()
    city?: string;
}
