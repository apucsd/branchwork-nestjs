import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequireOwner } from 'src/common/decorators/permissions.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
@UseGuards(AuthGuard, PermissionsGuard)
export class BranchController {
    constructor(private readonly branchService: BranchService) {}

    @Get()
    @ResponseMessage('Branches retrieved successfully')
    async getAllBranches(@Req() req: Request) {
        return await this.branchService.getAllBranches(req.organizationId!);
    }

    @Get(':id')
    @ResponseMessage('Branch retrieved successfully')
    async getBranchById(@Param('id') id: string, @Req() req: Request) {
        return await this.branchService.getBranchById(id, req.organizationId!);
    }

    @Post()
    @RequireOwner()
    @ResponseMessage('Branch created successfully')
    async createBranch(
        @Body() dto: CreateBranchDto,
        @Req() req: Request,
    ) {
        return await this.branchService.createBranch(req.organizationId!, dto);
    }

    @Patch(':id')
    @RequireOwner()
    @ResponseMessage('Branch updated successfully')
    async updateBranch(
        @Param('id') id: string,
        @Body() dto: UpdateBranchDto,
        @Req() req: Request,
    ) {
        return await this.branchService.updateBranch(
            id,
            req.organizationId!,
            dto,
        );
    }

    @Delete(':id')
    @RequireOwner()
    @ResponseMessage('Branch deleted successfully')
    async deleteBranch(@Param('id') id: string, @Req() req: Request) {
        return await this.branchService.deleteBranch(id, req.organizationId!);
    }
}
