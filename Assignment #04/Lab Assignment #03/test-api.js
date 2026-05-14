/**
 * WorkerFinder JWT API — Automated Test Suite
 * Run: node test-api.js
 * Server must be running on http://localhost:3000
 */

const http = require('http');

const BASE = 'http://localhost:3000';
let TOKEN = '';         // filled after login test
let WORKER_ID = '';    // filled after workers list test

const results = [];
let passed = 0;
let failed = 0;

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url  = new URL(BASE + path);
        const opts = {
            hostname: url.hostname,
            port:     url.port || 80,
            path:     url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (_) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// ─── Test runner ─────────────────────────────────────────────────────────────

function test(name, fn) {
    return fn().then(({ ok, details }) => {
        const icon = ok ? '✅' : '❌';
        const status = ok ? 'PASS' : 'FAIL';
        console.log(`\n${icon} TEST: ${name}`);
        if (details) console.log(`   ${details}`);
        results.push({ name, ok, details });
        if (ok) passed++; else failed++;
    }).catch(err => {
        console.log(`\n❌ TEST: ${name}`);
        console.log(`   ERROR: ${err.message}`);
        results.push({ name, ok: false, details: `ERROR: ${err.message}` });
        failed++;
    });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runAllTests() {
    console.log('='.repeat(60));
    console.log('  WorkerFinder JWT API — Test Suite');
    console.log('='.repeat(60));

    // ── T01: GET /api/v1/workers (public) ────────────────────────────────────
    await test('T01: GET /api/v1/workers (public, no params)', async () => {
        const { status, body } = await request('GET', '/api/v1/workers');
        const ok = status === 200 && body.success === true &&
                   Array.isArray(body.data?.workers) &&
                   body.data?.pagination?.currentPage !== undefined;
        // Save a workerId for later tests
        if (body.data?.workers?.length > 0) {
            WORKER_ID = body.data.workers[0]._id;
        }
        return {
            ok,
            details: `HTTP ${status} | success:${body.success} | workers:${body.data?.workers?.length} | pages:${body.data?.pagination?.totalPages} | workerId saved: ${WORKER_ID}`
        };
    });

    // ── T02: GET /api/v1/workers with filters ─────────────────────────────────
    await test('T02: GET /api/v1/workers?page=1&limit=3&sort=price_asc', async () => {
        const { status, body } = await request('GET', '/api/v1/workers?page=1&limit=3&sort=price_asc');
        const ok = status === 200 && body.success === true &&
                   body.data?.pagination?.limit === 3 &&
                   body.data?.filters?.sort === 'price_asc';
        return {
            ok,
            details: `HTTP ${status} | limit:${body.data?.pagination?.limit} | sort filter:${body.data?.filters?.sort}`
        };
    });

    // ── T03: GET /api/v1/workers with price filter ────────────────────────────
    await test('T03: GET /api/v1/workers?minPrice=100&maxPrice=5000', async () => {
        const { status, body } = await request('GET', '/api/v1/workers?minPrice=100&maxPrice=5000');
        const ok = status === 200 && body.success === true;
        return {
            ok,
            details: `HTTP ${status} | success:${body.success} | workers:${body.data?.workers?.length}`
        };
    });

    // ── T04: GET /api/v1/workers/:id (valid ID) ───────────────────────────────
    await test('T04: GET /api/v1/workers/:id (valid ID)', async () => {
        if (!WORKER_ID) return { ok: false, details: 'No workerId available from T01' };
        const { status, body } = await request('GET', `/api/v1/workers/${WORKER_ID}`);
        const ok = status === 200 && body.success === true && body.data?.worker?._id;
        return {
            ok,
            details: `HTTP ${status} | success:${body.success} | name:${body.data?.worker?.name}`
        };
    });

    // ── T05: GET /api/v1/workers/:id (invalid ObjectId) ───────────────────────
    await test('T05: GET /api/v1/workers/invalid-id-abc (invalid ObjectId → 400)', async () => {
        const { status, body } = await request('GET', '/api/v1/workers/invalid-id-abc');
        const ok = status === 400 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T06: GET /api/v1/workers/:id (valid format, not in DB) ───────────────
    await test('T06: GET /api/v1/workers/000000000000000000000000 (valid ID, not found → 404)', async () => {
        const { status, body } = await request('GET', '/api/v1/workers/000000000000000000000000');
        const ok = status === 404 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T07: API 404 handler ──────────────────────────────────────────────────
    await test('T07: GET /api/v1/nonexistent-route → API 404 JSON', async () => {
        const { status, body } = await request('GET', '/api/v1/nonexistent-route');
        const ok = status === 404 && body.success === false && typeof body.message === 'string';
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T08: POST /api/v1/auth/login — missing fields ─────────────────────────
    await test('T08: POST /api/v1/auth/login — missing password → 400', async () => {
        const { status, body } = await request('POST', '/api/v1/auth/login', { email: 'test@test.com' });
        const ok = status === 400 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T09: POST /api/v1/auth/login — wrong credentials ─────────────────────
    await test('T09: POST /api/v1/auth/login — wrong credentials → 401 generic', async () => {
        const { status, body } = await request('POST', '/api/v1/auth/login', {
            email: 'nobody@example.com',
            password: 'wrongpassword'
        });
        const ok = status === 401 && body.success === false && body.message === 'Invalid credentials.';
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T10: POST /api/v1/auth/login — valid credentials ─────────────────────
    await test('T10: POST /api/v1/auth/login — valid credentials → 200 + token', async () => {
        // Try admin first, then common test accounts
        const attempts = [
            { email: 'admin@workerfinder.com', password: 'admin123' },
            { email: 'admin@gmail.com',        password: 'admin123' },
            { email: 'ishtiaq@gmail.com',      password: 'ishtiaq123' },
            { email: 'test@test.com',          password: 'test123' },
        ];

        let loginOk = false;
        let detail  = '';
        for (const creds of attempts) {
            const { status, body } = await request('POST', '/api/v1/auth/login', creds);
            if (status === 200 && body.success && body.token) {
                TOKEN = body.token;
                loginOk = true;
                detail  = `HTTP ${status} | email:${creds.email} | token obtained | user.role:${body.user?.role} | password NOT in response:${!body.user?.password && !body.password}`;
                break;
            }
            detail = `tried ${creds.email}: HTTP ${status}`;
        }

        if (!loginOk) {
            detail = 'All credential attempts failed — please seed a user or use a known account. ' + detail;
        }
        return { ok: loginOk, details: detail };
    });

    // ── T11: GET /api/v1/user/profile — no token → 401 ───────────────────────
    await test('T11: GET /api/v1/user/profile — no token → 401', async () => {
        const { status, body } = await request('GET', '/api/v1/user/profile');
        const ok = status === 401 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T12: GET /api/v1/user/profile — fake token → 403 ─────────────────────
    await test('T12: GET /api/v1/user/profile — fake token → 403', async () => {
        const { status, body } = await request('GET', '/api/v1/user/profile', null, {
            Authorization: 'Bearer fakeinvalidtoken12345abcdef'
        });
        const ok = status === 403 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T13: GET /api/v1/user/profile — valid token → 200 ────────────────────
    await test('T13: GET /api/v1/user/profile — valid token → 200, no password', async () => {
        if (!TOKEN) return { ok: false, details: 'No token available — T10 must pass first' };
        const { status, body } = await request('GET', '/api/v1/user/profile', null, {
            Authorization: `Bearer ${TOKEN}`
        });
        const hasPassword = body.data?.user?.password !== undefined;
        const ok = status === 200 && body.success === true && !hasPassword;
        return {
            ok,
            details: `HTTP ${status} | success:${body.success} | name:${body.data?.user?.name} | passwordExposed:${hasPassword}`
        };
    });

    // ── T14: POST /api/v1/orders — valid → 201 ───────────────────────────────
    await test('T14: POST /api/v1/orders — valid payload → 201', async () => {
        if (!TOKEN)     return { ok: false, details: 'No token — T10 must pass' };
        if (!WORKER_ID) return { ok: false, details: 'No workerId — T01 must pass' };

        const { status, body } = await request('POST', '/api/v1/orders', {
            items: [{ workerId: WORKER_ID, workerName: 'Test Worker', price: 1500, quantity: 2 }],
            notes: 'Automated QA test order'
        }, {
            Authorization: `Bearer ${TOKEN}`
        });
        const ok = status === 201 && body.success === true && body.data?.order?._id;
        return {
            ok,
            details: `HTTP ${status} | success:${body.success} | orderId:${body.data?.order?._id} | totalAmount:${body.data?.order?.totalAmount} | status:${body.data?.order?.status}`
        };
    });

    // ── T15: POST /api/v1/orders — empty items → 400 ─────────────────────────
    await test('T15: POST /api/v1/orders — empty items array → 400', async () => {
        if (!TOKEN) return { ok: false, details: 'No token — T10 must pass' };
        const { status, body } = await request('POST', '/api/v1/orders', { items: [] }, {
            Authorization: `Bearer ${TOKEN}`
        });
        const ok = status === 400 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T16: POST /api/v1/orders — invalid workerId → 400 ────────────────────
    await test('T16: POST /api/v1/orders — invalid workerId → 400', async () => {
        if (!TOKEN) return { ok: false, details: 'No token — T10 must pass' };
        const { status, body } = await request('POST', '/api/v1/orders', {
            items: [{ workerId: 'not-an-objectid', workerName: 'Worker', price: 1000, quantity: 1 }]
        }, {
            Authorization: `Bearer ${TOKEN}`
        });
        const ok = status === 400 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T17: POST /api/v1/orders — no token → 401 ────────────────────────────
    await test('T17: POST /api/v1/orders — no token → 401', async () => {
        const { status, body } = await request('POST', '/api/v1/orders', {
            items: [{ workerId: WORKER_ID || '000000000000000000000000', workerName: 'X', price: 100, quantity: 1 }]
        });
        const ok = status === 401 && body.success === false;
        return {
            ok,
            details: `HTTP ${status} | message: "${body.message}"`
        };
    });

    // ── T18: Existing homepage still works ────────────────────────────────────
    await test('T18: GET / — homepage still responds (session site not broken)', async () => {
        const { status } = await request('GET', '/');
        const ok = status === 200;
        return {
            ok,
            details: `HTTP ${status} (HTML page — website still functional)`
        };
    });

    // ── T19: Existing workers page still works ────────────────────────────────
    await test('T19: GET /workers — session workers page still responds', async () => {
        const { status } = await request('GET', '/workers');
        const ok = status === 200;
        return {
            ok,
            details: `HTTP ${status} (EJS rendered HTML — not broken by API layer)`
        };
    });

    // ─── Final Summary ────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('  FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`  Total:  ${results.length}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ❌`);
    console.log('='.repeat(60));

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED — JWT API layer is fully functional!');
    } else {
        console.log('\n⚠️  Some tests failed. Review details above.');
        console.log('\nFailed tests:');
        results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.name}`));
    }
    console.log('');
}

runAllTests().catch(err => {
    console.error('Test runner crashed:', err.message);
    process.exit(1);
});
