# Branchwork — Multi-Branch Organization Console API

A production-grade, scalable RESTful API built with **NestJS 11**, **PostgreSQL**, and **Prisma ORM** powering **Branchwork** — a multi-branch organization console for managing branches, custom roles with permission checklists, staff assignments, and branch-scoped inventory.

---

## 🔑 Evaluation & Demo Accounts

Pre-seeded evaluation accounts matching the frontend prototype specifications:

### 🌟 1. Organization Owner (Full System Access)
* **Organization:** `Padma Retail`
* **Name:** Nadia Rahman
* **Email:** `owner@branchwork.demo`
* **Password:** `demo123`
* **Capabilities:** Full bypass access across all branches, roles, staff, and products. Can create/delete branches, define custom roles, invite staff, create/delete products, and filter products across all branches.

### 👥 2. Staff Member (Branch-Scoped Role)
* **Branch:** `Gulshan` (Dhaka)
* **Role:** `Stock clerk`
* **Permissions:** `VIEW_PRODUCTS`, `ORGANIZE_PRODUCTS`
* **Name:** Demo Clerk
* **Email:** `clerk@branchwork.demo`
* **Password:** `demo123`
* **Capabilities:** View products strictly restricted to the **Gulshan** branch. Can organize products (update category, adjust stock count, or transfer branch). Blocked from viewing other branches or deleting products.

---

## ⚡ Architecture & Business Highlights

### 1. 🛡️ Two-Layer Authorization & IDOR Prevention
* **Layer 1: Action Permissions**: Evaluated using `@RequirePermissions(...)` against the user's role permission checklist (`MANAGE_STAFF`, `VIEW_PRODUCTS`, `ORGANIZE_PRODUCTS`).
* **Layer 2: Multi-Branch Data Scoping**: Staff queries are strictly locked down to `where: { branchId: user.branchId }`. Non-permitted or cross-branch mutations are rejected with `403 Forbidden`.
* **Owner Privilege Bypass**: The organization owner bypasses permission checklists with system super-admin rights while preserving organization boundaries.

### 2. 🏬 Branch & Inventory Organization
* **Owner Controls**: Owners create and delete products and branches.
* **Staff Organizing**: Staff with `ORGANIZE_PRODUCTS` permission can:
  * Re-categorize items (e.g. *Grocery*, *Home*).
  * Update inventory stock levels.
  * Transfer products between branches.

### 3. 🔍 Search, Filtering & Data Export
* Multi-parameter search across `name`, `sku`, and `category`.
* Branch filtering for owners (`?branchId=...`) and category filtering (`?category=...`).
* Live CSV data export endpoint (`GET /api/v1/products/export`).

---

## 📐 Entity Relationship Architecture

```mermaid
erDiagram
    ORGANIZATION ||--o{ BRANCH : "has branches"
    ORGANIZATION ||--o{ ROLE : "defines roles"
    ORGANIZATION ||--o{ STAFF_MEMBER : "employs staff"
    ORGANIZATION ||--o{ PRODUCT : "owns inventory"
    ORGANIZATION }o--|| USER : "owned by"
    BRANCH ||--o{ STAFF_MEMBER : "assigned staff"
    BRANCH ||--o{ PRODUCT : "stocks products"
    ROLE ||--o{ STAFF_MEMBER : "grants permissions"
    USER ||--o| STAFF_MEMBER : "staff profile"

    ORGANIZATION {
        string id PK
        string name
        string ownerId FK
    }
    BRANCH {
        string id PK
        string name
        string city
        string organizationId FK
    }
    ROLE {
        string id PK
        string name
        string[] permissions
        string organizationId FK
    }
    STAFF_MEMBER {
        string id PK
        string userId FK
        string branchId FK
        string roleId FK
        string organizationId FK
    }
    PRODUCT {
        string id PK
        string name
        string sku
        string category
        float price
        int stock
        string branchId FK
        string organizationId FK
    }
    USER {
        string id PK
        string name
        string email
        string password
        string status
        boolean isVerified
    }
```

---

## 📡 REST API Reference

All responses conform to the global envelope:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-11-15T09:00:00.000Z"
}
```

### 1. Authentication & Organization
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register-org` | Public | Register owner & provision organization |
| `POST` | `/api/v1/auth/login` | Public | Log in owner or staff, resolves active branch & role |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve session context, branch, and permissions |
| `POST` | `/api/v1/auth/refresh-token` | Authenticated | Refresh JWT access token |

### 2. Branch Management
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/branches` | Authenticated | List branches with `staffCount` & `productCount` |
| `GET` | `/api/v1/branches/:id` | Authenticated | Get single branch details |
| `POST` | `/api/v1/branches` | Owner Only | Create a new branch (`name`, `city`) |
| `PATCH` | `/api/v1/branches/:id` | Owner Only | Update branch details |
| `DELETE` | `/api/v1/branches/:id` | Owner Only | Delete branch |

### 3. Roles & Permissions Checklist
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/roles` | Authenticated | List roles with `staffCount` and permission tags |
| `GET` | `/api/v1/roles/:id` | Authenticated | Get single role details |
| `POST` | `/api/v1/roles` | Owner Only | Create role with permission checklist |
| `PATCH` | `/api/v1/roles/:id` | Owner Only | Update role name or permissions checklist |
| `DELETE` | `/api/v1/roles/:id` | Owner Only | Delete role (prevented if staff are assigned) |

### 4. Staff Management
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/staff` | `MANAGE_STAFF` | List staff with branch and role assignments |
| `GET` | `/api/v1/staff/:id` | `MANAGE_STAFF` | Get single staff member details |
| `POST` | `/api/v1/staff` | `MANAGE_STAFF` | Invite staff member to a branch with a role |
| `PATCH` | `/api/v1/staff/:id` | `MANAGE_STAFF` | Reassign staff branch or role |
| `DELETE` | `/api/v1/staff/:id` | `MANAGE_STAFF` | Remove staff from organization |

### 5. Product Management & Organizing
| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | `VIEW_PRODUCTS` | List products (branch-scoped for staff) with search & filter |
| `GET` | `/api/v1/products/export` | `VIEW_PRODUCTS` | Export products to CSV |
| `GET` | `/api/v1/products/:id` | `VIEW_PRODUCTS` | Get product details |
| `POST` | `/api/v1/products` | Owner Only | Create new product |
| `PATCH` | `/api/v1/products/:id/organize` | `ORGANIZE_PRODUCTS` | Staff organize product (category, stock, branch transfer) |
| `PATCH` | `/api/v1/products/:id` | Owner Only | Full product update |
| `DELETE` | `/api/v1/products/:id` | Owner Only | Delete product |

---

## 🛠️ Technology Stack

* **Framework:** NestJS 11
* **Language:** TypeScript 5
* **Database:** PostgreSQL (Neon Serverless)
* **ORM:** Prisma 7 (`@prisma/adapter-pg`)
* **Security & Auth:** JWT, Passport, Bcrypt password hashing
* **Rate Limiting:** `@nestjs/throttler`
* **Validation:** `class-validator`, `class-transformer`
* **Documentation:** Swagger / OpenAPI UI (`/api/docs`)

---

## 🚀 Local Development Setup

### 1. Prerequisites
* **Node.js**: `v20.x` or higher
* **Package Manager**: `yarn`
* **PostgreSQL**: Local instance or Neon Cloud URI

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/apucsd/branchwork-nestjs.git
cd branchwork-nestjs

# Install dependencies
yarn install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# DATABASE
DATABASE_URL="postgresql://user:password@localhost:5432/branchwork?schema=public"

# AUTH
JWT_SECRET="branchwork-jwt-secret-key"
BCRYPT_SALT_ROUNDS=10
JWT_ACCESS_TOKEN_EXPIRES_IN="7d"
JWT_REFRESH_TOKEN_EXPIRES_IN="30d"
```

### 4. Database Setup & Seeding
```bash
# Generate Prisma Client
yarn generate

# Push Schema to Database
yarn prisma db push

# Seed Demo Accounts and Products
yarn db:seed
```

### 5. Run the Application
```bash
# Development mode with hot-reload
yarn dev

# Production build & start
yarn build
yarn start:prod
```

Swagger API documentation is available at `http://localhost:4000/api/docs`.
