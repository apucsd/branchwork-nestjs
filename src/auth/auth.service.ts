import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus, OtpType } from 'generated/prisma/client';
import { generateOtp, generateOtpExpiry } from 'src/common/utils/otp.util';
import { PrismaService } from 'src/prisma/prisma.service';

import { RegisterDto } from './dto/register.dto';
import { RegisterOrgDto } from './dto/register-org.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from 'src/common/types/express';
import { MailService } from 'src/mail/mail.service';

interface JwtPayloadWithPurpose extends JwtPayload {
    purpose?: string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
        private readonly prisma: PrismaService,
    ) {}

    async registerOrg(dto: RegisterOrgDto) {
        const existing = await this.userService.findUserByEmail(dto.email);
        if (existing) {
            throw new ConflictException('This email is already registered');
        }

        const saltOrRounds =
            this.configService.get<number>('BCRYPT_SALT_ROUNDS') || 10;
        const hashedPassword = await bcrypt.hash(
            dto.password,
            Number(saltOrRounds),
        );

        // 1. CREATE OWNER USER
        const user = await this.prisma.user.create({
            data: {
                name: dto.yourName,
                email: dto.email,
                password: hashedPassword,
                status: UserStatus.ACTIVE,
                isVerified: true,
            },
        });

        // 2. CREATE ORGANIZATION
        const org = await this.prisma.organization.create({
            data: {
                name: dto.organizationName,
                ownerId: user.id,
            },
        });

        // 3. CREATE DEFAULT ROLES
        await this.prisma.role.createMany({
            data: [
                {
                    name: 'Branch manager',
                    organizationId: org.id,
                    permissions: [
                        'MANAGE_STAFF',
                        'VIEW_PRODUCTS',
                        'ORGANIZE_PRODUCTS',
                    ],
                },
                {
                    name: 'Stock clerk',
                    organizationId: org.id,
                    permissions: ['VIEW_PRODUCTS', 'ORGANIZE_PRODUCTS'],
                },
            ],
        });

        const tokens = await this.generateUserTokens(user.id, user.email);
        const userContext = await this.getUserContext(user.id);

        return {
            ...tokens,
            user: userContext,
        };
    }

    async getUserContext(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedOrganizations: true,
                staffProfile: {
                    include: {
                        organization: true,
                        branch: true,
                        role: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isOwner = user.ownedOrganizations.length > 0;
        const organization = isOwner
            ? user.ownedOrganizations[0]
            : user.staffProfile?.organization;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            isOwner,
            organization: organization
                ? { id: organization.id, name: organization.name }
                : null,
            branch: user.staffProfile?.branch
                ? {
                      id: user.staffProfile.branch.id,
                      name: user.staffProfile.branch.name,
                      city: user.staffProfile.branch.city,
                  }
                : null,
            role: isOwner
                ? { id: 'owner', name: 'Owner', permissions: ['*'] }
                : user.staffProfile?.role
                  ? {
                        id: user.staffProfile.role.id,
                        name: user.staffProfile.role.name,
                        permissions: user.staffProfile.role.permissions,
                    }
                  : null,
        };
    }

    async register(userDto: RegisterDto) {
        const saltOrRounds =
            this.configService.get<number>('BCRYPT_SALT_ROUNDS');
        const hashedPassword = await bcrypt.hash(
            userDto.password,
            Number(saltOrRounds),
        );

        const otp = generateOtp();
        const otpExpiry = generateOtpExpiry();

        const user = await this.userService.createUser({
            ...userDto,
            password: hashedPassword,
            isVerified: false,
            otp: otp,
            otpExpiry: otpExpiry,
            otpType: OtpType.REGISTRATION,
        });

        await this.mailService.sendVerifyOtpMail(
            userDto.email,
            userDto.name,
            otp,
        );

        return user;
    }

    async resendRegistrationOtp(email: string) {
        const user = await this.userService.findUserByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found with this email');
        }

        if (user.isVerified) {
            throw new UnauthorizedException('This user is already verified');
        }

        if (user.status === UserStatus.BLOCKED) {
            throw new UnauthorizedException('This user is blocked');
        }

        const otp = generateOtp();
        const otpExpiry = generateOtpExpiry();

        await this.userService.updateUser(user.id, {
            otp: otp,
            otpExpiry: otpExpiry,
            otpType: OtpType.REGISTRATION,
        });

        await this.mailService.sendVerifyOtpMail(user.email, user.name, otp);

        return null;
    }

    async login(loginDto: LoginDto) {
        const user = await this.userService.findUserByEmailWithAuth(
            loginDto.email,
        );
        if (!user) {
            throw new UnauthorizedException('This email is not registered');
        }

        if (user.status === UserStatus.BLOCKED) {
            throw new UnauthorizedException('This user is blocked');
        }

        if (user.status === UserStatus.DELETED) {
            throw new UnauthorizedException('This account has been deleted');
        }

        if (!user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordMatch = await bcrypt.compare(
            loginDto.password,
            user.password,
        );
        if (!isPasswordMatch) {
            throw new UnauthorizedException('This password is not correct');
        }

        if (user.status === UserStatus.INACTIVE || !user.isVerified) {
            const otp = generateOtp();
            const otpExpiry = generateOtpExpiry();
            await this.userService.updateUser(user.id, {
                otp,
                otpExpiry,
                otpType: OtpType.REGISTRATION,
            });
            await this.mailService.sendVerifyOtpMail(
                user.email,
                user.name,
                otp,
            );
            throw new UnauthorizedException({
                message:
                    'Please verify your email. A new OTP code has been sent to your email address.',
                requiresVerification: true,
                email: user.email,
            });
        }
        const tokens = await this.generateUserTokens(user.id, user.email);
        const userContext = await this.getUserContext(user.id);

        return {
            ...tokens,
            user: userContext,
        };
    }

    async verifyOtp(verifyOtpDto: VerifyOtpDto) {
        const existingUser = await this.userService.findUserByEmailWithAuth(
            verifyOtpDto.email,
        );
        if (!existingUser) {
            throw new UnauthorizedException('This email is not registered');
        }

        if (existingUser.status === UserStatus.BLOCKED) {
            throw new UnauthorizedException('This user is blocked');
        }

        if (!existingUser.otpExpiry || existingUser.otpExpiry < new Date()) {
            throw new UnauthorizedException(
                'OTP has expired. Please try resending OTP.',
            );
        }

        if (Number(existingUser?.otp) !== Number(verifyOtpDto.otp)) {
            throw new UnauthorizedException(
                'Your OTP is not correct. Please provide correct OTP.',
            );
        }

        if (existingUser.otpType === OtpType.REGISTRATION) {
            if (existingUser.isVerified) {
                throw new UnauthorizedException(
                    'This user is already verified',
                );
            }

            await this.userService.updateUser(existingUser.id, {
                status: UserStatus.ACTIVE,
                isVerified: true,
                otp: null,
                otpExpiry: null,
                otpType: null,
            });

            const tokens = await this.generateUserTokens(
                existingUser.id,
                existingUser.email,
            );

            return {
                id: existingUser.id,
                email: existingUser.email,
                ...tokens,
            };
        }

        if (existingUser.otpType === OtpType.PASSWORD_RESET) {
            const resetToken = this.jwtService.sign(
                { id: existingUser.id, purpose: 'PASSWORD_RESET' },
                { expiresIn: '5m' },
            );

            await this.userService.updateUser(existingUser.id, {
                otp: null,
                otpExpiry: null,
                otpType: null,
            });

            return { resetToken };
        }
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const user = await this.userService.findUserByEmail(
            forgotPasswordDto.email,
        );
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const otp = generateOtp();
        const otpExpiry = generateOtpExpiry();

        await this.userService.updateUser(user.id, {
            otp: otp,
            otpExpiry: otpExpiry,
            otpType: OtpType.PASSWORD_RESET,
        });

        await this.mailService.sendResetPasswordOtpMail(
            user.email,
            user.name,
            otp,
        );

        return null;
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const secret = this.configService.get<string>('JWT_SECRET');

        let decodedToken: JwtPayloadWithPurpose;
        try {
            decodedToken =
                await this.jwtService.verifyAsync<JwtPayloadWithPurpose>(
                    resetPasswordDto.resetToken,
                    { secret },
                );
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Your reset token has expired');
            }
            throw new UnauthorizedException('Invalid reset token');
        }

        if (decodedToken.purpose !== 'PASSWORD_RESET') {
            throw new UnauthorizedException('Invalid reset token');
        }

        const user = await this.userService.findUserById(decodedToken.id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const saltOrRounds =
            this.configService.get<number>('BCRYPT_SALT_ROUNDS');
        const hashedPassword = await bcrypt.hash(
            resetPasswordDto.newPassword,
            Number(saltOrRounds),
        );

        await this.userService.updatePassword(user.id, hashedPassword);

        return null;
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        const user = await this.userService.findUserByIdWithAuth(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.password) {
            throw new UnauthorizedException(
                'This account does not have an existing password to change. Please set a password via password reset.',
            );
        }

        const isPasswordMatch = await bcrypt.compare(
            changePasswordDto.oldPassword,
            user.password,
        );
        if (!isPasswordMatch) {
            throw new UnauthorizedException('This password is not correct');
        }

        const saltOrRounds =
            this.configService.get<number>('BCRYPT_SALT_ROUNDS');
        const hashedPassword = await bcrypt.hash(
            changePasswordDto.newPassword,
            Number(saltOrRounds),
        );

        await this.userService.updatePassword(user.id, hashedPassword);

        return null;
    }
    async refreshToken(refreshToken: string) {
        const secret = this.configService.get<string>('JWT_SECRET');

        let decodedToken: JwtPayload;
        try {
            decodedToken = await this.jwtService.verifyAsync<JwtPayload>(
                refreshToken,
                { secret },
            );
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw new UnauthorizedException(
                    'Your refresh token has expired',
                );
            }
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.userService.findUserById(decodedToken.id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const newAccessToken = await this.jwtService.signAsync(
            { id: user.id, email: user.email },
            {
                secret: this.configService.get<string>('JWT_SECRET'),
                expiresIn:
                    this.configService.get<string>(
                        'JWT_ACCESS_TOKEN_EXPIRES_IN',
                    ) || ('7d' as any),
            },
        );

        return {
            id: user.id,
            email: user.email,
            accessToken: newAccessToken,
        };
    }

    private async generateUserTokens(userId: string, email: string) {
        const payload = { id: userId, email };
        const secret = this.configService.get<string>('JWT_SECRET');

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret,
                expiresIn: (this.configService.get<string>(
                    'JWT_ACCESS_TOKEN_EXPIRES_IN',
                ) || '7d') as any,
            }),
            this.jwtService.signAsync(payload, {
                secret,
                expiresIn: (this.configService.get<string>(
                    'JWT_REFRESH_TOKEN_EXPIRES_IN',
                ) || '30d') as any,
            }),
        ]);

        return { accessToken, refreshToken };
    }
}
