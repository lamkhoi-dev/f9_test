import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  try {
    // Database is optional — legacy endpoints work without it
    const hasDatabase = !!(process.env.DATABASE_URL || process.env.DB_NAME);
    
    if (hasDatabase) {
      try {
        const db = (await import('./models')).default;
        const User = (await import('./models/User')).default;

        await db.sequelize.authenticate();
        console.log('✅ PostgreSQL connected successfully');

        await db.sequelize.sync({ alter: false });
        console.log('✅ Database synced');

        // Seed default admin
        const adminPhone = '0900000000';
        const existing = await User.findOne({ where: { phone: adminPhone } });
        if (!existing) {
          await User.create({
            name: 'Admin',
            phone: adminPhone,
            password: '123456',
            role: 'admin',
          });
          console.log('🔑 Default admin created: 0900000000 / 123456');
        } else {
          existing.password = '123456';
          existing.role = 'admin';
          await existing.save();
          console.log('🔑 Default admin credentials verified & updated');
        }
      } catch (dbError: any) {
        console.warn('⚠️  Database not available:', dbError.message);
        console.warn('   Auth/Admin/Billing features disabled. Legacy endpoints still work.');
      }
    } else {
      console.log('ℹ️  No DATABASE_URL configured — running in legacy mode (no auth/admin/billing)');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API endpoint: /api`);
      console.log(`❤️  Health check: /api/health`);
      console.log(`🔧 Auth required: ${process.env.REQUIRE_AUTH !== 'false' ? 'YES' : 'NO (guest mode)'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();

