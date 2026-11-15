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
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@Controller('staff')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('MANAGE_STAFF')
export class StaffController {
    constructor(private readonly staffService: StaffService) {}

    @Get()
    @ResponseMessage('Staff members retrieved successfully')
    async getAllStaff(@Req() req: Request) {
        return await this.staffService.getAllStaff(req.organizationId!);
    }

    @Get(':id')
    @ResponseMessage('Staff member retrieved successfully')
    async getStaffById(@Param('id') id: string, @Req() req: Request) {
        return await this.staffService.getStaffById(id, req.organizationId!);
    }

    @Post()
    @ResponseMessage('Staff member added successfully')
    async createStaff(
        @Body() dto: CreateStaffDto,
        @Req() req: Request,
    ) {
        return await this.staffService.createStaff(req.organizationId!, dto);
    }

    @Patch(':id')
    @ResponseMessage('Staff member updated successfully')
    async updateStaff(
        @Param('id') id: string,
        @Body() dto: UpdateStaffDto,
        @Req() req: Request,
    ) {
        return await this.staffService.updateStaff(
            id,
            req.organizationId!,
            dto,
        );
    }

    @Delete(':id')
    @ResponseMessage('Staff member deleted successfully')
    async deleteStaff(@Param('id') id: string, @Req() req: Request) {
        return await this.staffService.deleteStaff(id, req.organizationId!);
    }
}
