import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterOrgDto } from './dto/register-org.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {}

    @Post('/register-org')
    @ResponseMessage('Organization registered successfully')
    async registerOrg(
        @Body() dto: RegisterOrgDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { refreshToken, ...rest } =
            await this.authService.registerOrg(dto);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return rest;
    }

    @Post('/login')
    @ResponseMessage('User logged in successfully')
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { refreshToken, ...rest } =
            await this.authService.login(loginDto);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return rest;
    }

    @Get('/me')
    @UseGuards(AuthGuard)
    @ResponseMessage('Current user retrieved successfully')
    async getMe(@CurrentUser('id') userId: string) {
        return await this.authService.getUserContext(userId);
    }

    @Post('/change-password')
    @UseGuards(AuthGuard)
    @ResponseMessage('Password changed successfully')
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() body: ChangePasswordDto,
    ) {
        return await this.authService.changePassword(userId, body);
    }

    @Post('/refresh-token')
    @ResponseMessage('Token refreshed successfully')
    async refreshToken(@Req() req: Request) {
        const token = req.cookies['refreshToken'];
        if (!token) {
            throw new UnauthorizedException('Refresh token not found');
        }
        return await this.authService.refreshToken(token);
    }
}
