import React, { useState } from 'react';
import { CubeTransparentIcon } from './icons/CubeTransparentIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { RulerIcon } from './icons/RulerIcon';
import { CompassIcon } from './icons/CompassIcon';
import { MapIcon } from './icons/MapIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { RectangleGroupIcon } from './icons/RectangleGroupIcon';
import { useLanguage } from '../hooks/useLanguage';
import ChangeMaterial from './ChangeMaterial';
import ChangeStyle from './ChangeStyle';
import CreateMoodboard from './CreateMoodboard';
import CharacterConsistency from './CharacterConsistency';
import SyncContext from './SyncContext';
import CreateStoryboard from './CreateStoryboard';
import ImproveImageQuality from './ImproveImageQuality';
import Virtual360 from './Virtual360';
import MergeBuilding from './MergeBuilding';
import ExtractMaterials from './ExtractMaterials';
import CreateAnnotations from './CreateAnnotations';
import ChangeTonemood from './ChangeTonemood';
import ExteriorViewSuggestions from './ExteriorViewSuggestions';

interface UtilityCardProps {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
  tagColor?: string;
  isVip?: boolean;
  bgGradient: string;
  imageUrl?: string;
  onClick?: () => void;
}

const UtilityCard: React.FC<UtilityCardProps> = ({ 
  title, 
  subtitle, 
  description, 
  icon, 
  tag, 
  tagColor = "bg-yellow-500", 
  isVip,
  bgGradient,
  imageUrl,
  onClick
}) => {
  const { locale } = useLanguage();
  return (
  <div className="group relative bg-[#2a303c] rounded-2xl overflow-hidden shadow-lg border border-slate-700 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
    <div className={`h-40 w-full ${bgGradient} relative flex items-center justify-center overflow-hidden`}>
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 z-0 opacity-80" 
        />
      )}
      <div className={`absolute inset-0 ${imageUrl ? 'bg-black/60 group-hover:bg-black/40' : 'bg-black/20 group-hover:bg-transparent'} transition-colors duration-300 z-0`}></div>
      <div className="relative z-10 p-4 bg-black/40 backdrop-blur-sm rounded-full text-white transform group-hover:scale-110 transition-transform duration-300 border border-white/10">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-10 h-10" })}
      </div>
    </div>
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold px-2 py-1 rounded text-black uppercase tracking-wider ${tagColor}`}>
          {tag}
        </span>
        {isVip && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-red-600 text-white uppercase tracking-wider animate-pulse">
            PRO
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-cyan-400 font-semibold mb-2">{subtitle}</p>
      <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">
        {description}
      </p>
      <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">Auto Rendering AI</span>
        <button 
          onClick={onClick}
          className="text-sm font-medium text-white hover:text-orange-400 flex items-center gap-1 transition-colors"
        >
          {locale === 'vi' ? 'Truy cập' : 'Access'} <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  </div>
)};

const OtherUtilsPage: React.FC = () => {
  const { locale } = useLanguage();
  const [currentView, setCurrentView] = useState<'grid' | 'change-material' | 'change-style' | 'create-moodboard' | 'character-consistency' | 'sync-context' | 'create-storyboard' | 'improve-quality' | 'virtual-360' | 'merge-building' | 'extract-materials' | 'create-annotations' | 'change-tonemood' | 'exterior-view-suggestions'>('grid');

  const utilities = [
    {
      id: 'change-material',
      title: locale === 'vi' ? "Thay đổi Vật liệu" : "Change Materials",
      subtitle: locale === 'vi' ? "Tiện ích mở rộng" : "Extended Utility",
      description: locale === 'vi' ? "Thay đổi vật liệu từ những màu sắc và vật liệu mới." : "Change building materials using new colors and textures.",
      icon: <CubeTransparentIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-slate-700 to-slate-900",
      imageUrl: "https://vatlieuxaydung.org.vn/Upload/48/Nam_2018/Thang_8/Ngay_27/vlxd.org_vatlieukientruc1.jpg"
    },
    {
      id: 'change-style',
      title: locale === 'vi' ? "Thay đổi Phong cách công trình" : "Change Architectural Style",
      subtitle: locale === 'vi' ? "Biến đổi phong cách" : "Style Transformation",
      description: locale === 'vi' ? "Thay đổi sang các phong cách kiến trúc khác nhau một cách linh hoạt." : "Switch between different architectural styles flexibly.",
      icon: <VideoCameraIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-indigo-900 to-slate-800",
     imageUrl: "https://akisa.vn/uploads/plugin/news/275/su-sang-tao.png"
    },
    {
      id: 'create-moodboard',
      title: locale === 'vi' ? "Tạo moodboard" : "Create Moodboard",
      subtitle: "Moodboard",
      description: locale === 'vi' ? "Tạo moodboard từ ảnh đầu vào và các ảnh tham khảo." : "Generate design moodboards from input and reference images.",
      icon: <SparklesIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-blue-900 to-slate-900",
     imageUrl: "https://sensehomeconcept.com/data/upload/media/images/b%C3%A0i%20vi%E1%BA%BFt(2).png"
    },
    {
      id: 'create-storyboard',
      title: locale === 'vi' ? "Tạo Storyboard" : "Create Storyboard",
      subtitle: locale === 'vi' ? "Bảng phân cảnh kiến trúc" : "Architectural Storyboard",
      description: locale === 'vi' ? "Tạo bảng Storyboard trình bày đa góc nhìn đồng bộ cho cùng một công trình." : "Create synchronized multi-view storyboards for your projects.",
      icon: <RectangleGroupIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-purple-900 to-slate-800",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      id: 'merge-building',
      title: locale === 'vi' ? "Ghép công trình" : "Merge Building",
      subtitle: locale === 'vi' ? "Ghép nhà" : "House Merging",
      description: locale === 'vi' ? "Ghép công trình từ ảnh 3D vào bối cảnh có sẵn." : "Incorporate 3D buildings into existing real-world contexts.",
      icon: <RulerIcon />,
      tag: "TIỆN ÍCH",
      tagColor: "bg-gray-200 text-gray-800",
      bgGradient: "bg-gradient-to-br from-emerald-900 to-slate-900",
      imageUrl: "https://kientrucauchau.vn/wp-content/uploads/2022/01/mau-sac-hai-hoa-mang-den-Background-dep.jpg"
    },
    {
      title: locale === 'vi' ? "Đồng bộ Nhân vật" : "Character Consistency",
      id: "character-consistency",
      subtitle: locale === 'vi' ? "Đồng bộ Nhân vật" : "Sync Character Profile",
      description: locale === 'vi' ? "Đồng bộ Nhân vật và các bối cảnh và khung hình khác nhau." : "Maintain character identity across different scenes and contexts.",
      icon: <CompassIcon />,
      tag: "TIỆN ÍCH",
      tagColor: "bg-gray-200 text-gray-800",
      isVip: true,
      bgGradient: "bg-gradient-to-br from-red-900 to-slate-900",
      imageUrl: "https://genk.mediacdn.vn/k:2015/1-img-20150705074230247-1436783390568/9-nhan-vat-phu-duoc-yeu-men-hon-ca-vai-chinh-trong-phim-hoat-hinh.jpg"
    },
    {
      id: "sync-context",
      title: locale === 'vi' ? "Đồng bộ bao cảnh" : "Sync Context",
      subtitle: locale === 'vi' ? "Đồng bộ bao cảnh công trình" : "Environmental Sync",
      description: locale === 'vi' ? "Đồng bộ các góc của công trình. Đồng nhất bao cảnh xung quanh." : "Harmonize surroundings across all project perspectives.",
      icon: <MapIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-orange-900 to-slate-900",
      imageUrl: "https://kientrucauchau.vn/wp-content/uploads/2022/01/mau-sac-hai-hoa-mang-den-Background-dep.jpg"
    },
    {
      id: "virtual-360",
      title: locale === 'vi' ? "Tham quan ảo 360 VR" : "360 VR Virtual Tour",
      subtitle: "360 Tour",
      description: locale === 'vi' ? "Ai sẽ phân tích và tái tạo hình ảnh đầu vào để biến thành không gian tham quan ảo 360." : "Generate immersive 360 virtual tours from standard images.",
      icon: <MapIcon />,
      tag: "CÔNG CỤ AI",
       isVip: true,
      bgGradient: "bg-gradient-to-br from-orange-900 to-slate-900",
      imageUrl: "https://flyingcam-vietnam.com/wp-content/uploads/2021/07/anh-360-do-panorama-1024x512.jpg"
    },
    {
      id: "improve-quality",
      title: locale === 'vi' ? "Cải thiện chất lượng Ảnh lên 4K" : "Improve Image Quality",
      subtitle: locale === 'vi' ? "Cải thiện chất lượng Ảnh lên 4K" : "Upscale & Detail",
      description: locale === 'vi' ? "Cải thiện chất lượng , nâng cao chi tiết ảnh Ảnh. Kết nối API PRO" : "Enhance details and upscale image quality using Pro APIs.",
      icon: <SparklesIcon />,
      tag: "CÔNG CỤ AI",
             isVip: true,
      bgGradient: "bg-gradient-to-br from-orange-900 to-slate-900",
      imageUrl: "https://www.pickr.com.au/wp-content/uploads/2017/11/hdmi-8k-10k-compared.jpg"
    },
    {
      id: "extract-materials",
      title: locale === 'vi' ? "Trích xuất Vật liệu" : "Extract Materials",
      subtitle: locale === 'vi' ? "Trích xuất Vật liệu" : "Extract Materials",
      description: locale === 'vi' ? "Tạo texture bằng AI từ ảnh thực tế hoặc vật thể." : "Create AI textures from real images or objects.",
      icon: <SparklesIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-orange-900 to-slate-900",
      imageUrl: "https://i.ytimg.com/vi/Bo3eONbMBKw/maxresdefault.jpg"
    },
    {
      id: 'create-annotations',
      title: locale === 'vi' ? "Tạo Icon chú thích" : "Create Icon Annotations",
      subtitle: locale === 'vi' ? "Tạo các icon chú thích" : "Generate callout icons",
      description: locale === 'vi' ? "Tạo chú thích ngay trên mặt đứng" : "Create technical annotations directly on architectural elevations.",
      icon: <RectangleGroupIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-blue-700 to-slate-900",
      imageUrl: "https://kientrucauchau.vn/wp-content/uploads/2022/01/mau-sac-hai-hoa-mang-den-Background-dep.jpg"
    },
    {
      id: 'change-tonemood',
      title: locale === 'vi' ? "Chuyển đổi Tonemood và Ánh sáng" : "Change Tonemood and Lighting",
      subtitle: locale === 'vi' ? "Công cụ giúp chuyển đổi Tonemood và Ánh sáng linh hoạt" : "Flexible tool for switching Tonemood and Lighting",
      description: locale === 'vi' ? "Thay đổi bối cảnh ánh sáng và màu sắc phim cho công trình." : "Change the lighting context and film color for the project.",
      icon: <SparklesIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-orange-700 to-indigo-900",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      id: 'exterior-view-suggestions',
      title: locale === 'vi' ? "Gợi ý các View Ngoại thất tự động" : "Automatic Exterior View Suggestions",
      subtitle: locale === 'vi' ? "Chỉ cần tải lên 1 ảnh kiến trúc, AI sẽ tái tạo công trình và sinh ra các góc camera đa dạng như chụp thực tế." : "Upload 1 architectural photo, AI will recreate the building and generate diverse camera angles like real photography.",
      description: locale === 'vi' ? "Thay đổi bối cảnh ánh sáng và màu sắc phim cho công trình." : "Change the lighting context and film color for the project.",
      icon: <SparklesIcon />,
      tag: "CÔNG CỤ AI",
      bgGradient: "bg-gradient-to-br from-orange-700 to-indigo-900",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    }
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'change-material': return <ChangeMaterial onBack={() => setCurrentView('grid')} />;
      case 'change-style': return <ChangeStyle onBack={() => setCurrentView('grid')} />;
      case 'create-moodboard': return <CreateMoodboard onBack={() => setCurrentView('grid')} />;
      case 'character-consistency': return <CharacterConsistency onBack={() => setCurrentView('grid')} />;
      case 'sync-context': return <SyncContext onBack={() => setCurrentView('grid')} />;
      case 'create-storyboard': return <CreateStoryboard onBack={() => setCurrentView('grid')} />;
      case 'improve-quality': return <ImproveImageQuality onBack={() => setCurrentView('grid')} />;
      case 'virtual-360': return <Virtual360 onBack={() => setCurrentView('grid')} />;
      case 'merge-building': return <MergeBuilding onBack={() => setCurrentView('grid')} />;
      case 'extract-materials': return <ExtractMaterials onBack={() => setCurrentView('grid')} />;
      case 'create-annotations': return <CreateAnnotations onBack={() => setCurrentView('grid')} />;
      case 'change-tonemood': return <ChangeTonemood onBack={() => setCurrentView('grid')} />;
      case 'exterior-view-suggestions': return <ExteriorViewSuggestions onBack={() => setCurrentView('grid')} />;
      default:
        return (
          <div className="flex-grow flex flex-col bg-[#282f3d] p-4 lg:p-8 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto w-full">
              <div className="text-center mb-10 animate-fade-in">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2 font-architecture uppercase tracking-widest">
                  {locale === 'vi' ? 'Kho Tiện ÍCH Mở Rộng' : 'Extended Utilities'}
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  {locale === 'vi' ? 'Các công cụ bổ trợ chuyên dụng dành cho Kiến trúc sư & Kỹ sư xây dựng.' : 'Specialized auxiliary tools for Architects and Civil Engineers.'}
                  <br />
                  <span className="text-orange-400 text-sm">{locale === 'vi' ? 'Cập nhật liên tục các tính năng mới nhất từ F9 Rendering Team.' : 'Continuously updated with the latest features from F9 Rendering Team.'}</span>
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {utilities.map((util, index) => (
                  <UtilityCard 
                    key={index} 
                    {...util} 
                    onClick={() => util.id ? setCurrentView(util.id as any) : alert("Coming soon!")}
                  />
                ))}
              </div>
              <div className="mt-12 text-center border-t border-slate-700 pt-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest">
                  {locale === 'vi' ? 'Đang phát triển thêm các tính năng mới... Hãy đón chờ !' : 'Developing more new features... Stay tuned!'}
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return renderContent();
};

export default OtherUtilsPage;