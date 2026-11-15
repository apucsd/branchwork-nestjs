import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
    @ApiProperty({ example: 'Mustard oil 1L' })
    @IsString()
    @IsNotEmpty({ message: 'Product name is required' })
    name: string;

    @ApiProperty({ example: 'OIL-001' })
    @IsString()
    @IsNotEmpty({ message: 'SKU is required' })
    sku: string;

    @ApiProperty({ example: 'Grocery' })
    @IsString()
    @IsNotEmpty({ message: 'Category is required' })
    category: string;

    @ApiProperty({ example: 420 })
    @Type(() => Number)
    @IsNumber()
    @Min(0, { message: 'Price cannot be negative' })
    price: number;

    @ApiPropertyOptional({ example: 48, default: 0 })
    @Type(() => Number)
    @IsNumber()
    @Min(0, { message: 'Stock cannot be negative' })
    @IsOptional()
    stock?: number;

    @ApiProperty({ example: 'uuid-of-branch' })
    @IsString()
    @IsNotEmpty({ message: 'Branch ID is required' })
    branchId: string;
}
