import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OrganizeProductDto } from './dto/organize-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { AppError } from 'src/common/errors/app-error';

@Injectable()
export class ProductService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllProducts(
        organizationId: string,
        isOwner: boolean,
        staffBranchId?: string,
        query?: ProductQueryDto,
    ) {
        const where: any = { organizationId };

        // BRANCH SCOPING
        if (!isOwner) {
            where.branchId = staffBranchId;
        } else if (query?.branchId) {
            where.branchId = query.branchId;
        }

        // CATEGORY FILTER
        if (query?.category) {
            where.category = query.category;
        }

        // TEXT SEARCH ACROSS NAME, SKU, CATEGORY
        const searchTerm = query?.search || query?.searchTerm;
        if (searchTerm) {
            where.OR = [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { sku: { contains: searchTerm, mode: 'insensitive' } },
                { category: { contains: searchTerm, mode: 'insensitive' } },
            ];
        }

        const page = Math.max(1, Number(query?.page) || 1);
        const limit = Math.max(1, Number(query?.limit) || 10);
        const skip = (page - 1) * limit;

        const [total, products] = await Promise.all([
            this.prisma.product.count({ where }),
            this.prisma.product.findMany({
                where,
                include: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            city: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        return {
            data: products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getProductById(
        id: string,
        organizationId: string,
        isOwner: boolean,
        staffBranchId?: string,
    ) {
        const product = await this.prisma.product.findFirst({
            where: { id, organizationId },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
            },
        });

        if (!product) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Product not found');
        }

        if (!isOwner && product.branchId !== staffBranchId) {
            throw new AppError(
                HttpStatus.FORBIDDEN,
                'You do not have access to products of this branch',
            );
        }

        return product;
    }

    async createProduct(organizationId: string, dto: CreateProductDto) {
        const branch = await this.prisma.branch.findFirst({
            where: { id: dto.branchId, organizationId },
        });

        if (!branch) {
            throw new AppError(
                HttpStatus.BAD_REQUEST,
                'Branch not found in this organization',
            );
        }

        return await this.prisma.product.create({
            data: {
                name: dto.name,
                sku: dto.sku,
                category: dto.category,
                price: dto.price,
                stock: dto.stock ?? 0,
                branchId: dto.branchId,
                organizationId,
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
            },
        });
    }

    async updateProduct(
        id: string,
        organizationId: string,
        dto: UpdateProductDto,
    ) {
        const product = await this.prisma.product.findFirst({
            where: { id, organizationId },
        });

        if (!product) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Product not found');
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

        return await this.prisma.product.update({
            where: { id },
            data: {
                name: dto.name,
                sku: dto.sku,
                category: dto.category,
                price: dto.price,
                stock: dto.stock,
                branchId: dto.branchId,
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
            },
        });
    }

    async organizeProduct(
        id: string,
        organizationId: string,
        isOwner: boolean,
        staffBranchId: string | undefined,
        dto: OrganizeProductDto,
    ) {
        const product = await this.prisma.product.findFirst({
            where: { id, organizationId },
        });

        if (!product) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Product not found');
        }

        if (!isOwner && product.branchId !== staffBranchId) {
            throw new AppError(
                HttpStatus.FORBIDDEN,
                'You can only organize products within your own branch',
            );
        }

        if (dto.branchId) {
            const targetBranch = await this.prisma.branch.findFirst({
                where: { id: dto.branchId, organizationId },
            });
            if (!targetBranch) {
                throw new AppError(
                    HttpStatus.BAD_REQUEST,
                    'Target branch not found in this organization',
                );
            }
        }

        return await this.prisma.product.update({
            where: { id },
            data: {
                category: dto.category,
                stock: dto.stock,
                branchId: dto.branchId,
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    },
                },
            },
        });
    }

    async deleteProduct(id: string, organizationId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id, organizationId },
        });

        if (!product) {
            throw new AppError(HttpStatus.NOT_FOUND, 'Product not found');
        }

        await this.prisma.product.delete({
            where: { id },
        });

        return null;
    }

    async exportProducts(
        organizationId: string,
        isOwner: boolean,
        staffBranchId?: string,
        branchFilter?: string,
    ) {
        const where: any = { organizationId };

        if (!isOwner) {
            where.branchId = staffBranchId;
        } else if (branchFilter) {
            where.branchId = branchFilter;
        }

        const products = await this.prisma.product.findMany({
            where,
            include: {
                branch: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // GENERATE CSV STRING
        const headers = ['Product', 'SKU', 'Category', 'Price', 'Stock', 'Branch'];
        const rows = products.map((p) => [
            `"${p.name.replace(/"/g, '""')}"`,
            `"${p.sku.replace(/"/g, '""')}"`,
            `"${p.category.replace(/"/g, '""')}"`,
            p.price,
            p.stock,
            `"${p.branch.name.replace(/"/g, '""')}"`,
        ]);

        return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }
}
