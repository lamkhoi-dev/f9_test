import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

const dbUrl = 'postgresql://postgres:NRNLclpEeXuzfLGSaYiaNXSCesRCNiZG@turntable.proxy.rlwy.net:42949/railway';

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    }
  }
});

async function run() {
  try {
    const [results] = await sequelize.query("SELECT id, phone, password FROM users WHERE phone = '0900000000' OR phone = '0906133027'");
    for (const user of results as any[]) {
      console.log(`Phone: ${user.phone}`);
      console.log(`Hash: ${user.password}`);
      const isMatch = await bcrypt.compare('123456', user.password);
      console.log(`Match for 123456: ${isMatch}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}
run();
