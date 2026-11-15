import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AppError } from 'src/common/errors/app-error';

@Injectable()
export class RoleService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllRoles(organizationId: string) {
        const roles = await this.prisma.role.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: {
                        staff: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return roles.map((role) => ({
            id: role.id,
            name: role.name,
            permissions: role.permissions,
            organizationId: role.organizationId,
            staffCount: role._count.staff,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        }));
    }

    async getRoleById(id: string, organizationId: string) {
        const role = await this.prisma.role.findFirst({
            where: { id, organizationId },
            include: {
                _count: {
                    select: {
                        staff: true,
                    },
                },
            },
        });

        if (!role) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Role not found');
        }

        return {
            id: role.id,
            name: role.name,
            permissions: role.permissions,
            organizationId: role.organizationId,
            staffCount: role._count.staff,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        };
    }

    async createRole(organizationId: string, dto: CreateRoleDto) {
        // CHECK FOR DUPLICATE ROLE NAME IN ORGANIZATION
        const existing = await this.prisma.role.findFirst({
            where: {
                organizationId,
                name: { equals: dto.name, mode: 'insensitive' },
            },
        });

        if (existing) {
            throw new AppError(
                HttpStatus.CONFLICT,
                'A role with this name already exists in your organization',
            );
        }

        const role = await this.prisma.role.create({
            data: {
                name: dto.name,
                permissions: dto.permissions,
                organizationId,
            },
        });

        return {
            ...role,
            staffCount: 0,
        };
    }

    async updateRole(
        id: string,
        organizationId: string,
        dto: UpdateRoleDto,
    ) {
        await this.getRoleById(id, organizationId);

        // CHECK IF NEW NAME CONFLICTS WITH EXISTING ROLE
        if (dto.name) {
            const duplicate = await this.prisma.role.findFirst({
                where: {
                    organizationId,
                    name: { equals: dto.name, mode: 'insensitive' },
                    id: { not: id },
                },
            });

            if (duplicate) {
                throw new AppError(
                    HttpStatus.CONFLICT,
                    'A role with this name already exists in your organization',
                );
            }
        }

        return await this.prisma.role.update({
            where: { id },
            data: {
                name: dto.name,
                permissions: dto.permissions,
            },
        });
    }

    async deleteRole(id: string, organizationId: string) {
        const role = await this.getRoleById(id, organizationId);

        if (role.staffCount > 0) {
            throw new AppError(
                HttpStatus.BAD_REQUEST,
                'Cannot delete role that has assigned staff members',
            );
        }

        await this.prisma.role.delete({
            where: { id },
        });

        return null;
    }
}
