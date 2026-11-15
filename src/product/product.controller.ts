import {
    Body,
    Controller,
    Delete,
    Get,
    Header,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OrganizeProductDto } from './dto/organize-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import {
    RequireOwner,
    RequirePermissions,
} from 'src/common/decorators/permissions.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProductController {
    constructor(private readonly productService: ProductService) {}

    @Get()
    @RequirePermissions('VIEW_PRODUCTS')
    @ResponseMessage('Products retrieved successfully')
    async getAllProducts(
        @Req() req: Request,
        @Query() query: ProductQueryDto,
    ) {
        return await this.productService.getAllProducts(
            req.organizationId!,
            req.isOwner!,
            req.branchId,
            query,
        );
    }

    @Get('export')
    @RequirePermissions('VIEW_PRODUCTS')
    @Header('Content-Type', 'text/csv')
    @Header('Content-Disposition', 'attachment; filename="products.csv"')
    async exportProducts(
        @Req() req: Request,
        @Query('branchId') branchId?: string,
    ) {
        return await this.productService.exportProducts(
            req.organizationId!,
            req.isOwner!,
            req.branchId,
            branchId,
        );
    }

    @Get(':id')
    @RequirePermissions('VIEW_PRODUCTS')
    @ResponseMessage('Product retrieved successfully')
    async getProductById(@Param('id') id: string, @Req() req: Request) {
        return await this.productService.getProductById(
            id,
            req.organizationId!,
            req.isOwner!,
            req.branchId,
        );
    }

    @Post()
    @RequireOwner()
    @ResponseMessage('Product created successfully')
    async createProduct(
        @Body() dto: CreateProductDto,
        @Req() req: Request,
    ) {
        return await this.productService.createProduct(
            req.organizationId!,
            dto,
        );
    }

    @Patch(':id/organize')
    @RequirePermissions('ORGANIZE_PRODUCTS')
    @ResponseMessage('Product organized successfully')
    async organizeProduct(
        @Param('id') id: string,
        @Body() dto: OrganizeProductDto,
        @Req() req: Request,
    ) {
        return await this.productService.organizeProduct(
            id,
            req.organizationId!,
            req.isOwner!,
            req.branchId,
            dto,
        );
    }

    @Patch(':id')
    @RequireOwner()
    @ResponseMessage('Product updated successfully')
    async updateProduct(
        @Param('id') id: string,
        @Body() dto: UpdateProductDto,
        @Req() req: Request,
    ) {
        return await this.productService.updateProduct(
            id,
            req.organizationId!,
            dto,
        );
    }

    @Delete(':id')
    @RequireOwner()
    @ResponseMessage('Product deleted successfully')
    async deleteProduct(@Param('id') id: string, @Req() req: Request) {
        return await this.productService.deleteProduct(id, req.organizationId!);
    }
}
