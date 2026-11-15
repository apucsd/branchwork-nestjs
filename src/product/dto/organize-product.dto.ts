import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OrganizeProductDto {
    @ApiPropertyOptional({ example: 'Grocery' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ example: 50 })
    @Type(() => Number)
    @IsNumber()
    @Min(0, { message: 'Stock cannot be negative' })
    @IsOptional()
    stock?: number;

    @ApiPropertyOptional({ example: 'uuid-of-target-branch' })
    @IsString()
    @IsOptional()
    branchId?: string;
}
