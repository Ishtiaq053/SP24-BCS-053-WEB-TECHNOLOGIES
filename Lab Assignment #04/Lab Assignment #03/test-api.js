/**
 * WorkerFinder JWT API — Automated Test Suite
 * Run: node test-api.js
 * Server must be running on http://localhost:3000
 */

const http = require('http');

const BASE = 'http://localhost:3000';
let TOKEN     = '';
let WORKER_ID = '';

const results = [];
let passed = 0;
let failed = 0;

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url  = new URL(BASE + path);
        const opts = {
            hostname: url.hostname,
            port:     url.port || 80,
            path:     url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json', ...headers }
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (_) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function test(name, fn) {
    return fn().then(({ ok, details }) => {
        const icon = ok ? '✅' : '❌';
        console.log(`\n${icon} ${name}`);
        if (details) console.log(`   ${details}`);
        results.push({ name, ok });
        if (ok) passed++; else failed++;
    }).catch(err => {
        console.log(`\n❌ ${name}`);
        console.log(`   ERROR: ${err.message}`);
        results.push({ name, ok: false });
        failed++;
    });
}

async function runAllTests() {
    console.log('='.repeat(62));
    console.log('  WorkerFinder JWT API — Test Suite');
    console.log('='.repeat(62));

    // T01 ─ Public workers list
    await test('T01: GET /api/v1/workers (public)', async () => {
        const { status, body } = await request('GET', '/api/v1/workers');
        if (body.data?.workers?.length > 0) WORKER_ID = body.data.workers[0]._id;
        const ok = status === 200 && body.success === true && Array.isArray(body.data?.workers) && body.data?.pagination?.currentPage !== undefined;
        return { ok, details: `HTTP ${status} | workers:${body.data?.workers?.length} | pages:${body.data?.pagination?.totalPages} | workerId:${WORKER_ID}` };
    });

    // T02 ─ Workers with limit + sort filter
    await test('T02: GET /api/v1/workers?page=1&limit=3&sort=price_asc', async () => {
        const { status, body } = await request('GET', '/api/v1/workers?page=1&limit=3&sort=price_asc');
        const ok = status === 200 && body.success === true && body.data?.pagination?.limit === 3 && body.data?.filters?.sort === 'price_asc';
        return { ok, details: `HTTP ${status} | limit:${body.data?.pagination?.limit} | sort:${body.data?.filters?.sort}` };
    });

    // T03 ─ Workers with price range
    await test('T03: GET /api/v1/workers?minPrice=100&maxPrice=5000', async () => {
        const { status, body } = await request('GET', '/api/v1/workers?minPrice=100&maxPrice=5000');
        const ok = status === 200 && body.success === true;
        return { ok, details: `HTTP ${status} | workers:${body.data?.workers?.length}` };
    });

    // T04 ─ Single worker (valid ID)
    await test('T04: GET /api/v1/workers/:id (valid)', async () => {
        if (!WORKER_ID) return { ok: false, details: 'No workerId from T01' };
        const { status, body } = await request('GET', `/api/v1/workers/${WORKER_ID}`);
        const ok = status === 200 && body.success === true && body.data?.worker?._id;
        return { ok, details: `HTTP ${status} | name:${body.data?.worker?.name}` };
    });

    // T05 ─ Invalid ObjectId → 400
    await test('T05: GET /api/v1/workers/invalid-id → 400', async () => {
        const { status, body } = await request('GET', '/api/v1/workers/invalid-id-abc');
        const ok = status === 400 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T06 ─ Valid format but not in DB → 404
    await test('T06: GET /api/v1/workers/000000000000000000000000 → 404', async () => {
        const { status, body } = await request('GET', '/api/v1/workers/000000000000000000000000');
        const ok = status === 404 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T07 ─ API 404 handler
    await test('T07: GET /api/v1/nonexistent → 404 JSON', async () => {
        const { status, body } = await request('GET', '/api/v1/nonexistent');
        const ok = status === 404 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T08 ─ Login missing fields → 400
    await test('T08: POST /api/v1/auth/login — missing password → 400', async () => {
        const { status, body } = await request('POST', '/api/v1/auth/login', { email: 'x@x.com' });
        const ok = status === 400 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T09 ─ Login wrong credentials → 401 generic
    await test('T09: POST /api/v1/auth/login — wrong credentials → 401', async () => {
        const { status, body } = await request('POST', '/api/v1/auth/login', { email: 'nobody@x.com', password: 'bad' });
        const ok = status === 401 && body.success === false && body.message === 'Invalid credentials.';
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T10 ─ Login valid credentials → 200 + token
    await test('T10: POST /api/v1/auth/login — valid → 200 + token', async () => {
        const attempts = [
            { email: 'admin@workerfinder.com', password: 'admin123' },
            { email: 'admin@gmail.com',        password: 'admin123' },
            { email: 'ishtiaq@gmail.com',      password: 'ishtiaq123' },
            { email: 'test@test.com',          password: 'test123' },
            { email: 'user@workerfinder.com',  password: 'user123' },
        ];
        for (const creds of attempts) {
            const { status, body } = await request('POST', '/api/v1/auth/login', creds);
            if (status === 200 && body.success && body.token) {
                TOKEN = body.token;
                const passwordExposed = !!(body.user?.password || body.password);
                return { ok: true, details: `HTTP ${status} | email:${creds.email} | role:${body.user?.role} | tokenLength:${body.token.length} | passwordExposed:${passwordExposed}` };
            }
        }
        return { ok: false, details: 'All credential attempts failed. Check your DB for a registered user.' };
    });

    // T11 ─ Profile — no token → 401
    await test('T11: GET /api/v1/user/profile — no token → 401', async () => {
        const { status, body } = await request('GET', '/api/v1/user/profile');
        const ok = status === 401 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T12 ─ Profile — fake token → 403
    await test('T12: GET /api/v1/user/profile — fake token → 403', async () => {
        const { status, body } = await request('GET', '/api/v1/user/profile', null, { Authorization: 'Bearer fakeinvalidtoken12345' });
        const ok = status === 403 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T13 ─ Profile — valid token → 200, no password
    await test('T13: GET /api/v1/user/profile — valid token → 200, no password', async () => {
        if (!TOKEN) return { ok: false, details: 'No token — T10 must pass first' };
        const { status, body } = await request('GET', '/api/v1/user/profile', null, { Authorization: `Bearer ${TOKEN}` });
        const passwordExposed = body.data?.user?.password !== undefined;
        const ok = status === 200 && body.success === true && !passwordExposed;
        return { ok, details: `HTTP ${status} | name:${body.data?.user?.name} | passwordExposed:${passwordExposed}` };
    });

    // T14 ─ Orders — valid → 201
    await test('T14: POST /api/v1/orders — valid → 201', async () => {
        if (!TOKEN || !WORKER_ID) return { ok: false, details: 'Need token (T10) and workerId (T01)' };
        const { status, body } = await request('POST', '/api/v1/orders', {
            items: [{ workerId: WORKER_ID, workerName: 'QA Test Worker', price: 1500, quantity: 2 }],
            notes: 'Automated QA test order'
        }, { Authorization: `Bearer ${TOKEN}` });
        const ok = status === 201 && body.success === true && body.data?.order?._id;
        return { ok, details: `HTTP ${status} | orderId:${body.data?.order?._id} | totalAmount:${body.data?.order?.totalAmount} | status:${body.data?.order?.status}` };
    });

    // T15 ─ Orders — empty items → 400
    await test('T15: POST /api/v1/orders — empty items → 400', async () => {
        if (!TOKEN) return { ok: false, details: 'No token — T10 must pass' };
        const { status, body } = await request('POST', '/api/v1/orders', { items: [] }, { Authorization: `Bearer ${TOKEN}` });
        const ok = status === 400 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T16 ─ Orders — invalid workerId → 400
    await test('T16: POST /api/v1/orders — invalid workerId → 400', async () => {
        if (!TOKEN) return { ok: false, details: 'No token — T10 must pass' };
        const { status, body } = await request('POST', '/api/v1/orders', {
            items: [{ workerId: 'not-an-objectid', workerName: 'Worker', price: 1000, quantity: 1 }]
        }, { Authorization: `Bearer ${TOKEN}` });
        const ok = status === 400 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T17 ─ Orders — no token → 401
    await test('T17: POST /api/v1/orders — no token → 401', async () => {
        const { status, body } = await request('POST', '/api/v1/orders', {
            items: [{ workerId: WORKER_ID || '000000000000000000000000', workerName: 'X', price: 100 }]
        });
        const ok = status === 401 && body.success === false;
        return { ok, details: `HTTP ${status} | message: "${body.message}"` };
    });

    // T18 ─ Homepage still works (regression)
    await test('T18: GET / — homepage HTML still works (regression)', async () => {
        const { status } = await request('GET', '/');
        const ok = status === 200;
        return { ok, details: `HTTP ${status}` };
    });

    // T19 ─ Workers EJS page still works (regression)
    await test('T19: GET /workers — EJS catalog still works (regression)', async () => {
        const { status } = await request('GET', '/workers');
        const ok = status === 200;
        return { ok, details: `HTTP ${status}` };
    });

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(62));
    console.log('  FINAL RESULTS');
    console.log('='.repeat(62));
    console.log(`  Total:  ${results.length}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ❌`);
    console.log('='.repeat(62));

    if (failed === 0) {
        console.log('\n🎉  ALL TESTS PASSED — JWT API is fully functional!\n');
    } else {
        console.log('\n⚠️   Failed tests:');
        results.filter(r => !r.ok).forEach(r => console.log(`      ❌ ${r.name}`));
        console.log('');
    }
}

runAllTests().catch(err => { console.error('Runner error:', err.message); process.exit(1); });
