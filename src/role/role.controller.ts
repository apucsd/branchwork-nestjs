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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequireOwner } from 'src/common/decorators/permissions.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    @Get()
    @ResponseMessage('Roles retrieved successfully')
    async getAllRoles(@Req() req: Request) {
        return await this.roleService.getAllRoles(req.organizationId!);
    }

    @Get(':id')
    @ResponseMessage('Role retrieved successfully')
    async getRoleById(@Param('id') id: string, @Req() req: Request) {
        return await this.roleService.getRoleById(id, req.organizationId!);
    }

    @Post()
    @RequireOwner()
    @ResponseMessage('Role created successfully')
    async createRole(
        @Body() dto: CreateRoleDto,
        @Req() req: Request,
    ) {
        return await this.roleService.createRole(req.organizationId!, dto);
    }

    @Patch(':id')
    @RequireOwner()
    @ResponseMessage('Role updated successfully')
    async updateRole(
        @Param('id') id: string,
        @Body() dto: UpdateRoleDto,
        @Req() req: Request,
    ) {
        return await this.roleService.updateRole(id, req.organizationId!, dto);
    }

    @Delete(':id')
    @RequireOwner()
    @ResponseMessage('Role deleted successfully')
    async deleteRole(@Param('id') id: string, @Req() req: Request) {
        return await this.roleService.deleteRole(id, req.organizationId!);
    }
}
