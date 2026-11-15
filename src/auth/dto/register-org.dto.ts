import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterOrgDto {
    @ApiProperty({ example: 'Padma Retail' })
    @IsString()
    @IsNotEmpty({ message: 'Organization name is required' })
    organizationName: string;

    @ApiProperty({ example: 'Nadia Rahman' })
    @IsString()
    @IsNotEmpty({ message: 'Your name is required' })
    yourName: string;

    @ApiProperty({ example: 'owner@branchwork.demo' })
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;

    @ApiProperty({ example: 'demo123' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password: string;
}

