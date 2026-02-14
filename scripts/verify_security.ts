// import { fetch } from 'undici';

const BASE_URL = 'http://localhost:8787';

async function runTests() {
    console.log('Starting Security Verification...');

    // 1. Check Security Headers
    try {
        const res = await fetch(`${BASE_URL}/api/config`);
        const headers = res.headers;
        console.log('[Test 1] Security Headers:');
        if (headers.get('x-content-type-options') === 'nosniff') console.log('  ✅ X-Content-Type-Options: nosniff');
        else console.log('  ❌ Missing/Wrong X-Content-Type-Options');

        if (headers.get('strict-transport-security')) console.log('  ✅ HSTS Present');
        else console.log('  ⚠️ HSTS Missing (Expected for localhost maybe, but should be in middleware)');

    } catch (e) {
        console.error('Failed to connect to API. Is it running?', e);
        return;
    }

    // 2. Validation Test (Register)
    console.log('\n[Test 2] Input Validation (Register):');
    const regRes = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'a', password: '123' }) // Too short
    });

    if (regRes.status === 400) {
        const data = await regRes.json();
        console.log('  ✅ Rejected short username/password:', JSON.stringify(data));
    } else {
        console.log(`  ❌ Failed: Expected 400, got ${regRes.status}`);
    }

    // 3. Rate Limit Test (Auth)
    console.log('\n[Test 3] Rate Limit (Auth):');
    let hitLimit = false;
    for (let i = 0; i < 15; i++) {
        const res = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test', password: 'password', token: 'skip' })
        });
        if (res.status === 429) {
            console.log(`  ✅ Rate limit triggered on request #${i + 1}`);
            hitLimit = true;
            break;
        }
    }
    if (!hitLimit) console.log('  ❌ Failed to trigger rate limit');

    console.log('\nVerification Complete.');
}

runTests();
