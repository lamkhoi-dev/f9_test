import { Sequelize } from 'sequelize';
import fetch from 'node-fetch';

const dbUrl = 'postgresql://localhost:5432/f9_rendering';

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
});

async function runTest() {
  console.log('🏁 Starting SePay webhook integration test...');
  try {
    const testUserId = '5ad95d0a-9215-49eb-ba52-5b4aa7040304';
    const testOrderId = '5ad95d0a-9215-49eb-ba52-5b4aa7040303';
    const orderCode = 'F9R99999';

    // 1. Check/Create dummy user
    const [userRows] = await sequelize.query(
      `INSERT INTO users (id, name, phone, password, role, plan, balance, "createdAt", "updatedAt") 
       VALUES ('${testUserId}', 'Test Webhook User', '0987654321', 'password123', 'user', 'free', 100, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET plan = 'free', balance = 100
       RETURNING id, phone, plan, balance`
    );
    const testUser = (userRows as any)[0];
    console.log(`👤 Test User initialized: Phone=${testUser.phone}, Plan=${testUser.plan}, Balance=${testUser.balance}`);

    // 2. Check/Create Payment Order
    await sequelize.query(`DELETE FROM "payment_orders" WHERE "orderCode" = '${orderCode}'`);
    const [orderRows] = await sequelize.query(
      `INSERT INTO "payment_orders" (id, "userId", "packageName", credits, amount, "orderCode", status, "gatewayResponse", "createdAt", "updatedAt") 
       VALUES ('${testOrderId}', '${testUserId}', 'PRO', 7000, 599000, '${orderCode}', 'pending', '{}', NOW(), NOW())
       RETURNING id, "orderCode", status`
    );
    const order = (orderRows as any)[0];
    console.log(`📦 Pending Order created: Code=${order.orderCode}, Status=${order.status}`);

    // 3. Post to SePay Webhook Endpoint
    console.log('📡 Sending simulated SePay webhook request to /api/payment/sepay-webhook...');
    const response = await fetch('http://localhost:3001/api/payment/sepay-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Apikey f9rendering2024secret',
      },
      body: JSON.stringify({
        id: 1234567,
        gateway: 'Vietcombank',
        transactionDate: '2026-06-07 14:20:00',
        accountNumber: '1234567890',
        subAccount: 'F9RENDER',
        transferType: 'in',
        transferAmount: 599000,
        accumulatedBalance: 12000000,
        code: 'SEPAY123',
        transactionContent: 'F9R99999 chuyen khoan nap credit',
        referenceNumber: 'REF123456789',
        body: 'Full transaction text from bank sms/email'
      }),
    });

    const responseBody = await response.json();
    console.log('📥 Webhook response status:', response.status);
    console.log('📥 Webhook response body:', responseBody);

    // 4. Verify Database Changes
    const [updatedUserRows] = await sequelize.query(
      `SELECT id, name, phone, plan, balance FROM users WHERE id = '${testUserId}'`
    );
    const updatedUser = (updatedUserRows as any)[0];

    const [updatedOrderRows] = await sequelize.query(
      `SELECT id, "orderCode", status FROM "payment_orders" WHERE id = '${testOrderId}'`
    );
    const updatedOrder = (updatedOrderRows as any)[0];

    console.log('\n🔍 Verification Results:');
    console.log(`- Order Code: ${updatedOrder.orderCode}`);
    console.log(`- Order Status: ${updatedOrder.status} (Expected: completed)`);
    console.log(`- User Plan: ${updatedUser.plan} (Expected: pro)`);
    console.log(`- User Balance: ${updatedUser.balance} (Expected: 7100)`);

    if (
      updatedOrder.status === 'completed' &&
      updatedUser.plan === 'pro' &&
      updatedUser.balance === 7100
    ) {
      console.log('✅ SUCCESS: Webhook successfully credited user and upgraded plan to PRO!');
    } else {
      console.error('❌ FAILURE: Database values do not match expected outcomes.');
    }

  } catch (error) {
    console.error('❌ Error during webhook test:', error);
  } finally {
    await sequelize.close();
  }
}

runTest();
