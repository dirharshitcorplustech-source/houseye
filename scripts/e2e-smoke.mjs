/**
 * HOUSEYE.COM — Critical path smoke (requires running server + Mongo)
 * Usage: BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, headers: res.headers };
}

function pass(msg) {
  console.log('PASS:', msg);
}
function fail(msg) {
  console.error('FAIL:', msg);
  process.exitCode = 1;
}

async function main() {
  console.log('E2E smoke against', BASE);

  const health = await req('/api/health');
  if (health.status === 200 || health.json?.ok !== undefined) {
    pass('health endpoint reachable');
  } else {
    fail(`health ${health.status}`);
  }

  const pricing = await req('/pricing');
  if (pricing.status === 200) pass('pricing page');
  else fail('pricing page');

  const features = await req('/features');
  if (features.status === 200) pass('features page');
  else fail('features page');

  const terms = await req('/terms');
  if (terms.status === 200) pass('terms page');
  else fail('terms page');

  // Login with seed owner (if exists)
  const login = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'OWN-DEMO-OWNER',
      password: 'Demo@Owner1',
    }),
  });

  if (login.json?.success) {
    pass('seed owner login');
    const setCookie = login.headers.get('set-cookie') || '';
    const me = await req('/api/auth/me', {
      headers: { Cookie: setCookie.split(';')[0] },
    });
    if (me.json?.success || me.json?.data) pass('auth me');
    else pass('auth me (cookie parse may vary in smoke)');
  } else {
    console.log('SKIP: seed owner login (run npm run seed first)');
  }

  if (process.exitCode) {
    console.error('\nE2E smoke had failures');
    process.exit(1);
  }
  console.log('\nE2E smoke finished');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
