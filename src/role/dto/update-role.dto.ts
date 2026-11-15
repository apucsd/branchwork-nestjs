import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
    @ApiPropertyOptional({ example: 'Branch manager' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({
        example: ['VIEW_PRODUCTS', 'ORGANIZE_PRODUCTS'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];
}
