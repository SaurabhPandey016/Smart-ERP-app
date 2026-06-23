(async () => {
  const base = 'http://localhost:5000/api';
  const fetch = globalThis.fetch || (await import('node-fetch')).default;

  const email = 'smoketest@example.com';
  const password = 'password123';

  async function req(path, opts = {}) {
    const res = await fetch(base + path, opts);
    const txt = await res.text();
    try { return { ok: res.ok, status: res.status, data: JSON.parse(txt) }; } catch { return { ok: res.ok, status: res.status, text: txt }; }
  }

  // Try login
  let r = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!r.ok) {
    console.log('Registering test user...');
    r = await req('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Smoke Tester', email, password }) });
    console.log('Register result:', r.status, r.data || r.text);
    r = await req('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  }
  if (!r.ok) return console.error('Login failed', r);
  const token = r.data.data.token;
  console.log('Logged in, token length:', token.length);

  const auth = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };

  // Create company
  const companyPayload = { name: 'SmokeCo', address: '1 Test Lane', gstNumber: 'SMK123' };
  let c = await req('/companies', { method: 'POST', headers: auth.headers, body: JSON.stringify(companyPayload) });
  if (!c.ok && c.status === 409) {
    console.log('Company create returned', c.status, c.data || c.text);
  }
  console.log('Company create:', c.status, c.data || c.text);
  const companyId = (c.data && c.data.data && c.data.data.id) || (await req('/companies', { headers: auth.headers })).data.data[0].id;
  console.log('Using companyId:', companyId);

  // Create ledger
  const ledger = await req(`/${companyId}/ledgers`, { method: 'POST', headers: auth.headers, body: JSON.stringify({ name: 'Test Customer', type: 'CUSTOMER' }) });
  console.log('Ledger create:', ledger.status, ledger.data || ledger.text);

  // Create unit and stock item
  const unit = await req(`/${companyId}/stock/units`, { method: 'POST', headers: auth.headers, body: JSON.stringify({ name: 'Pieces', symbol: 'PCS' }) });
  console.log('Unit create:', unit.status);
  const unitId = unit.data?.data?.id;
  const item = await req(`/${companyId}/stock/items`, { method: 'POST', headers: auth.headers, body: JSON.stringify({ name: 'Test Item', sku: 'TI-001', purchasePrice: 100, sellingPrice: 150, currentStock: 10, gstPercent: 18, unitId }) });
  console.log('Item create:', item.status, item.data || item.text);
  const itemId = item.data?.data?.id;

  // Create voucher (sales)
  const voucher = await req(`/${companyId}/vouchers`, { method: 'POST', headers: auth.headers, body: JSON.stringify({ type: 'SALES', date: new Date().toISOString(), partyLedgerId: ledger.data?.data?.id || null, items: [{ stockItemId: itemId, description: 'Sale', quantity: 2, rate: 150, gstPercent: 18 }] }) });
  console.log('Voucher create:', voucher.status, voucher.data || voucher.text);

  process.exit(0);
})();
