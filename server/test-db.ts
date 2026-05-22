import { Sequelize } from 'sequelize';

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
    const [results, metadata] = await sequelize.query("SELECT id, phone, name, role FROM users LIMIT 10");
    console.log(results);
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}
run();
