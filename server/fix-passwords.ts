import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

const dbUrl = 'postgresql://postgres:NRNLclpEeXuzfLGSaYiaNXSCesRCNiZG@turntable.proxy.rlwy.net:42949/railway';

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function run() {
  try {
    const salt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('123456', salt);

    // Find users with invalid password lengths (bcrypt hash is exactly 60 chars)
    const [users] = await sequelize.query("SELECT id, phone, password FROM users WHERE length(password) != 60");
    console.log(`Found ${users.length} users with corrupted passwords.`);

    for (const u of users as any[]) {
      // If the password was stored as plain text, re-hash it. Otherwise use default 123456
      let newHash = defaultHash;
      if (u.password && u.password.length >= 6) {
        newHash = await bcrypt.hash(u.password, salt);
      }
      await sequelize.query("UPDATE users SET password = :hash WHERE id = :id", {
        replacements: { hash: newHash, id: u.id }
      });
      console.log(`Fixed password for user: ${u.phone}`);
    }
    console.log('Done fixing passwords.');
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}
run();
