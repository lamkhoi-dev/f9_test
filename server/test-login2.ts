import fetch from 'node-fetch';

async function testLogin(phone: string, password: string) {
  const res = await fetch('https://f9test-production-f000.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const json = await res.json();
  console.log(`[${phone}] => HTTP ${res.status}:`, JSON.stringify(json));
}

async function main() {
  await testLogin('0906133027', '123456');
  await testLogin('0900000000', '123456');
  await testLogin('0123456789', '123456');
}
main();
