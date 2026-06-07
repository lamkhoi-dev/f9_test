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

        await db.sequelize.sync({ alter: true });
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

        // Seed default image resolution pricing (upsert — safe to re-run on every boot)
        const Pricing = (await import('./models/Pricing')).default;
        const defaultPricing = [
          { model: 'image-generation', resolution: '1k', service: 'all', price: 10 },
          { model: 'image-generation', resolution: '2k', service: 'all', price: 20 },
          { model: 'image-generation', resolution: '4k', service: 'all', price: 30 },
        ];
        for (const p of defaultPricing) {
          await Pricing.upsert(p);
        }
        console.log('💰 Pricing seeded: 1K=10cr, 2K=20cr, 4K=30cr');

        // Seed default coin packages
        const PricingPackage = (await import('./models/PricingPackage')).default;
        const packageCount = await PricingPackage.count();
        if (packageCount === 0) {
          await PricingPackage.bulkCreate([
            {
              name: 'STARTER',
              credits: 3000,
              originalPrice: 349000,
              price: 299000,
              discount: '-14%',
              durationMonths: 1,
              popular: false,
              theme: 'purple',
              features: [
                'Tổng 3.000 Credits',
                'Gói tiêu chuẩn',
                'Hạn sử dụng: 1 Tháng',
                'Truy cập tất cả công cụ AI',
                'Render tốc độ tiêu chuẩn',
                'Hỗ trợ ưu tiên 24/7',
                'Tính năng truy cập sớm'
              ],
            },
            {
              name: 'PRO',
              credits: 7000,
              originalPrice: 700000,
              price: 599000,
              discount: '-14%',
              durationMonths: 3,
              popular: true,
              theme: 'orange',
              features: [
                'Tổng 7.000 Credits',
                'Hạn sử dụng: 3 Tháng',
                'Tối ưu chi phí & hiệu năng',
                'Truy cập tất cả công cụ AI',
                'Render tốc độ cao',
                'Hỗ trợ ưu tiên 24/7',
                'Tính năng truy cập sớm'
              ],
            },
            {
              name: 'ULTRA',
              credits: 25000,
              originalPrice: 2500000,
              price: 1999000,
              discount: '-20%',
              durationMonths: 6,
              popular: false,
              theme: 'purple',
              features: [
                'Tổng 25.000 Credits',
                'Hạn sử dụng: 6 Tháng',
                'Chi phí rẻ nhất/credit',
                'Truy cập tất cả công cụ AI',
                'Render tốc độ siêu tốc',
                'Hỗ trợ ưu tiên 24/7',
                'Tính năng truy cập sớm'
              ],
            },
          ]);
          console.log('📦 Default packages seeded: STARTER, PRO, ULTRA');
        }

        // Seed default prompt library (3 categories + 24 prompts)
        const { seedPromptLibrary } = await import('./seedPrompts');
        await seedPromptLibrary();

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
