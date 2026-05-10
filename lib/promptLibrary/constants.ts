
import { MainCategory } from './types';

export const CATEGORIES: MainCategory[] = [
  {
    id: 'nha-pho',
    title: 'Nhà Phố',
    description: 'Khám phá các mẫu thiết kế nhà phố hiện đại, tối ưu diện tích.',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    subCategories: [
      { id: 'm1', title: 'Mẫu nhà phố 1', description: 'Prompt mẫu nhà phố kiến trúc hiện đại 1', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
      { id: 'm2', title: 'Mẫu nhà phố 2', description: 'Prompt mẫu nhà phố kiến trúc hiện đại 2', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80' },
      { id: 'm3', title: 'Mẫu nhà phố 3', description: 'Prompt mẫu nhà phố kiến trúc hiện đại 3', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1600607687940-47a0928b5a3e?auto=format&fit=crop&w=400&q=80' },
      { id: 'm4', title: 'Mẫu nhà phố 4', description: 'Prompt mẫu nhà phố kiến trúc hiện đại 4', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0fec2a4cd?auto=format&fit=crop&w=400&q=80' },
      { id: 'modern', title: 'Nhà phố hiện đại', description: 'Prompt mẫu nhà phố phong cách hiện đại', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80' },
      { id: 'minimal', title: 'Nhà phố tối giản', description: 'Prompt mẫu nhà phố phong cách tối giản', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&q=80' },
      { id: 'tropical', title: 'Nhà phố nhiệt đới', description: 'Prompt mẫu nhà phố phong cách nhiệt đới', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?auto=format&fit=crop&w=400&q=80' },
      { id: 'shophouse', title: 'Nhà phố thương mại', description: 'Prompt mẫu nhà phố thương mại kết hợp kinh doanh', badge: 'NHÀ', imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=400&q=80' },
    ]
  },
  {
    id: 'biet-thu',
    title: 'Biệt Thự',
    description: 'Các công trình biệt thự đẳng cấp, sân vườn và phong cách tân cổ điển.',
    imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    subCategories: []
  },
  {
    id: 'noi-that',
    title: 'Nội Thất',
    description: 'Ý tưởng không gian sống tinh tế từ phòng khách đến phòng ngủ.',
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    subCategories: []
  }
];
