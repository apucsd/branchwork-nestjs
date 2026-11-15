const BASE_URL = 'http://localhost:4000';

async function request(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${path}`, options);
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await res.json();
    } else {
        data = await res.text();
    }
    return { status: res.status, data };
}

async function runQaSuite() {
    console.log('====================================================');
    console.log('       BRANCHWORK API — QA TEST EXECUTION REPORT     ');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(testName, condition, details = '') {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passed++;
        } else {
            console.error(`[FAIL] ${testName} -> ${details}`);
            failed++;
        }
    }

    // 1. BASE HEALTH CHECK
    const r1 = await request('GET', '/');
    assert('1. Root Health Check (GET /)', r1.status === 200 && (r1.data === 'Hello World!' || r1.data?.data === 'Hello World!'), `Status: ${r1.status}`);

    // 2. OWNER LOGIN
    const r2 = await request('POST', '/api/v1/auth/login', {
        email: 'owner@branchwork.demo',
        password: 'demo123',
    });
    assert('2. Owner Login (POST /api/v1/auth/login)', r2.status === 201 || r2.status === 200, `Status: ${r2.status}`);
    const ownerToken = r2.data?.data?.accessToken;
    const orgId = r2.data?.data?.user?.organization?.id;

    // 3. OWNER GET /ME
    const r3 = await request('GET', '/api/v1/auth/me', null, ownerToken);
    assert('3. Owner Session (GET /api/v1/auth/me)', r3.status === 200 && r3.data?.data?.isOwner === true, `isOwner: ${r3.data?.data?.isOwner}`);

    // 4. GET BRANCHES
    const r4 = await request('GET', '/api/v1/branches', null, ownerToken);
    assert('4. List Branches (GET /api/v1/branches)', r4.status === 200 && r4.data?.data?.length >= 2, `Count: ${r4.data?.data?.length}`);
    const dhanmondiBranch = r4.data?.data?.find(b => b.name === 'Dhanmondi');
    const gulshanBranch = r4.data?.data?.find(b => b.name === 'Gulshan');

    // 5. CREATE BRANCH
    const r5 = await request('POST', '/api/v1/branches', { name: 'QA Test Branch', city: 'Chittagong' }, ownerToken);
    assert('5. Create Branch (POST /api/v1/branches)', r5.status === 201 && r5.data?.data?.name === 'QA Test Branch', `Status: ${r5.status}`);
    const testBranchId = r5.data?.data?.id;

    // 6. DUPLICATE BRANCH TEST (EXPECT 409)
    const r6 = await request('POST', '/api/v1/branches', { name: 'QA Test Branch', city: 'Chittagong' }, ownerToken);
    assert('6. Duplicate Branch Validation (POST /api/v1/branches -> 409)', r6.status === 409, `Status: ${r6.status}`);

    // 7. UPDATE BRANCH
    const r7 = await request('PATCH', `/api/v1/branches/${testBranchId}`, { name: 'QA Updated Branch' }, ownerToken);
    assert('7. Update Branch (PATCH /api/v1/branches/:id)', r7.status === 200 && r7.data?.data?.name === 'QA Updated Branch', `Status: ${r7.status}`);

    // 8. DELETE BRANCH
    const r8 = await request('DELETE', `/api/v1/branches/${testBranchId}`, null, ownerToken);
    assert('8. Delete Branch (DELETE /api/v1/branches/:id)', r8.status === 200 && r8.data?.data === null, `Status: ${r8.status}`);

    // 9. GET ROLES
    const r9 = await request('GET', '/api/v1/roles', null, ownerToken);
    assert('9. List Roles (GET /api/v1/roles)', r9.status === 200 && r9.data?.data?.length >= 2, `Count: ${r9.data?.data?.length}`);
    const clerkRole = r9.data?.data?.find(r => r.name === 'Stock clerk');
    const managerRole = r9.data?.data?.find(r => r.name === 'Branch manager');

    // 10. CREATE ROLE
    const r10 = await request('POST', '/api/v1/roles', { name: 'QA Auditor', permissions: ['VIEW_PRODUCTS'] }, ownerToken);
    assert('10. Create Role (POST /api/v1/roles)', r10.status === 201 && r10.data?.data?.name === 'QA Auditor', `Status: ${r10.status}`);
    const testRoleId = r10.data?.data?.id;

    // 11. DUPLICATE ROLE TEST (EXPECT 409)
    const r11 = await request('POST', '/api/v1/roles', { name: 'QA Auditor', permissions: ['VIEW_PRODUCTS'] }, ownerToken);
    assert('11. Duplicate Role Validation (POST /api/v1/roles -> 409)', r11.status === 409, `Status: ${r11.status}`);

    // 12. UPDATE ROLE
    const r12 = await request('PATCH', `/api/v1/roles/${testRoleId}`, { permissions: ['VIEW_PRODUCTS', 'ORGANIZE_PRODUCTS'] }, ownerToken);
    assert('12. Update Role (PATCH /api/v1/roles/:id)', r12.status === 200 && r12.data?.data?.permissions?.length === 2, `Status: ${r12.status}`);

    // 13. DELETE ROLE
    const r13 = await request('DELETE', `/api/v1/roles/${testRoleId}`, null, ownerToken);
    assert('13. Delete Role (DELETE /api/v1/roles/:id)', r13.status === 200 && r13.data?.data === null, `Status: ${r13.status}`);

    // 14. GET STAFF
    const r14 = await request('GET', '/api/v1/staff', null, ownerToken);
    assert('14. List Staff (GET /api/v1/staff)', r14.status === 200 && r14.data?.data?.length >= 2, `Count: ${r14.data?.data?.length}`);

    // 15. CREATE STAFF
    const r15 = await request('POST', '/api/v1/staff', {
        name: 'QA Tester Staff',
        email: `qa.staff.${Date.now()}@branchwork.demo`,
        password: 'demo123',
        branchId: dhanmondiBranch.id,
        roleId: clerkRole.id,
    }, ownerToken);
    assert('15. Create Staff (POST /api/v1/staff)', r15.status === 201, `Status: ${r15.status}`);
    const testStaffId = r15.data?.data?.id;

    // 16. UPDATE STAFF
    const r16 = await request('PATCH', `/api/v1/staff/${testStaffId}`, { name: 'QA Tester Updated' }, ownerToken);
    assert('16. Update Staff (PATCH /api/v1/staff/:id)', r16.status === 200, `Status: ${r16.status}`);

    // 17. DELETE STAFF
    const r17 = await request('DELETE', `/api/v1/staff/${testStaffId}`, null, ownerToken);
    assert('17. Delete Staff (DELETE /api/v1/staff/:id)', r17.status === 200 && r17.data?.data === null, `Status: ${r17.status}`);

    // 18. GET PRODUCTS (OWNER: ALL BRANCHES)
    const r18 = await request('GET', '/api/v1/products', null, ownerToken);
    assert('18. List Products (GET /api/v1/products)', r18.status === 200 && r18.data?.data?.length >= 6, `Count: ${r18.data?.data?.length}`);

    // 19. SEARCH PRODUCTS
    const r19 = await request('GET', '/api/v1/products?search=oil', null, ownerToken);
    assert('19. Search Products (GET /api/v1/products?search=oil)', r19.status === 200 && r19.data?.data?.length >= 2, `Matches: ${r19.data?.data?.length}`);

    // 20. CATEGORY FILTER
    const r20 = await request('GET', '/api/v1/products?category=Home', null, ownerToken);
    assert('20. Filter by Category (GET /api/v1/products?category=Home)', r20.status === 200 && r20.data?.data?.every(p => p.category === 'Home'), `All Home: true`);

    // 21. EXPORT PRODUCTS (CSV)
    const r21 = await request('GET', '/api/v1/products/export', null, ownerToken);
    assert('21. Export Products CSV (GET /api/v1/products/export)', r21.status === 200 && typeof r21.data === 'string' && r21.data.includes('Product,SKU,Category,Price,Stock,Branch'), `CSV Header validated`);

    // 22. CREATE PRODUCT (OWNER ONLY)
    const r22 = await request('POST', '/api/v1/products', {
        name: 'QA Test Ghee 1L',
        sku: 'GHE-999',
        category: 'Grocery',
        price: 950,
        stock: 12,
        branchId: gulshanBranch.id,
    }, ownerToken);
    assert('22. Create Product (POST /api/v1/products)', r22.status === 201, `Status: ${r22.status}`);
    const testProductId = r22.data?.data?.id;

    // 23. UPDATE PRODUCT (OWNER FULL UPDATE)
    const r23 = await request('PATCH', `/api/v1/products/${testProductId}`, { price: 990, stock: 15 }, ownerToken);
    assert('23. Update Product (PATCH /api/v1/products/:id)', r23.status === 200 && r23.data?.data?.price === 990, `Status: ${r23.status}`);

    // 24. DELETE PRODUCT
    const r24 = await request('DELETE', `/api/v1/products/${testProductId}`, null, ownerToken);
    assert('24. Delete Product (DELETE /api/v1/products/:id)', r24.status === 200 && r24.data?.data === null, `Status: ${r24.status}`);

    // ====================================================
    //       STAFF ROLE & BRANCH SCOPING (RBAC TEST)
    // ====================================================
    console.log('\n--- RBAC & BRANCH SCOPING SECURITY TESTS ---');

    // 25. STAFF LOGIN (STOCK CLERK IN GULSHAN)
    const r25 = await request('POST', '/api/v1/auth/login', {
        email: 'clerk@branchwork.demo',
        password: 'demo123',
    });
    assert('25. Staff Login (POST /api/v1/auth/login)', r25.status === 200 || r25.status === 201, `Status: ${r25.status}`);
    const clerkToken = r25.data?.data?.accessToken;

    // 26. STAFF GET /ME
    const r26 = await request('GET', '/api/v1/auth/me', null, clerkToken);
    assert('26. Staff Session Scoping (GET /api/v1/auth/me)', r26.status === 200 && r26.data?.data?.isOwner === false && r26.data?.data?.branch?.name === 'Gulshan', `Branch: ${r26.data?.data?.branch?.name}`);

    // 27. STAFF PRODUCT LIST (STRICTLY SCOPED TO GULSHAN)
    const r27 = await request('GET', '/api/v1/products', null, clerkToken);
    const allGulshan = r27.data?.data?.every(p => p.branchId === gulshanBranch.id);
    assert('27. Staff Branch Scoping (GET /api/v1/products -> Gulshan Only)', r27.status === 200 && allGulshan, `All Gulshan: ${allGulshan}, Count: ${r27.data?.data?.length}`);

    // 28. STAFF CANNOT CREATE PRODUCTS (EXPECT 403)
    const r28 = await request('POST', '/api/v1/products', {
        name: 'Hacked Product',
        sku: 'HCK-001',
        category: 'Grocery',
        price: 10,
        stock: 1,
        branchId: gulshanBranch.id,
    }, clerkToken);
    assert('28. IDOR Defense: Staff Cannot Create Product (POST /products -> 403)', r28.status === 403, `Status: ${r28.status}`);

    // 29. STAFF CANNOT DELETE PRODUCTS (EXPECT 403)
    const gulshanProd = r27.data?.data?.[0];
    const r29 = await request('DELETE', `/api/v1/products/${gulshanProd.id}`, null, clerkToken);
    assert('29. IDOR Defense: Staff Cannot Delete Product (DELETE /products/:id -> 403)', r29.status === 403, `Status: ${r29.status}`);

    // 30. STAFF CANNOT CREATE BRANCHES (EXPECT 403)
    const r30 = await request('POST', '/api/v1/branches', { name: 'Hacked Branch', city: 'Dhaka' }, clerkToken);
    assert('30. IDOR Defense: Staff Cannot Create Branch (POST /branches -> 403)', r30.status === 403, `Status: ${r30.status}`);

    // 31. STAFF CAN ORGANIZE OWN BRANCH PRODUCT (EXPECT 200)
    const r31 = await request('PATCH', `/api/v1/products/${gulshanProd.id}/organize`, {
        stock: 10,
        category: 'Grocery'
    }, clerkToken);
    assert('31. Staff Organize Product in Own Branch (PATCH /products/:id/organize -> 200)', r31.status === 200 && r31.data?.data?.stock === 10, `Status: ${r31.status}`);

    // 32. STAFF CANNOT ORGANIZE OTHER BRANCH PRODUCT (EXPECT 403)
    const dhanmondiProd = r18.data?.data?.find(p => p.branchId === dhanmondiBranch.id);
    const r32 = await request('PATCH', `/api/v1/products/${dhanmondiProd.id}/organize`, {
        stock: 99
    }, clerkToken);
    assert('32. IDOR Defense: Staff Cannot Organize Other Branch (PATCH /products/:id/organize -> 403)', r32.status === 403, `Status: ${r32.status}`);

    // 33. REGISTER ORGANIZATION
    const newOrgEmail = `test.org.${Date.now()}@branchwork.demo`;
    const r33 = await request('POST', '/api/v1/auth/register-org', {
        organizationName: 'Jamuna Supermarket',
        yourName: 'Tariq Anam',
        email: newOrgEmail,
        password: 'demo123',
    });
    assert('33. Register New Organization (POST /api/v1/auth/register-org)', r33.status === 201 && r33.data?.data?.user?.isOwner === true, `Status: ${r33.status}`);

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
}

runQaSuite().catch(err => {
    console.error('QA Runner error:', err);
    process.exit(1);
});
