import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        example: 'owner@branchwork.demo',
        description: 'User email (Demo: owner@branchwork.demo / clerk@branchwork.demo)',
    })
    @IsEmail({}, { message: 'Please enter a valid email' })
    email: string;

    @ApiProperty({
        example: 'demo123',
        description: 'User password (demo123)',
    })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password: string;
}
