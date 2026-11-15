import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ProductQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Search across name, SKU, or category' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by branch ID (owner only)' })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional({ description: 'Filter by category' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({ description: 'Sort by field e.g. -createdAt, price, stock' })
    @IsOptional()
    @IsString()
    sort?: string;
}
