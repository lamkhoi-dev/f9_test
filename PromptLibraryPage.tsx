import React, { useState } from 'react';
import { useLanguage } from './hooks/useLanguage';
import { useMode } from './contexts/ModeContext';
import { useSnow } from './contexts/SnowContext';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { BoltIcon } from './components/icons/BoltIcon';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import Footer from './components/Footer';
import LanguageSwitcher from './components/LanguageSwitcher';
import OnlineStatus from './components/OnlineStatus';

interface PromptLibraryPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNavigate: (page: string, data?: any) => void;
}

const PromptLibraryPage: React.FC<PromptLibraryPageProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const { mode, toggleMode } = useMode();
  const { isSnowing, toggleSnow } = useSnow();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const actionButtons = [
    { id: 'exterior', key: 'imageGenerationPage.actionButtons.exterior' },
    { id: 'interior', key: 'imageGenerationPage.actionButtons.interior' },
    { id: 'newAngle', key: 'imageGenerationPage.actionButtons.newAngle' },
    { id: 'zoom', key: 'imageGenerationPage.actionButtons.zoom' },
    { id: 'edit', key: 'imageGenerationPage.actionButtons.edit' },
    { id: 'sharpen', key: 'imageGenerationPage.actionButtons.sharpen' },
    { id: 'toVideo', key: 'imageGenerationPage.actionButtons.toVideo' },
    { id: 'utils', key: 'imageGenerationPage.actionButtons.utils' },
  ];
  const mainActionButtons = actionButtons.slice(0, 2);
  const subActionButtons = actionButtons.slice(2);

  const handleActionChange = (id: string) => {
    onNavigate('image-generation', { page: 'image-generation', config: { activeAction: id } });
  };

  const libraryCards = [
    {
      title: "Nhà Phố",
      description: "Khám phá các mẫu thiết kế nhà phố hiện đại, tối ưu diện tích.",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Biệt Thự",
      description: "Các công trình biệt thự đẳng cấp, sân vườn và phong cách tân cổ điển.",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Nội Thất",
      description: "Ý tưởng không gian sống tinh tế từ phòng khách đến phòng ngủ.",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    }
  ];

  const nhaPhoItems = [
    {
      title: "Mẫu nhà phố 1",
      description: "Prompt mẫu nhà phố kiến trúc hiện đại 1",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Mẫu nhà phố 2",
      description: "Prompt mẫu nhà phố kiến trúc hiện đại 2",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Mẫu nhà phố 3",
      description: "Prompt mẫu nhà phố kiến trúc hiện đại 3",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Mẫu nhà phố 4",
      description: "Prompt mẫu nhà phố kiến trúc hiện đại 4",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Nhà phố hiện đại",
      description: "Prompt mẫu nhà phố phong cách hiện đại",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Nhà phố tối giản",
      description: "Prompt mẫu nhà phố phong cách tối giản",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Nhà phố nhiệt đới",
      description: "Prompt mẫu nhà phố phong cách nhiệt đới",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    },
    {
      title: "Nhà phố thương mại",
      description: "Prompt mẫu nhà phố thương mại kết hợp kinh doanh",
      imageUrl: "https://www.inax.com.vn/wp-content/uploads/2025/04/thiet-ke-nha-pho-1.jpg"
    }
  ];

  const bietThuItems = [
    {
      title: "Biệt thự tân cổ điển",
      description: "Prompt mẫu biệt thự phong cách tân cổ điển sang trọng",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Biệt thự hiện đại",
      description: "Prompt mẫu biệt thự hiện đại với không gian mở",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Biệt thự nhà vườn",
      description: "Prompt mẫu biệt thự kết hợp cảnh quan sân vườn",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Biệt thự nghỉ dưỡng",
      description: "Prompt mẫu biệt thự nghỉ dưỡng cao cấp (Resort villa)",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Biệt thự mái Thái",
      description: "Prompt mẫu biệt thự mái Thái truyền thống",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Biệt thự mái Nhật",
      description: "Prompt mẫu biệt thự mái Nhật tối giản",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Biệt thự mini",
      description: "Prompt mẫu biệt thự mini diện tích nhỏ gọn",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    },
    {
      title: "Biệt thự song lập",
      description: "Prompt mẫu biệt thự song lập đối xứng",
      imageUrl: "https://worldlandscapearchitect.com/wp-content/uploads/2022/12/OBG-Garden_Storyboard-Cover.jpg"
    }
  ];

  const noiThatItems = [
    {
      title: "Phòng khách hiện đại",
      description: "Prompt mẫu phòng khách phong cách hiện đại, tối giản",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Phòng ngủ ấm cúng",
      description: "Prompt mẫu phòng ngủ với ánh sáng vàng ấm áp",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nhà bếp tiện nghi",
      description: "Prompt mẫu không gian bếp đảo hiện đại",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Phòng tắm sang trọng",
      description: "Prompt mẫu phòng tắm ốp đá vân mây cao cấp",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Phòng làm việc",
      description: "Prompt mẫu phòng làm việc tại nhà sáng tạo",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nội thất tân cổ điển",
      description: "Prompt mẫu nội thất chi tiết phào chỉ tân cổ điển",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nội thất Indochine",
      description: "Prompt mẫu nội thất phong cách Đông Dương",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    },
    {
      title: "Nội thất Wabi Sabi",
      description: "Prompt mẫu nội thất phong cách Wabi Sabi mộc mạc",
      imageUrl: "https://thing.vn/wp-content/uploads/2023/12/thiet-ke-chieu-sang-kien-truc-10.webp"
    }
  ];

  const renderCategoryContent = () => {
    let currentItems: any[] = [];
    let currentTitle = "";
    let currentDesc = "";
    let tag = "";

    if (selectedCategory === 'Nhà Phố') {
      currentItems = nhaPhoItems;
      currentTitle = "Nhà Phố";
      currentDesc = "Khám phá các mẫu thiết kế nhà phố hiện đại, tối ưu diện tích.";
      tag = "NHÀ";
    } else if (selectedCategory === 'Biệt Thự') {
      currentItems = bietThuItems;
      currentTitle = "Biệt Thự";
      currentDesc = "Các công trình biệt thự đẳng cấp, sân vườn và phong cách tân cổ điển.";
      tag = "BIỆT THỰ";
    } else if (selectedCategory === 'Nội Thất') {
      currentItems = noiThatItems;
      currentTitle = "Nội Thất";
      currentDesc = "Ý tưởng không gian sống tinh tế từ phòng khách đến phòng ngủ.";
      tag = "NỘI THẤT";
    }

    if (selectedCategory && currentItems.length > 0) {
      return (
        <div className="max-w-7xl mx-auto w-full">
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
              <button onClick={() => setSelectedCategory(null)} className="hover:text-white transition-colors">Thư viện</button>
              <span>/</span>
              <span className="text-white font-bold uppercase">{currentTitle}</span>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h2 className="text-3xl font-bold text-white mb-2">{currentTitle}</h2>
              <p className="text-gray-400">{currentDesc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {currentItems.map((item, index) => (
              <div key={index} className="group bg-[#2a303c] rounded-xl overflow-hidden shadow-lg border border-slate-700 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col">
                <div className="h-48 w-full relative overflow-hidden">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10">
                    {tag}
                  </div>
                </div>
                <div className="p-4 flex-grow flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-architecture tracking-widest">
            THƯ VIỆN PROMPT KIẾN TRÚC
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Cảm hứng sáng tạo không giới hạn với kho mẫu Prompt dành riêng cho kiến trúc sư và nhà thiết kế AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
          {libraryCards.map((card, index) => (
            <div 
              key={index} 
              onClick={() => setSelectedCategory(card.title)}
              className="group relative bg-[#2a303c] rounded-2xl overflow-hidden shadow-lg border border-slate-700 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
            >
              <div className="h-64 w-full relative flex items-center justify-center overflow-hidden">
                <img 
                  src={card.imageUrl} 
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 z-0 opacity-80" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] via-black/40 to-transparent z-0"></div>
                
                <div className="absolute bottom-0 left-0 w-full p-6 z-10 transform transition-transform duration-300">
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#282f3d] min-h-screen flex flex-col font-sans text-gray-300">
      <header className="bg-[#286453] text-center py-6 text-white shadow-md flex-shrink-0 relative">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-wider animate-glow">3DMILI.ORG - APPS AUTO RENDERING ™</h1>
          <p className="text-xs tracking-wide text-gray-300 mt-2 px-4">{t('imageGenerationPage.subtitle')}</p>
          
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
              <button
                onClick={toggleMode}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                  mode === 'pro' || mode === 'banana2'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800 text-yellow-400 border-yellow-500/30 hover:bg-slate-700'
                }`}
                title={mode === 'pro' ? "Đang dùng Nano Banana Pro (4K, Gemini 3.1)" : mode === 'banana2' ? "Đang dùng Banana 2 (Gemini 3.1 Flash Image)" : "Đang dùng Nano Banana (Basic, Gemini 2.5)"}
              >
                {mode === 'pro' || mode === 'banana2' ? <SparklesIcon className="w-4 h-4 animate-pulse" /> : <BoltIcon className="w-4 h-4" />}
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                  {mode === 'pro' ? 'Pro Ver 3.0' : mode === 'banana2' ? 'Banana 2' : 'Basic Ver 2.5'}
                </span>
              </button>

              <button
                onClick={toggleSnow}
                title={isSnowing ? "Tắt tuyết rơi" : "Bật tuyết rơi"}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center border ${
                  isSnowing 
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className="text-lg leading-none">❄️</span>
              </button>
          </div>
      </header>

      <div className="flex-grow flex flex-col min-h-0">
          <nav className="bg-[#202633] px-4 sm:px-6 py-2 border-b border-t border-black/20 flex-shrink-0">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  <div className="w-full lg:flex-1 flex justify-start">
                      <button onClick={() => onNavigate('home')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                          <ChevronLeftIcon className="w-5 h-5" />
                          <span className="font-semibold">Home</span>
                      </button>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2 lg:flex-none">
                      <div className="flex flex-wrap justify-center items-center gap-2">
                          {mainActionButtons.map(btn => (
                              <button key={btn.id} onClick={() => handleActionChange(btn.id)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300`}>
                                  {t(btn.key)}
                              </button>
                          ))}
                      </div>
                      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                          {subActionButtons.map(btn => (
                               <button key={btn.id} onClick={() => handleActionChange(btn.id)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300`}>
                                  {t(btn.key)}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="w-full lg:flex-1 flex justify-center lg:justify-end items-center gap-4 mt-4 lg:mt-0">
                      <OnlineStatus />
                      <LanguageSwitcher />
                  </div>
              </div>
          </nav>

          <div className="flex-grow bg-[#1e293b] p-8 overflow-y-auto custom-scrollbar">
            {renderCategoryContent()}
          </div>
      </div>
      <Footer />
    </div>
  );
};

export default PromptLibraryPage;
