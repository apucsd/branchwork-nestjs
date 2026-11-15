import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    PERMISSIONS_KEY,
    REQUIRE_OWNER_KEY,
} from '../decorators/permissions.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requireOwner = this.reflector.getAllAndOverride<boolean>(
            REQUIRE_OWNER_KEY,
            [context.getHandler(), context.getClass()],
        );

        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        const req = context.switchToHttp().getRequest();
        const userId = req.user?.id;

        if (!userId) {
            throw new UnauthorizedException('Authentication required');
        }

        // CHECK IF USER OWNS AN ORGANIZATION
        const ownedOrg = await this.prisma.organization.findFirst({
            where: { ownerId: userId },
        });

        if (ownedOrg) {
            req.isOwner = true;
            req.organizationId = ownedOrg.id;
            return true;
        }

        // IF ACTION REQUIRES OWNER AND USER IS NOT OWNER
        if (requireOwner) {
            throw new ForbiddenException(
                'Only organization owner can perform this action',
            );
        }

        // CHECK IF USER IS A STAFF MEMBER
        const staff = await this.prisma.staffMember.findFirst({
            where: { userId },
            include: {
                role: true,
                branch: true,
            },
        });

        if (!staff) {
            throw new ForbiddenException(
                'User is not associated with any organization',
            );
        }

        req.isOwner = false;
        req.organizationId = staff.organizationId;
        req.branchId = staff.branchId;
        req.staff = staff;

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const hasPermission = requiredPermissions.every((perm) =>
            staff.role.permissions.includes(perm),
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to perform this action',
            );
        }

        return true;
    }
}
