import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
    @ApiProperty({ example: 'Branch manager' })
    @IsString()
    @IsNotEmpty({ message: 'Role name is required' })
    name: string;

    @ApiProperty({
        example: ['MANAGE_STAFF', 'VIEW_PRODUCTS', 'ORGANIZE_PRODUCTS'],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    permissions: string[];
}
