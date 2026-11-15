import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { UserStatus } from '../generated/prisma/enums';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
    // PASSWORD HASH FOR DEMO ACCOUNTS
    const passwordHash = await bcrypt.hash('demo123', 10);

    // CLEAN EXISTING DATA
    await prisma.product.deleteMany({});
    await prisma.staffMember.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    // 1. CREATE OWNER USER
    const owner = await prisma.user.create({
        data: {
            name: 'Nadia Rahman',
            email: 'owner@branchwork.demo',
            password: passwordHash,
            status: UserStatus.ACTIVE,
            isVerified: true,
        },
    });

    // 2. CREATE ORGANIZATION
    const org = await prisma.organization.create({
        data: {
            name: 'Padma Retail',
            ownerId: owner.id,
        },
    });

    // 3. CREATE BRANCHES
    const dhanmondi = await prisma.branch.create({
        data: {
            name: 'Dhanmondi',
            city: 'Dhaka',
            organizationId: org.id,
        },
    });

    const gulshan = await prisma.branch.create({
        data: {
            name: 'Gulshan',
            city: 'Dhaka',
            organizationId: org.id,
        },
    });

    // 4. CREATE ROLES
    const branchManagerRole = await prisma.role.create({
        data: {
            name: 'Branch manager',
            organizationId: org.id,
            permissions: [
                'MANAGE_STAFF',
                'VIEW_PRODUCTS',
                'ORGANIZE_PRODUCTS',
            ],
        },
    });

    const stockClerkRole = await prisma.role.create({
        data: {
            name: 'Stock clerk',
            organizationId: org.id,
            permissions: ['VIEW_PRODUCTS', 'ORGANIZE_PRODUCTS'],
        },
    });

    // 5. CREATE STAFF USER (STOCK CLERK)
    await prisma.user.create({
        data: {
            name: 'Demo Clerk',
            email: 'clerk@branchwork.demo',
            password: passwordHash,
            status: UserStatus.ACTIVE,
            isVerified: true,
            staffProfile: {
                create: {
                    organizationId: org.id,
                    branchId: gulshan.id,
                    roleId: stockClerkRole.id,
                },
            },
        },
    });

    // 6. CREATE PRODUCTS
    await prisma.product.createMany({
        data: [
            {
                name: 'Mustard oil 1L',
                sku: 'OIL-001',
                category: 'Grocery',
                price: 420,
                stock: 48,
                organizationId: org.id,
                branchId: dhanmondi.id,
            },
            {
                name: 'Basmati rice 5kg',
                sku: 'RIC-005',
                category: 'Grocery',
                price: 890,
                stock: 6,
                organizationId: org.id,
                branchId: gulshan.id,
            },
            {
                name: 'Steel flask',
                sku: 'HOM-212',
                category: 'Home',
                price: 1250,
                stock: 22,
                organizationId: org.id,
                branchId: gulshan.id,
            },
        ],
    });

    console.log('Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
