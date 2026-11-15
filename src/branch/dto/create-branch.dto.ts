import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
    @ApiProperty({ example: 'Dhanmondi' })
    @IsString()
    @IsNotEmpty({ message: 'Branch name is required' })
    name: string;

    @ApiProperty({ example: 'Dhaka' })
    @IsString()
    @IsNotEmpty({ message: 'City is required' })
    city: string;
}
