import {
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateProductDto {
    @ApiPropertyOptional({ example: 'Mustard oil 1L' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 'OIL-001' })
    @IsString()
    @IsOptional()
    sku?: string;

    @ApiPropertyOptional({ example: 'Grocery' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ example: 420 })
    @Type(() => Number)
    @IsNumber()
    @Min(0, { message: 'Price cannot be negative' })
    @IsOptional()
    price?: number;

    @ApiPropertyOptional({ example: 48 })
    @Type(() => Number)
    @IsNumber()
    @Min(0, { message: 'Stock cannot be negative' })
    @IsOptional()
    stock?: number;

    @ApiPropertyOptional({ example: 'uuid-of-branch' })
    @IsString()
    @IsOptional()
    branchId?: string;
}
