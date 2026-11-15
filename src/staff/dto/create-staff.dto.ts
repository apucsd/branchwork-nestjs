import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStaffDto {
    @ApiProperty({ example: 'Demo Clerk' })
    @IsString()
    @IsNotEmpty({ message: 'Staff name is required' })
    name: string;

    @ApiProperty({ example: 'clerk@branchwork.demo' })
    @IsEmail({}, { message: 'Valid email is required' })
    email: string;

    @ApiProperty({ example: 'demo123' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password: string;

    @ApiProperty({ example: 'uuid-of-branch' })
    @IsString()
    @IsNotEmpty({ message: 'Branch ID is required' })
    branchId: string;

    @ApiProperty({ example: 'uuid-of-role' })
    @IsString()
    @IsNotEmpty({ message: 'Role ID is required' })
    roleId: string;
}
