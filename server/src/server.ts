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

        // Seed default landing content (only if tables are empty)
        const LandingSlide = (await import('./models/LandingSlide')).default;
        const ShowcaseTab = (await import('./models/ShowcaseTab')).default;
        const FeatureCard = (await import('./models/FeatureCard')).default;
        const BlogPost = (await import('./models/BlogPost')).default;

        const slideCount = await LandingSlide.count();
        if (slideCount === 0) {
          await LandingSlide.bulkCreate([
            { imageUrl: 'https://images.unsplash.com/photo-1628102491629-77858ab57fae?auto=format&fit=crop&w=1200&q=80', altText: 'Architecture render 1', sortOrder: 0, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80', altText: 'Architecture render 2', sortOrder: 1, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=1200&q=80', altText: 'Architecture render 3', sortOrder: 2, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80', altText: 'Architecture render 4', sortOrder: 3, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1510627489-b251ce0711fa?auto=format&fit=crop&w=1200&q=80', altText: 'Architecture render 5', sortOrder: 4, isActive: true },
          ]);
          console.log('🖼️  Landing slides seeded (5 slides)');
        }

        const tabCount = await ShowcaseTab.count();
        if (tabCount === 0) {
          await ShowcaseTab.bulkCreate([
            {
              tabKey: 'architecture', titleVi: 'Kiến Trúc', titleEn: 'Architecture',
              descriptionVi: 'Tạo ảnh render chân thực từ bản vẽ tay hoặc ảnh chụp mô hình SketchUp 3D.',
              descriptionEn: 'Create realistic renders from hand drawings or 3D SketchUp model screenshots.',
              originalImageUrl: 'https://images.unsplash.com/photo-1628102491629-77858ab57fae?auto=format&fit=crop&w=800&q=80',
              renderImageUrls: JSON.stringify([
                'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1510627489-b251ce0711fa?auto=format&fit=crop&w=400&q=80',
              ]),
              sortOrder: 0, isActive: true,
            },
            {
              tabKey: 'interior', titleVi: 'Nội Thất', titleEn: 'Interior',
              descriptionVi: 'Biến không gian trống thành các concept nội thất đa dạng phong cách.',
              descriptionEn: 'Turn empty spaces into interior concepts with diverse styles.',
              originalImageUrl: 'https://images.unsplash.com/photo-1523217582562-5ec804b4d6df?auto=format&fit=crop&w=800&q=80',
              renderImageUrls: JSON.stringify([
                'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1493809842364-4bf803b9ad1b?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
              ]),
              sortOrder: 1, isActive: true,
            },
            {
              tabKey: 'landscape', titleVi: 'Cảnh Quan', titleEn: 'Landscape',
              descriptionVi: 'Render mặt bằng tổng thể với cây xanh, ánh sáng và vật liệu chân thực.',
              descriptionEn: 'Render master plans with realistic greenery, lighting, and materials.',
              originalImageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
              renderImageUrls: JSON.stringify([
                'https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1542361345-89e58247f2d5?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1448630360428-14433d9ca9d9?auto=format&fit=crop&w=400&q=80',
              ]),
              sortOrder: 2, isActive: true,
            },
          ]);
          console.log('🏛️  Showcase tabs seeded (3 tabs)');
        }

        const cardCount = await FeatureCard.count();
        if (cardCount === 0) {
          await FeatureCard.bulkCreate([
            {
              cardKey: 'editing', sortOrder: 0,
              titleVi: 'Chỉnh Sửa & Vẽ Lại', titleEn: 'Edit & Repaint',
              descriptionVi: 'Chọn vùng, tô đè lên vùng đó và AI sẽ tái tạo hoàn toàn chi tiết mới.', descriptionEn: 'Select an area, paint over it, and AI will completely regenerate new details.',
              beforeImageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80',
              afterImageUrl: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80',
              extraImageUrls: '[]',
            },
            {
              cardKey: 'mixing', sortOrder: 1,
              titleVi: 'Mix Phong Cách', titleEn: 'Style Mixing',
              descriptionVi: 'Kết hợp nhiều ảnh tham khảo để tạo ra một không gian độc đáo mang phong cách riêng.', descriptionEn: 'Combine multiple reference images to create a unique space with a personal style.',
              beforeImageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
              afterImageUrl: 'https://images.unsplash.com/photo-1493809842364-4bf803b9ad1b?auto=format&fit=crop&w=800&q=80',
              extraImageUrls: '[]',
            },
            {
              cardKey: 'perspectives', sortOrder: 2,
              titleVi: 'Đa Góc Nhìn', titleEn: 'Multiple Perspectives',
              descriptionVi: 'Tạo nhiều góc nhìn khác nhau từ một ảnh gốc duy nhất chỉ trong vài giây.', descriptionEn: 'Generate multiple different perspectives from a single original image in seconds.',
              beforeImageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80',
              afterImageUrl: '',
              extraImageUrls: JSON.stringify([
                'https://images.unsplash.com/photo-1628102491629-77858ab57fae?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1510627489-b251ce0711fa?auto=format&fit=crop&w=400&q=80',
              ]),
            },
          ]);
          console.log('🎨 Feature cards seeded (3 cards)');
        }

        const blogCount = await BlogPost.count();
        if (blogCount === 0) {
          await BlogPost.bulkCreate([
            { imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', tagVi: 'XU HƯỚNG AI', tagEn: 'AI TRENDS', titleVi: 'Tương lai của Kiến trúc: Sự trỗi dậy của AI Rendering', titleEn: 'The Future of Architecture: The Rise of AI Rendering', excerptVi: 'Công nghệ Trí tuệ Nhân tạo (AI) đang định hình lại cách chúng ta thiết kế và giới thiệu các dự án kiến trúc...', excerptEn: 'Artificial Intelligence (AI) technology is reshaping how we design and present architectural projects...', sortOrder: 0, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1600607687931-cebf574fd842?auto=format&fit=crop&w=800&q=80', tagVi: 'CÔNG CỤ', tagEn: 'TOOLS', titleVi: '5 Công Cụ AI Biến Bản Vẽ Thành Render Thực Tế Trong Giây Lát', titleEn: '5 AI Tools to Turn Drawings into Realistic Renders in Seconds', excerptVi: 'Khám phá các phần mềm mạnh mẽ có khả năng biến bản phác thảo thô thành hình ảnh photorealistic ngay lập tức...', excerptEn: 'Discover powerful software capable of turning rough sketches into photorealistic images instantly...', sortOrder: 1, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80', tagVi: 'GÓC NHÌN', tagEn: 'PERSPECTIVE', titleVi: 'AI Sẽ Thay Thế Diễn Họa Viên Không? Cơ Hội Hay Thách Thức?', titleEn: 'Will AI Replace 3D Artists? Opportunity or Challenge?', excerptVi: 'Nhiều người e ngại AI sẽ cướp đi công việc của các họa viên 3D, nhưng sự thật có phải như vậy?...', excerptEn: 'Many fear that AI will steal the jobs of 3D artists, but is that the truth?...', sortOrder: 2, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', tagVi: 'TUTORIALS', tagEn: 'TUTORIALS', titleVi: 'Cách Ứng Dụng Midjourney & Stable Diffusion Trong Thiết Kế Nội Thất', titleEn: 'How to Apply Midjourney & Stable Diffusion in Interior Design', excerptVi: 'Hướng dẫn từng bước cách sử dụng các mô hình AI tạo ảnh phổ biến nhất để lên ý tưởng không gian nội thất...', excerptEn: 'Step-by-step guide on how to use the most popular AI image generation models to ideate interior spaces...', sortOrder: 3, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', tagVi: 'GIẢI PHÁP', tagEn: 'SOLUTION', titleVi: 'Tối Ưu Quy Trình Làm Việc Cho Studio Kiến Trúc Với AI', titleEn: 'Optimizing Workflow for Architecture Studios with AI', excerptVi: 'Làm thế nào để tích hợp workflow AI vào studio của bạn để tiết kiệm thời gian...', excerptEn: 'How to integrate AI workflow into your studio to save time and improve product quality...', sortOrder: 4, isActive: true },
            { imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80', tagVi: 'SO SÁNH', tagEn: 'COMPARISON', titleVi: 'Render AI và Render Truyền Thống: Chất lượng, Tốc độ, Chi phí', titleEn: 'AI Rendering vs Traditional Rendering: Quality, Speed, Cost', excerptVi: 'Bài kiểm tra chi tiết đặt lên bàn cân sức mạnh của các trình render phổ thông và AI...', excerptEn: 'A detailed test weighting the power of popular renderers against AI image generation...', sortOrder: 5, isActive: true },
          ]);
          console.log('📝 Blog posts seeded (6 posts)');
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
