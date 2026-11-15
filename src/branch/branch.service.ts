import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllBranches(organizationId: string) {
        const branches = await this.prisma.branch.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: {
                        staff: true,
                        products: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            city: branch.city,
            organizationId: branch.organizationId,
            staffCount: branch._count.staff,
            productCount: branch._count.products,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt,
        }));
    }

    async getBranchById(id: string, organizationId: string) {
        const branch = await this.prisma.branch.findFirst({
            where: { id, organizationId },
            include: {
                _count: {
                    select: {
                        staff: true,
                        products: true,
                    },
                },
            },
        });

        if (!branch) {
            throw new NotFoundException('Branch not found');
        }

        return {
            id: branch.id,
            name: branch.name,
            city: branch.city,
            organizationId: branch.organizationId,
            staffCount: branch._count.staff,
            productCount: branch._count.products,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt,
        };
    }

    async createBranch(organizationId: string, dto: CreateBranchDto) {
        const branch = await this.prisma.branch.create({
            data: {
                name: dto.name,
                city: dto.city,
                organizationId,
            },
        });

        return {
            ...branch,
            staffCount: 0,
            productCount: 0,
        };
    }

    async updateBranch(
        id: string,
        organizationId: string,
        dto: UpdateBranchDto,
    ) {
        await this.getBranchById(id, organizationId);

        return await this.prisma.branch.update({
            where: { id },
            data: {
                name: dto.name,
                city: dto.city,
            },
        });
    }

    async deleteBranch(id: string, organizationId: string) {
        await this.getBranchById(id, organizationId);

        await this.prisma.branch.delete({
            where: { id },
        });

        return null;
    }
}
