/**
 * Seed default prompt library data into DB.
 * Called once during server startup — uses findOrCreate so it's safe to re-run.
 */
import PromptCategory from './models/PromptCategory';
import Prompt from './models/Prompt';

const SEED_CATEGORIES = [
  {
    name: 'Nhà Phố',
    description: 'Khám phá các mẫu thiết kế nhà phố hiện đại, tối ưu diện tích.',
    sortOrder: 1,
  },
  {
    name: 'Biệt Thự',
    description: 'Các công trình biệt thự đẳng cấp, sân vườn và phong cách tân cổ điển.',
    sortOrder: 2,
  },
  {
    name: 'Nội Thất',
    description: 'Ý tưởng không gian sống tinh tế từ phòng khách đến phòng ngủ.',
    sortOrder: 3,
  },
];

interface SeedPrompt {
  title: string;
  content: string;
  thumbnail: string;
  tier: 'free' | 'pro';
  sortOrder: number;
}

const NHA_PHO_PROMPTS: SeedPrompt[] = [
  {
    title: 'Mẫu nhà phố 1',
    content: 'Ảnh thực tế của công trình Kiến trúc nhiệt đới hiện đại, ưu tiên không gian xanh và vật liệu tự nhiên., phong cách Hiện đại – Nhiệt đới.\nBối cảnh tại Tọa lạc trong một khu dân cư đô thị.\n{Vật liệu ứng dụng }\nKhông gian xung quanh bao gồm Hệ thống cây xanh đa dạng trên các ban công, Hai cây lớn xanh tốt ở hai bên vỉa hè, hài hòa with cảnh quan tự nhiên.\nPhía xa là Bầu trời u ám, tạo chiều sâu thị giác và cảm giác không gian mở rộng.\nKhung cảnh được ghi lại vào Mùa hè, cây cối tươi tốt và đầy sức sống., Giữa ngày., trong điều kiện thời tiết Trời nhiều mây, ánh sáng dịu và khuếch tán..\nÁnh sáng tự nhiên cân bằng, phản chiếu mềm, vật liệu hiện rõ chi tiết.\nKhông khí tổng thể mang cảm xúc Yên bình, tươi mát và thân thiện..\nGóc nhìn máy ảnh là Chụp thẳng from phía bên kia đường, ngang tầm mắt, lấy trọn vẹn mặt tiền ngôi nhà., sử dụng DSLR full-frame with ống kính góc rộng, DOF nhẹ nhàng, và bố cục theo tỉ lệ vàng.',
    thumbnail: 'https://i.ibb.co/39b7H18S/617662778-1852561475734147-6334751143682874560-n.jpg',
    tier: 'free',
    sortOrder: 1,
  },
  {
    title: 'Mẫu nhà phố 2',
    content: 'Prompt mẫu nhà phố kiến trúc hiện đại 2',
    thumbnail: 'https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg',
    tier: 'free',
    sortOrder: 2,
  },
  {
    title: 'Mẫu nhà phố 3',
    content: 'Prompt mẫu nhà phố kiến trúc hiện đại 3',
    thumbnail: 'https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg',
    tier: 'free',
    sortOrder: 3,
  },
  {
    title: 'Mẫu nhà phố 4',
    content: 'Prompt mẫu nhà phố kiến trúc hiện đại 4',
    thumbnail: 'https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg',
    tier: 'pro',
    sortOrder: 4,
  },
  {
    title: 'Nhà phố hiện đại',
    content: 'Prompt mẫu nhà phố phong cách hiện đại',
    thumbnail: 'https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg',
    tier: 'pro',
    sortOrder: 5,
  },
  {
    title: 'Nhà phố tối giản',
    content: 'Prompt mẫu nhà phố phong cách tối giản',
    thumbnail: 'https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg',
    tier: 'pro',
    sortOrder: 6,
  },
  {
    title: 'Nhà phố nhiệt đới',
    content: 'Prompt mẫu nhà phố phong cách nhiệt đới',
    thumbnail: 'https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg',
    tier: 'pro',
    sortOrder: 7,
  },
  {
    title: 'Nhà phố thương mại',
    content: 'Prompt mẫu nhà phố thương mại kết hợp kinh doanh',
    thumbnail: 'https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg',
    tier: 'pro',
    sortOrder: 8,
  },
];

const BIET_THU_PROMPTS: SeedPrompt[] = [
  {
    title: 'Biệt thự tân cổ điển',
    content: 'Prompt mẫu biệt thự phong cách tân cổ điển sang trọng',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'free',
    sortOrder: 1,
  },
  {
    title: 'Biệt thự hiện đại',
    content: 'Prompt mẫu biệt thự hiện đại với không gian mở',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'free',
    sortOrder: 2,
  },
  {
    title: 'Biệt thự nhà vườn',
    content: 'Prompt mẫu biệt thự kết hợp cảnh quan sân vườn',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'free',
    sortOrder: 3,
  },
  {
    title: 'Biệt thự nghỉ dưỡng',
    content: 'Prompt mẫu biệt thự nghỉ dưỡng cao cấp (Resort villa)',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'pro',
    sortOrder: 4,
  },
  {
    title: 'Biệt thự mái Thái',
    content: 'Prompt mẫu biệt thự mái Thái truyền thống',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'pro',
    sortOrder: 5,
  },
  {
    title: 'Biệt thự mái Nhật',
    content: 'Prompt mẫu biệt thự mái Nhật tối giản',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'pro',
    sortOrder: 6,
  },
  {
    title: 'Biệt thự mini',
    content: 'Prompt mẫu biệt thự mini diện tích nhỏ gọn',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'pro',
    sortOrder: 7,
  },
  {
    title: 'Biệt thự song lập',
    content: 'Prompt mẫu biệt thự song lập đối xứng',
    thumbnail: 'https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg',
    tier: 'pro',
    sortOrder: 8,
  },
];

const NOI_THAT_PROMPTS: SeedPrompt[] = [
  {
    title: 'Phòng khách hiện đại',
    content: 'Prompt mẫu phòng khách phong cách hiện đại, tối giản',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'free',
    sortOrder: 1,
  },
  {
    title: 'Phòng ngủ ấm cúng',
    content: 'Prompt mẫu phòng ngủ với ánh sáng vàng ấm áp',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'free',
    sortOrder: 2,
  },
  {
    title: 'Nhà bếp tiện nghi',
    content: 'Prompt mẫu không gian bếp đảo hiện đại',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'free',
    sortOrder: 3,
  },
  {
    title: 'Phòng tắm sang trọng',
    content: 'Prompt mẫu phòng tắm ốp đá vân mây cao cấp',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'pro',
    sortOrder: 4,
  },
  {
    title: 'Phòng làm việc',
    content: 'Prompt mẫu phòng làm việc tại nhà sáng tạo',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'pro',
    sortOrder: 5,
  },
  {
    title: 'Nội thất tân cổ điển',
    content: 'Prompt mẫu nội thất chi tiết phào chỉ tân cổ điển',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'pro',
    sortOrder: 6,
  },
  {
    title: 'Nội thất Indochine',
    content: 'Prompt mẫu nội thất phong cách Đông Dương',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'pro',
    sortOrder: 7,
  },
  {
    title: 'Nội thất Wabi Sabi',
    content: 'Prompt mẫu nội thất phong cách Wabi Sabi mộc mạc',
    thumbnail: 'https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp',
    tier: 'pro',
    sortOrder: 8,
  },
];

export async function seedPromptLibrary(): Promise<void> {
  const categoryMap: Record<string, string> = {};

  for (const catData of SEED_CATEGORIES) {
    const [cat] = await PromptCategory.findOrCreate({
      where: { name: catData.name },
      defaults: catData,
    });
    categoryMap[catData.name] = cat.id;
  }

  const allPrompts: { categoryName: string; prompts: SeedPrompt[] }[] = [
    { categoryName: 'Nhà Phố', prompts: NHA_PHO_PROMPTS },
    { categoryName: 'Biệt Thự', prompts: BIET_THU_PROMPTS },
    { categoryName: 'Nội Thất', prompts: NOI_THAT_PROMPTS },
  ];

  let created = 0;
  for (const { categoryName, prompts } of allPrompts) {
    const categoryId = categoryMap[categoryName];
    for (const p of prompts) {
      const [, wasCreated] = await Prompt.findOrCreate({
        where: { categoryId, title: p.title },
        defaults: {
          categoryId,
          title: p.title,
          content: p.content,
          thumbnail: p.thumbnail,
          tier: p.tier,
          sortOrder: p.sortOrder,
        },
      });
      if (wasCreated) created++;
    }
  }

  console.log(`📚 Prompt library seeded: 3 categories, ${created} new prompts added`);
}
