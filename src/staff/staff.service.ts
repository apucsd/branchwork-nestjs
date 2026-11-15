import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UserStatus } from 'generated/prisma/enums';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AppError } from 'src/common/errors/app-error';

@Injectable()
export class StaffService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async getAllStaff(organizationId: string) {
        const staffList = await this.prisma.staffMember.findMany({
            where: { organizationId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true,
                        image: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return staffList.map((s) => ({
            id: s.id,
            userId: s.userId,
            name: s.user.name,
            email: s.user.email,
            status: s.user.status,
            image: s.user.image,
            branch: s.branch,
            role: s.role,
            createdAt: s.createdAt,
        }));
    }

    async getStaffById(id: string, organizationId: string) {
        const staff = await this.prisma.staffMember.findFirst({
            where: { id, organizationId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true,
                        image: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: true,
                    },
                },
            },
        });

        if (!staff) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Staff member not found');
        }

        return {
            id: staff.id,
            userId: staff.userId,
            name: staff.user.name,
            email: staff.user.email,
            status: staff.user.status,
            image: staff.user.image,
            branch: staff.branch,
            role: staff.role,
            createdAt: staff.createdAt,
        };
    }

    async createStaff(organizationId: string, dto: CreateStaffDto) {
        // VERIFY BRANCH
        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, organizationId },
        });
        if (!branch) {
            throw new AppError(
                HttpStatus.BAD_REQUEST,
                'Branch not found in this organization',
            );
        }

        // VERIFY ROLE
        const role = await this.prisma.role.findFirst({
            where: { id: dto.roleId, organizationId },
        });
        if (!role) {
            throw new AppError(
                HttpStatus.BAD_REQUEST,
                'Role not found in this organization',
            );
        }

        // CHECK IF USER EXISTS
        let user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (user) {
            const existingStaff = await this.prisma.staffMember.findFirst({
                where: { userId: user.id },
            });
            if (existingStaff) {
                throw new AppError(
                    HttpStatus.CONFLICT,
                    'User is already assigned as staff in an organization',
                );
            }
        } else {
            const saltRounds =
                this.configService.get<number>('BCRYPT_SALT_ROUNDS') || 10;
            const hashedPassword = await bcrypt.hash(
                dto.password,
                Number(saltRounds),
            );

            user = await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    password: hashedPassword,
                    status: UserStatus.ACTIVE,
                    isVerified: true,
                },
            });
        }

        const staff = await this.prisma.staffMember.create({
            data: {
                userId: user.id,
                organizationId,
                branchId: dto.branchId,
                roleId: dto.roleId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: true,
                    },
                },
            },
        });

        return {
            id: staff.id,
            userId: staff.userId,
            name: staff.user.name,
            email: staff.user.email,
            branch: staff.branch,
            role: staff.role,
            createdAt: staff.createdAt,
        };
    }

    async updateStaff(
        id: string,
        organizationId: string,
        dto: UpdateStaffDto,
    ) {
        const staff = await this.prisma.staffMember.findFirst({
            where: { id, organizationId },
        });
        if (!staff) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Staff member not found');
        }

        if (dto.branchId) {
            const branch = await this.prisma.branch.findFirst({
                where: { id: dto.branchId, organizationId },
            });
            if (!branch) {
                throw new AppError(
                    HttpStatus.BAD_REQUEST,
                    'Branch not found in this organization',
                );
            }
        }

        if (dto.roleId) {
            const role = await this.prisma.role.findFirst({
                where: { id: dto.roleId, organizationId },
            });
            if (!role) {
                throw new AppError(
                    HttpStatus.BAD_REQUEST,
                    'Role not found in this organization',
                );
            }
        }

        if (dto.name) {
            await this.prisma.user.update({
                where: { id: staff.userId },
                data: { name: dto.name },
            });
        }

        return await this.prisma.staffMember.update({
            where: { id },
            data: {
                branchId: dto.branchId,
                roleId: dto.roleId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: true,
                    },
                },
            },
        });
    }

    async deleteStaff(id: string, organizationId: string) {
        const staff = await this.prisma.staffMember.findFirst({
            where: { id, organizationId },
        });
        if (!staff) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Staff member not found');
        }

        await this.prisma.staffMember.delete({
            where: { id },
        });

        return null;
    }
}
