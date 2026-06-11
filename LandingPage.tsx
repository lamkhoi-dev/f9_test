import React, { useState, createContext, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { CheckoutModal } from './components/CheckoutModal';
import { 
  Home, 
  Sparkles, 
  Compass, 
  Library, 
  User,
  Zap, 
  Infinity as InfinityIcon, 
  Layers, 
  MessageCircle,
  Building,
  ZoomIn,
  X,
  Coins,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  ArrowUp,
  Mail,
  Award,
  ArrowRight
} from 'lucide-react';

const LanguageContext = createContext<{lang: 'vi' | 'en', setLang: (l: 'vi' | 'en') => void, t: any}>({ lang: 'vi', setLang: () => {}, t: {} });
export const useLanguage = () => useContext(LanguageContext);

interface LandingSlideData { id: string; imageUrl: string; altText: string; }
interface ShowcaseTabData { id: string; tabKey: string; titleVi: string; titleEn: string; descriptionVi: string; descriptionEn: string; originalImageUrl: string; renderImageUrls: string[]; }
interface FeatureCardData { id: string; cardKey: string; titleVi: string; titleEn: string; descriptionVi: string; descriptionEn: string; beforeImageUrl: string; afterImageUrl: string; extraImageUrls: string[]; }
interface BlogPostData { id: string; imageUrl: string; tagVi: string; tagEn: string; titleVi: string; titleEn: string; excerptVi: string; excerptEn: string; }
interface LandingData { slides: LandingSlideData[]; showcaseTabs: ShowcaseTabData[]; featureCards: FeatureCardData[]; blogPosts: BlogPostData[]; }

const LandingDataContext = createContext<LandingData | null>(null);
export const useLandingData = () => useContext(LandingDataContext);

export const LandingDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<LandingData | null>(null);
  useEffect(() => {
    const base = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL || '/api';
    fetch(`${base}/landing-data`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .catch(() => {});
  }, []);
  return <LandingDataContext.Provider value={data}>{children}</LandingDataContext.Provider>;
};

const translations = {
  vi: {
    nav: ["Trang Chủ", "Tính Năng", "Khám Phá", "Thư Viện"],
    hero: ["Nền tảng AI chuyên sâu dành cho Kiến trúc & Nội thất.", "Biến mọi ý tưởng thành hình ảnh trực quan tức thì - tiết kiệm thời gian tối ưu workflow thiết kế.", "Dùng thử miễn phí"],
    stats: ["Khách hàng doanh nghiệp", "Khách hàng cá nhân"],
    how: ["hoạt động như thế nào", "Thông tin", "Tải lên ảnh tham khảo hoặc nhập mô tả ý tưởng của bạn.", "Thiết lập", "Lựa chọn chất lượng, phong cách và số lượng ảnh mong muốn.", "Hoàn thiện", "AI xử lý trong giây lát. Tinh chỉnh, tăng chất lượng và tải xuống."],
    showcaseTitle: "có thể làm được gì?",
    showcaseTabs: ["Kiến trúc", "Nội thất", "Cảnh quan"],
    adv: ["Tính năng Nâng cao", "Tùy biến chỉnh sửa", "Chỉnh sửa toàn bộ hoặc một phần hình ảnh nhanh chóng.", "Trộn phong cách (Mix)", "Kết hợp hình khối và phong cách từ nhiều nguồn khác nhau.", "Tạo góc nhìn mới", "Đồng bộ nhiều góc nhìn từ một ảnh gốc duy nhất."],
    feat: ["Tại sao lựa chọn", "Dễ dàng sử dụng", "F9 Rendering tự động làm giàu prompt, giúp Kiến trúc sư và Designer không cần mất thời gian nghiên cứu câu lệnh, tập trung hoàn toàn vào chuyên môn thiết kế.", "Credit không hết hạn", "Không cần đăng ký theo tháng. Credit của bạn không bao giờ hết hạn, sử dụng linh hoạt bất cứ khi nào có nhu cầu.", "Tính năng đa dạng", "F9 Rendering tích hợp nhiều tính năng AI phục vụ riêng cho ngành Kiến trúc & Nội thất, tối ưu hóa quy trình làm việc hiệu quả."],
    priceTitle: "Bảng giá Credit",
    priceDesc: "Mỗi chức năng sử dụng một lượng credit tương ứng với chất lượng và độ phức tạp của tác vụ.",
    priceRows: [
      ["Render Ảnh Kiến Trúc", "ảnh"],
      ["Tạo Ảnh Tự Do", "ảnh"],
      ["Tạo Ảnh Kiến Trúc", "ảnh"],
      ["Tạo Góc Nhìn Mới", "ảnh"],
      ["Tạo Moodboard Vật Liệu", "ảnh"],
      ["Đồng Bộ Phong Cách", "ảnh"],
      ["Upscale (2x / 4x)", "lượt"],
      ["Upscale Pro (2K / 4K)", "lượt"],
      ["Chỉnh sửa AI (Edit / Mix / Expand)", "lượt"]
    ],
    creditDesc: "Hệ thống thanh toán linh hoạt. Không hết hạn Credit. Sử dụng cá nhân và chia sẻ cùng team.",
    creditBadges: ["PHỔ BIẾN NHẤT"],
    creditLabels: ["Số lượng ảnh tạo", "Tổng"],
    cta: ["Sử dụng", "để tăng tốc workflow ngay hôm nay", "NHẬN NGAY 100 CREDIT MIỄN PHÍ"],
    contactTitle: "Liên hệ với chúng tôi",
    contactDesc: "Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7 qua các kênh chính thức.",
    contactItems: [
      "Theo dõi tin tức & cập nhật mới nhất",
      "Xem hướng dẫn & video diễn họa",
      "Gửi yêu cầu hợp tác & đóng góp",
      "Xem các video ngắn về kiến trúc AI"
    ],
    contactBtn: "Kết nối ngay",
    googlePackagesTitle: "Các Gói Google Hỗ Trợ",
    googlePackages: [
      {
        title: "Google AI Pro1",
        description: "Unlock the highest level of access to the best of Google AI and exclusive features.\nGet higher access to new and powerful features to boost your productivity and creativity.",
        discount: "-92%",
        badge: "HOT",
        oldPrice: "250,00$",
        newPrice: "19,99$",
        reviews: 1,
        rating: 5
      },
      {
        title: "Google AI Ultra",
        description: "Unlock the highest level of access to the best of Google AI and exclusive features.",
        discount: "-92%",
        badge: "HOT",
        oldPrice: "250,00$",
        newPrice: "19,99$",
        reviews: 1,
        rating: 5
      }
    ],
    faqTitle: "Câu hỏi thường gặp",
    faqDesc: "Giải đáp nhanh các thắc mắc phổ biến về dịch vụ, thanh toán và gói cước.",
    faq: [
      {q: "Credits dùng để làm gì và có hết hạn không?", a: "Credits dùng để tạo ảnh AI và render chất lượng cao. Chúng có thời hạn theo gói đã mua, nhưng bạn có thể mua thêm bất cứ lúc nào khi hết."},
      {q: "Tôi có thể nâng cấp gói bất cứ lúc nào không?", a: "Có. Bạn có thể nâng cấp lên gói cao hơn bất cứ lúc nào mà không mất Credits hiện tại."},
      {q: "Tôi có được hoàn tiền và có thể dùng cho mục đích thương mại không?", a: "Chúng tôi hỗ trợ hoàn tiền trong trường hợp lỗi hệ thống hoặc giao dịch bất thường. Nội dung được tạo từ tài khoản trả phí có thể sử dụng cho dự án thương mại."},
      {q: "Hỗ trợ khách hàng hoạt động như thế nào?", a: "Đội ngũ hỗ trợ hoạt động 24/7 để giúp bạn xử lý các vấn đề kỹ thuật và thanh toán."},
      {q: "Tôi có thể chia sẻ tài khoản với team không?", a: "Một số gói hỗ trợ làm việc nhóm và chia sẻ quyền truy cập giữa nhiều thành viên."},
      {q: "Có watermark trên ảnh xuất ra không?", a: "Không. Ảnh xuất từ gói trả phí sẽ không có watermark."},
      {q: "Tôi có cần cài đặt phần mềm không?", a: "Không cần. Bạn có thể sử dụng trực tiếp trên trình duyệt web."}
    ],
    footer: ["Điều khoản dịch vụ", "Chính sách bảo mật"],
    collection: {
      title: "BỘ SƯU TẬP",
      desc: "Những tác phẩm được kiến tạo bởi người dùng F9 RENDERING.",
      viewAll: "XEM TẤT CẢ",
      categories: ["NỘI THẤT CAO CẤP", "QUY HOẠCH ĐÔ THỊ", "KIẾN TRÚC NGOẠI THẤT"],
      popupDesc: "THƯ VIỆN Ý TƯỞNG THIẾT KẾ ĐỘC BẢN"
    }
  },
  en: {
    nav: ["Home", "Features", "Explore", "Library"],
    hero: ["Deep AI platform for Architecture & Interior Design.", "Turn any idea into visual images instantly - save time and optimize your design workflow.", "Start for free"],
    stats: ["Enterprise Clients", "Individual Clients"],
    how: ["how it works", "Information", "Upload reference images or enter your idea description.", "Settings", "Choose quality, style, and desired number of images.", "Completion", "AI processes in seconds. Refine, upscale, and download."],
    showcaseTitle: "what can it do?",
    showcaseTabs: ["Architecture", "Interior", "Landscape"],
    adv: ["Advanced Features", "Custom Editing", "Edit the whole or part of an image quickly.", "Style Mixing", "Combine shapes and styles from multiple sources.", "New Perspectives", "Synchronize multiple perspectives from a single original image."],
    feat: ["Why choose", "Easy to use", "F9 Rendering automatically enriches prompts, helping Architects and Designers focus entirely on design expertise without spending time researching commands.", "Credits never expire", "No monthly subscription required. Your credits never expire, use them flexibly whenever needed.", "Diverse features", "F9 Rendering integrates many AI features specifically for the Architecture & Interior industry, optimizing workflow efficiently."],
    priceTitle: "Credit Pricing",
    priceDesc: "Each function uses an amount of credit corresponding to the quality and complexity of the task.",
    priceRows: [
      ["Architecture Render", "img"],
      ["Free Generation", "img"],
      ["Architecture Generation", "img"],
      ["New Perspective", "img"],
      ["Material Moodboard", "img"],
      ["Style Sync", "img"],
      ["Upscale (2x / 4x)", "time"],
      ["Upscale Pro (2K / 4K)", "time"],
      ["AI Editing (Edit/Mix/Expand)", "time"]
    ],
    creditDesc: "Flexible payment system. Credits never expire. Use personally and share with your team.",
    creditBadges: ["MOST POPULAR"],
    creditLabels: ["Images generated", "Total"],
    cta: ["Use", "to accelerate your workflow today", "GET 100 FREE CREDITS NOW"],
    contactTitle: "Contact Us",
    contactDesc: "We are always ready to support you 24/7 through official channels.",
    contactItems: [
      "Follow news & latest updates",
      "Watch tutorials & visualization videos",
      "Send partnership requests & feedback",
      "Watch short videos about AI architecture"
    ],
    contactBtn: "Connect now",
    googlePackagesTitle: "Supported Google Packages",
    googlePackages: [
      {
        title: "Google AI Pro1",
        description: "Unlock the highest level of access to the best of Google AI and exclusive features.\nGet higher access to new and powerful features to boost your productivity and creativity.",
        discount: "-92%",
        badge: "HOT",
        oldPrice: "250.00$",
        newPrice: "19.99$",
        reviews: 1,
        rating: 5
      },
      {
        title: "Google AI Ultra",
        description: "Unlock the highest level of access to the best of Google AI and exclusive features.",
        discount: "-92%",
        badge: "HOT",
        oldPrice: "250.00$",
        newPrice: "19.99$",
        reviews: 1,
        rating: 5
      }
    ],
    faqTitle: "Frequently Asked Questions",
    faqDesc: "Quick answers to common questions about services, payments, and packages.",
    faq: [
      {q: "What are Credits used for and do they expire?", a: "Credits are used to generate AI images and render in high quality. They have an expiration date depending on your package, but you can purchase additional Credits anytime if you run out."},
      {q: "Can I upgrade my plan at any time?", a: "Yes. You can upgrade to a higher plan at any time without losing your current Credits."},
      {q: "Can I get a refund and use it for commercial purposes?", a: "We support refunds in case of system errors or abnormal transactions. Content generated from a paid account can be used for commercial projects."},
      {q: "How does customer support work?", a: "Our support team operates 24/7 to help you resolve technical and billing issues."},
      {q: "Can I share my account with my team?", a: "Some packages support teamwork and grant access sharing among multiple members."},
      {q: "Is there a watermark on exported images?", a: "No. Images exported from a paid package will not have a watermark."},
      {q: "Do I need to install software?", a: "No need. You can use it directly on your web browser."}
    ],
    footer: ["Terms of Service", "Privacy Policy"],
    collection: {
      title: "COLLECTION",
      desc: "Masterpieces created by F9 RENDERING users.",
      viewAll: "VIEW ALL",
      categories: ["PREMIUM INTERIOR", "URBAN PLANNING", "EXTERIOR ARCHITECTURE"],
      popupDesc: "UNIQUE DESIGN IDEA LIBRARY"
    }
  }
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<'vi' | 'en'>('en');
  const t = translations[lang];
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

function ZoomableImage({ src, alt, className, label }: { src: string, alt: string, className?: string, label?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsOpen(true)}>
        {label && <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded text-[10px] text-white font-bold tracking-wider z-10">{label}</div>}
        <img src={src} alt={alt} className={`${className} transition-transform duration-500 group-hover:scale-105`} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg" size={32} />
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10" onClick={() => setIsOpen(false)}>
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-colors rounded-full p-2 z-50" 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          >
            <X size={24} />
          </button>
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}

function Navbar({ activePage, setActivePage }: { activePage: string, setActivePage: (p: string) => void }) {
  const { lang, setLang, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0f1524]/80 backdrop-blur-md border-b border-[#2e3b52]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePage('home')}>
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded flex items-center justify-center text-white font-bold text-xl">
            F9
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            <span className="text-gray-400 text-sm font-normal ml-1">Rendering</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => setActivePage('home')} className={`${activePage === 'home' ? 'text-white' : 'text-gray-400'} flex items-center gap-2 text-sm font-medium hover:text-orange-400 transition-colors`}>
            <Home size={16} /> {t.nav[0]}
          </button>
          <button onClick={() => setActivePage('home')} className={`text-gray-400 flex items-center gap-2 text-sm font-medium hover:text-white transition-colors`}>
            <Sparkles size={16} /> {t.nav[1]}
          </button>
          <button onClick={() => setActivePage('blog')} className={`${activePage === 'blog' ? 'text-white' : 'text-gray-400'} flex items-center gap-2 text-sm font-medium hover:text-white transition-colors`}>
            <Compass size={16} /> {t.nav[2]}
          </button>
          <button onClick={() => setActivePage('home')} className={`text-gray-400 flex items-center gap-2 text-sm font-medium hover:text-white transition-colors`}>
            <Library size={16} /> {t.nav[3]}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white border border-[#2e3b52] px-3 py-1.5 rounded-lg bg-[#1a2235] transition-colors"
            >
              {lang === 'vi' ? 'VN' : 'EN'}
              <ChevronDown size={14} />
            </button>
            {showLangMenu && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-[#1a2235] border border-[#2e3b52] rounded-lg shadow-xl overflow-hidden">
                <button 
                  onClick={() => { setLang('vi'); setShowLangMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[#232d45] transition-colors ${lang === 'vi' ? 'text-orange-400 font-bold' : 'text-gray-300'}`}
                >
                  VN Tiếng Việt
                </button>
                <button 
                  onClick={() => { setLang('en'); setShowLangMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[#232d45] transition-colors ${lang === 'en' ? 'text-orange-400 font-bold' : 'text-gray-300'}`}
                >
                  EN English
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5"
          >
            {lang === 'vi' ? 'Đăng nhập' : 'Login'}
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors shadow-[0_0_12px_rgba(249,115,22,0.3)]"
          >
            {lang === 'vi' ? 'Dùng thử miễn phí' : 'Start for free'}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="pt-24 pb-8 px-4 text-center max-w-6xl mx-auto">
      <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-orange-600">F9</span> Rendering
      </h1>
      <p className="text-xl md:text-2xl text-white font-medium mb-4">
        {t.hero[0]}
      </p>
      <p className="text-gray-400 mb-10 text-lg w-full max-w-5xl mx-auto xl:whitespace-nowrap">
        {t.hero[1]}
      </p>
      <button className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
        {t.hero[2]}
      </button>
    </section>
  );
}

const FALLBACK_SLIDES = [
  { id: '1', imageUrl: "https://images.unsplash.com/photo-1628102491629-77858ab57fae?auto=format&fit=crop&w=1200&q=80", altText: 'Slide 1' },
  { id: '2', imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80", altText: 'Slide 2' },
  { id: '3', imageUrl: "https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=1200&q=80", altText: 'Slide 3' },
  { id: '4', imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80", altText: 'Slide 4' },
  { id: '5', imageUrl: "https://images.unsplash.com/photo-1510627489-b251ce0711fa?auto=format&fit=crop&w=1200&q=80", altText: 'Slide 5' },
];

function HeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const landingData = useLandingData();
  const slides = (landingData?.slides?.length ? landingData.slides : FALLBACK_SLIDES);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  React.useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section className="py-8 px-4 max-w-[1600px] mx-auto overflow-hidden mb-10">
      <div className="relative w-full h-[300px] md:h-[500px] flex items-center justify-center">
        {/* Navigation Buttons */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 md:left-12 z-20 w-12 h-12 rounded-full bg-[#1a2235]/80 border border-[#2e3b52] flex items-center justify-center text-white hover:bg-[#232d45] transition-colors backdrop-blur-sm"
        >
          <ChevronLeft size={24} />
        </button>
        
        <button 
          onClick={nextSlide}
          className="absolute right-4 md:right-12 z-20 w-12 h-12 rounded-full bg-[#1a2235]/80 border border-[#2e3b52] flex items-center justify-center text-white hover:bg-[#232d45] transition-colors backdrop-blur-sm"
        >
          <ChevronRight size={24} />
        </button>

        {/* Slider Track */}
        <div className="relative w-full h-full flex items-center justify-center">
          {slides.map((slide, idx) => {
            let offset = idx - currentIndex;
            if (offset < -2) offset += slides.length;
            if (offset > 2) offset -= slides.length;

            const isActive = offset === 0;
            const isPrev = offset === -1;
            const isNext = offset === 1;
            
            let translateX = 0;
            let scale = 1;
            let zIndex = 0;
            let opacity = 0;

            if (isActive) {
              translateX = 0;
              scale = 1;
              zIndex = 10;
              opacity = 1;
            } else if (isPrev) {
              translateX = -60;
              scale = 0.85;
              zIndex = 5;
              opacity = 0.4;
            } else if (isNext) {
              translateX = 60;
              scale = 0.85;
              zIndex = 5;
              opacity = 0.4;
            } else {
              translateX = offset < 0 ? -100 : 100;
              scale = 0.7;
              zIndex = 1;
              opacity = 0;
            }

            return (
              <div 
                key={idx}
                className="absolute top-0 bottom-0 my-auto w-[75%] md:w-[55%] h-[80%] md:h-[90%] rounded-2xl overflow-hidden transition-all duration-500 ease-in-out shadow-2xl cursor-pointer"
                style={{
                  transform: `translateX(${translateX}%) scale(${scale})`,
                  zIndex,
                  opacity,
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
                onClick={() => {
                  if (isPrev) prevSlide();
                  if (isNext) nextSlide();
                }}
              >
                <div className={`absolute inset-0 bg-[#0f1524] transition-opacity duration-500 ${isActive ? 'opacity-0' : 'opacity-60'}`}></div>
                <img src={slide.imageUrl} alt={slide.altText || `Slide ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            );
          })}
        </div>

        {/* Pagination Dots */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-purple-500 w-2' : 'bg-gray-600 w-2 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimatedNumber({ value, duration = 2000 }: { value: number, duration?: number }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration, isVisible]);

  return <span ref={ref}>{count}</span>;
}

function Stats() {
  const { t } = useLanguage();
  return (
    <section className="py-6 px-4 max-w-7xl mx-auto mb-10">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#1a2235] p-8 rounded-2xl border border-[#2e3b52] flex flex-col justify-center items-center text-center">
          <h4 className="text-gray-400 text-sm font-bold mb-2 uppercase tracking-widest">{t.stats[0]}</h4>
          <div className="text-5xl font-extrabold text-white mb-4"><AnimatedNumber value={15} />+</div>
          <div className="flex gap-2 flex-wrap justify-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-10 h-10 rounded-xl bg-[#232d45] border border-[#2e3b52] flex items-center justify-center text-gray-500">
                <Building size={18} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#1a2235] p-8 rounded-2xl border border-[#2e3b52] flex flex-col justify-center items-center text-center">
          <h4 className="text-gray-400 text-sm font-bold mb-2 uppercase tracking-widest">{t.stats[1]}</h4>
          <div className="text-5xl font-extrabold text-white mb-4"><AnimatedNumber value={1000} />+</div>
          <div className="flex gap-2 flex-wrap justify-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-10 h-10 rounded-full bg-[#232d45] border border-[#2e3b52] flex items-center justify-center text-gray-500">
                <User size={18} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section className="py-10 px-4 max-w-[1600px] mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 uppercase tracking-wider">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">F9 Rendering</span> {t.how[0]}
        </h2>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start relative">
        {/* Connecting line */}
        <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10"></div>
        
        <div className="flex flex-col items-center text-center flex-1 px-4 mb-12 md:mb-0">
          <div className="w-16 h-16 rounded-full bg-[#1a2235] border border-[#2e3b52] flex items-center justify-center text-white font-bold text-xl mb-6 shadow-lg">1</div>
          <h4 className="text-lg font-bold text-white mb-3">{t.how[1]}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{t.how[2]}</p>
        </div>
        
        <div className="flex flex-col items-center text-center flex-1 px-4 mb-12 md:mb-0">
          <div className="w-16 h-16 rounded-full bg-[#1a2235] border border-[#2e3b52] flex items-center justify-center text-white font-bold text-xl mb-6 shadow-lg">2</div>
          <h4 className="text-lg font-bold text-white mb-3">{t.how[3]}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{t.how[4]}</p>
        </div>
        
        <div className="flex flex-col items-center text-center flex-1 px-4">
          <div className="w-16 h-16 rounded-full bg-[#1a2235] border border-[#2e3b52] flex items-center justify-center text-white font-bold text-xl mb-6 shadow-lg">3</div>
          <h4 className="text-lg font-bold text-white mb-3">{t.how[5]}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{t.how[6]}</p>
        </div>
      </div>
    </section>
  );
}

function ShowcaseTabs() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const landingData = useLandingData();

  const FALLBACK_TABS = [
    { id: 'architecture', tabKey: 'architecture', titleVi: 'Kiến Trúc', titleEn: 'Architecture', descriptionVi: 'Tạo ảnh render chân thực từ bản vẽ tay hoặc ảnh chụp mô hình SketchUp 3D.', descriptionEn: 'Create realistic renders from hand drawings or 3D SketchUp model screenshots.', originalImageUrl: 'https://images.unsplash.com/photo-1628102491629-77858ab57fae?auto=format&fit=crop&w=800&q=80', renderImageUrls: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1510627489-b251ce0711fa?auto=format&fit=crop&w=400&q=80'] },
    { id: 'interior', tabKey: 'interior', titleVi: 'Nội Thất', titleEn: 'Interior', descriptionVi: 'Biến không gian trống thành các concept nội thất đa dạng phong cách.', descriptionEn: 'Turn empty spaces into interior concepts with diverse styles.', originalImageUrl: 'https://images.unsplash.com/photo-1523217582562-5ec804b4d6df?auto=format&fit=crop&w=800&q=80', renderImageUrls: ['https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1493809842364-4bf803b9ad1b?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'] },
    { id: 'landscape', tabKey: 'landscape', titleVi: 'Cảnh Quan', titleEn: 'Landscape', descriptionVi: 'Render mặt bằng tổng thể với cây xanh, ánh sáng và vật liệu chân thực.', descriptionEn: 'Render master plans with realistic greenery, lighting, and materials.', originalImageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80', renderImageUrls: ['https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1542361345-89e58247f2d5?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1448630360428-14433d9ca9d9?auto=format&fit=crop&w=400&q=80'] },
  ];
  const apiTabs = landingData?.showcaseTabs?.length ? landingData.showcaseTabs : FALLBACK_TABS;
  const tabs = apiTabs.map(tab => ({
    id: tab.tabKey,
    title: lang === 'vi' ? tab.titleVi : tab.titleEn,
    description: lang === 'vi' ? tab.descriptionVi : tab.descriptionEn,
    originalImg: tab.originalImageUrl,
    renders: tab.renderImageUrls || [],
  }));

  return (
    <section className="py-10 px-4 max-w-[1600px] mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 uppercase tracking-wider">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">F9 Rendering</span> {t.showcaseTitle}
        </h2>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {tabs.map((tab, idx) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-3 rounded-full font-medium text-sm transition-all ${activeTab === idx ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-[#1a2235] text-gray-400 hover:text-white border border-[#2e3b52] hover:border-white/20'}`}
          >
            {tab.title}
          </button>
        ))}
      </div>

      <div className="bg-[#1a2235] rounded-2xl p-6 md:p-10 border border-[#2e3b52]">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">{tabs[activeTab].title}</h3>
          <p className="text-gray-400 text-sm">{tabs[activeTab].description}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative rounded-2xl overflow-hidden bg-[#232d45]">
            <ZoomableImage src={tabs[activeTab].originalImg} alt="Original" className="w-full h-full object-cover aspect-[4/3]" label={lang === 'vi' ? "ẢNH GỐC" : "ORIGINAL"} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {tabs[activeTab].renders.map((img, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden bg-[#232d45]">
                <ZoomableImage src={img} alt={`Render ${idx + 1}`} className="w-full h-full object-cover aspect-[4/3]" label={idx === 0 ? (lang === 'vi' ? "ẢNH RENDER TỪ F9 RENDERING" : "RENDERED BY F9 RENDERING") : undefined} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdvancedFeaturesBento() {
  const { lang, t } = useLanguage();
  const landingData = useLandingData();

  const FC_FALLBACK = {
    editing:      { beforeImageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80', afterImageUrl: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80', extraImageUrls: [] },
    mixing:       { beforeImageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80', afterImageUrl: 'https://images.unsplash.com/photo-1493809842364-4bf803b9ad1b?auto=format&fit=crop&w=800&q=80', extraImageUrls: [] },
    perspectives: { beforeImageUrl: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80', afterImageUrl: '', extraImageUrls: ['https://images.unsplash.com/photo-1628102491629-77858ab57fae?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80','https://images.unsplash.com/photo-1510627489-b251ce0711fa?auto=format&fit=crop&w=400&q=80'] },
  };
  const cards = landingData?.featureCards || [];
  const fc = (key: string) => cards.find(c => c.cardKey === key) || (FC_FALLBACK as any)[key];
  const editing = fc('editing');
  const mixing = fc('mixing');
  const perspectives = fc('perspectives');

  return (
    <section className="py-10 px-4 max-w-[1600px] mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 uppercase tracking-wider">
          {t.adv[0]}
        </h2>
        <p className="text-gray-400 text-sm max-w-2xl mx-auto">{lang === 'vi' ? "Kiểm soát hoàn toàn quá trình sáng tạo với các công cụ chỉnh sửa và tạo góc nhìn chuyên sâu." : "Take full control of the creative process with advanced editing and perspective tools."}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Editing & Mixing - Takes up 2 columns */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-[#1a2235] rounded-2xl p-6 md:p-8 border border-[#2e3b52] flex-1">
            <h3 className="text-xl font-bold text-white mb-2">{t.adv[1]}</h3>
            <p className="text-gray-400 text-sm mb-6">{t.adv[2]}</p>
            <div className="grid grid-cols-2 gap-4 h-[200px] md:h-[250px]">
              <div className="relative rounded-xl overflow-hidden bg-[#232d45]">
                <ZoomableImage src={editing?.beforeImageUrl || FC_FALLBACK.editing.beforeImageUrl} alt="Before" className="w-full h-full object-cover" label={lang === 'vi' ? "TRƯỚC" : "BEFORE"} />
              </div>
              <div className="relative rounded-xl overflow-hidden bg-[#232d45]">
                <ZoomableImage src={editing?.afterImageUrl || FC_FALLBACK.editing.afterImageUrl} alt="After" className="w-full h-full object-cover" label={lang === 'vi' ? "SAU" : "AFTER"} />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a2235] rounded-2xl p-6 md:p-8 border border-[#2e3b52] flex-1">
            <h3 className="text-xl font-bold text-white mb-2">{t.adv[3]}</h3>
            <p className="text-gray-400 text-sm mb-6">{t.adv[4]}</p>
            <div className="grid grid-cols-2 gap-4 h-[200px] md:h-[250px]">
              <div className="relative rounded-xl overflow-hidden bg-[#232d45]">
                <ZoomableImage src={mixing?.beforeImageUrl || FC_FALLBACK.mixing.beforeImageUrl} alt="Before" className="w-full h-full object-cover" label={lang === 'vi' ? "GỐC" : "ORIGINAL"} />
              </div>
              <div className="relative rounded-xl overflow-hidden bg-[#232d45]">
                <ZoomableImage src={mixing?.afterImageUrl || FC_FALLBACK.mixing.afterImageUrl} alt="After" className="w-full h-full object-cover" label="MIX" />
              </div>
            </div>
          </div>
        </div>

        {/* Perspectives - Takes up 1 column */}
        <div className="md:col-span-1 bg-[#1a2235] rounded-2xl p-6 md:p-8 border border-[#2e3b52] flex flex-col">
          <h3 className="text-xl font-bold text-white mb-2">{t.adv[5]}</h3>
          <p className="text-gray-400 text-sm mb-6">{t.adv[6]}</p>
          
          <div className="relative rounded-xl overflow-hidden bg-[#232d45] mb-4 h-[200px]">
            <ZoomableImage src={perspectives?.beforeImageUrl || FC_FALLBACK.perspectives.beforeImageUrl} alt="Original" className="w-full h-full object-cover" label={lang === 'vi' ? "ẢNH GỐC" : "ORIGINAL"} />
          </div>
          
          <div className="grid grid-cols-2 gap-3 flex-1">
            {(perspectives?.extraImageUrls?.length ? perspectives.extraImageUrls : FC_FALLBACK.perspectives.extraImageUrls).map((img: string, idx: number) => (
              <div key={idx} className="relative rounded-xl overflow-hidden bg-[#232d45]">
                <ZoomableImage src={img} alt={`Perspective ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const { t } = useLanguage();
  return (
    <section className="py-12 px-4 max-w-[1600px] mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 uppercase tracking-wider">
          {t.feat[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">F9 Rendering</span>
        </h2>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-[#1a2235] p-8 rounded-2xl border border-[#2e3b52] hover:border-orange-500/50 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6">
            <Zap size={28} />
          </div>
          <h4 className="text-xl font-bold text-white mb-3">{t.feat[1]}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{t.feat[2]}</p>
        </div>
        <div className="bg-[#1a2235] p-8 rounded-2xl border border-[#2e3b52] hover:border-orange-500/50 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6">
            <InfinityIcon size={28} />
          </div>
          <h4 className="text-xl font-bold text-white mb-3">{t.feat[3]}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{t.feat[4]}</p>
        </div>
        <div className="bg-[#1a2235] p-8 rounded-2xl border border-[#2e3b52] hover:border-orange-500/50 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-6">
            <Layers size={28} />
          </div>
          <h4 className="text-xl font-bold text-white mb-3">{t.feat[5]}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{t.feat[6]}</p>
        </div>
      </div>
    </section>
  );
}

function Collection() {
  const { t } = useLanguage();
  const [activePopup, setActivePopup] = useState<number | null>(null);

  const categories = [
    {
      title: t.collection.categories[0],
      cover: "https://images.unsplash.com/photo-1523217582562-5ec804b4d6df?auto=format&fit=crop&w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1493809842364-4bf803b9ad1b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: t.collection.categories[1],
      cover: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1460472178825-e5240623afd5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80"
      ]
    },
    {
      title: t.collection.categories[2],
      cover: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=800&q=80",
      images: [
        "https://images.unsplash.com/photo-1628102491629-77858ab57fae?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1613490908692-50849c323ee8?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1510627489-b251ce0711fa?auto=format&fit=crop&w=800&q=80"
      ]
    }
  ];

  return (
    <section className="py-12 px-4 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2 uppercase tracking-wider">
            {t.collection.title}
          </h2>
          <p className="text-gray-400 text-sm">{t.collection.desc}</p>
        </div>
        <button className="text-red-500 font-bold text-sm hover:text-red-400 transition-colors uppercase tracking-wider border-b border-red-500/30 pb-1">
          {t.collection.viewAll}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {categories.map((cat, idx) => (
          <div 
            key={idx} 
            className="group relative h-[500px] rounded-lg overflow-hidden cursor-pointer border border-transparent hover:border-red-500 transition-all duration-300"
            onClick={() => setActivePopup(idx)}
          >
            <img src={cat.cover} alt={cat.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6">
              <h3 className="text-white font-bold text-sm tracking-wider uppercase">{cat.title}</h3>
            </div>
          </div>
        ))}
      </div>

      {activePopup !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10">
          <div className="relative w-full max-w-[1600px] h-full max-h-[90vh] bg-[#0a0a0a] rounded-xl border border-white/10 flex flex-col overflow-hidden">
            <div className="flex justify-between items-start p-8 border-b border-white/5">
              <div>
                <h2 className="text-3xl font-bold text-red-500 mb-2 uppercase tracking-wider">{categories[activePopup].title}</h2>
                <p className="text-gray-400 text-sm uppercase tracking-widest">{t.collection.popupDesc}</p>
              </div>
              <div className="flex gap-4">
                <button className="text-gray-400 hover:text-white transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
                <button 
                  onClick={() => setActivePopup(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={28} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories[activePopup].images.map((img, idx) => (
                  <div key={idx} className={`rounded-lg overflow-hidden ${idx === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover aspect-[4/3]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PricingTable() {
  const { t } = useLanguage();
  const items = [
    { name: "Nano Banana 2 (1K / 2K / 4K)", price: "30 / 45 / 70 credit" },
    { name: t.priceRows[0][0], price: "20 ~ 100 credit / " + t.priceRows[0][1] },
    { name: t.priceRows[1][0], price: "20 ~ 100 credit / " + t.priceRows[1][1] },
    { name: t.priceRows[2][0], price: "20 ~ 100 credit / " + t.priceRows[2][1] },
    { name: t.priceRows[3][0], price: "20 ~ 100 credit / " + t.priceRows[3][1] },
    { name: t.priceRows[4][0], price: "20 ~ 100 credit / " + t.priceRows[4][1] },
    { name: t.priceRows[5][0], price: "20 ~ 100 credit / " + t.priceRows[5][1] },
    { name: t.priceRows[6][0], price: "5 credit / " + t.priceRows[6][1] },
    { name: t.priceRows[7][0], price: "55 / 80 credit / " + t.priceRows[7][1] },
    { name: t.priceRows[8][0], price: "20 ~ 100 credit / " + t.priceRows[8][1] },
  ];

  return (
    <section className="py-12 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 uppercase tracking-wider">
          {t.priceTitle.split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">{t.priceTitle.split(' ').slice(1).join(' ')}</span>
        </h2>
        <p className="text-gray-400 text-sm">{t.priceDesc}</p>
      </div>
      
      <div className="bg-[#1a2235] rounded-2xl overflow-hidden border border-[#2e3b52]">
        {items.map((item, idx) => (
          <div key={idx} className={`flex justify-between items-center p-6 hover:bg-white/[0.02] transition-colors ${idx !== items.length - 1 ? 'border-b border-[#2e3b52]' : ''}`}>
            <span className="text-white font-medium">{item.name}</span>
            <span className="text-orange-400 text-sm font-bold bg-orange-500/10 px-4 py-1.5 rounded-full">{item.price}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CreditPackages() {
  const { lang, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPkg, setCheckoutPkg] = useState<any>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/payment/packages`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setDbPackages(resData.data);
        }
      })
      .catch((err) => console.error('Error fetching db packages:', err));
  }, []);

  const handleSelectPkg = (pkgName: string) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const match = dbPackages.find((p) => p.name.toUpperCase() === pkgName.toUpperCase());
    if (match) {
      setCheckoutPkg(match);
    } else {
      const fallbackMap: Record<string, any> = {
        STARTER: { name: 'STARTER', credits: 3000, price: 299000 },
        PRO: { name: 'PRO', credits: 7000, price: 599000 },
        ULTRA: { name: 'ULTRA', credits: 25000, price: 1999000 },
      };
      setCheckoutPkg(fallbackMap[pkgName.toUpperCase()]);
    }
    setIsCheckoutOpen(true);
  };

  const packages = [
    {
      name: "STARTER",
      credits: "3.000 Credits",
      originalPrice: lang === 'vi' ? "349.000 đ" : "$13.71",
      discount: "-14%",
      price: lang === 'vi' ? "299.000" : "11.75",
      currency: lang === 'vi' ? "đ" : "$",
      isPrefixCurrency: lang !== 'vi',
      autoRenew: lang === 'vi' ? "Gia hạn tự động" : "Auto renew",
      buttonText: lang === 'vi' ? "NHẬN NGAY 3.000 Credits" : "GET NOW 3.000 Credits",
      bottomPrice: lang === 'vi' ? "Chọn Gói Này" : "Select This Package",
      popular: false,
      theme: "purple",
      features: lang === 'vi' ? [
        "Tổng 3.000 Credits",
        "Gói tiêu chuẩn",
        "Hạn sử dụng: 1 Tháng",
        "Truy cập tất cả công cụ AI",
        "Render tốc độ tiêu chuẩn",
        "Hỗ trợ ưu tiên 24/7",
        "Tính năng truy cập sớm"
      ] : [
        "Total 3,000 Credits",
        "Standard package",
        "Duration: 1 Month",
        "Access to all AI tools",
        "Standard render speed",
        "24/7 priority support",
        "Early feature access"
      ]
    },
    {
      name: "PRO",
      credits: "7.000 Credits",
      originalPrice: lang === 'vi' ? "700.000 đ" : "$27.50",
      discount: "-14%",
      price: lang === 'vi' ? "599.000" : "23.54",
      currency: lang === 'vi' ? "đ" : "$",
      isPrefixCurrency: lang !== 'vi',
      autoRenew: lang === 'vi' ? "Gia hạn tự động" : "Auto renew",
      buttonText: lang === 'vi' ? "NHẬN NGAY 7.000 Credits" : "GET NOW 7.000 Credits",
      bottomPrice: lang === 'vi' ? "Chọn Gói Này" : "Select This Package",
      popular: true,
      theme: "orange",
      features: lang === 'vi' ? [
        "Tổng 7.000 Credits",
        "Hạn sử dụng: 3 Tháng",
        "Tối ưu chi phí & hiệu năng",
        "Truy cập tất cả công cụ AI",
        "Render tốc độ cao",
        "Hỗ trợ ưu tiên 24/7",
        "Tính năng truy cập sớm"
      ] : [
        "Total 7,000 Credits",
        "Duration: 3 Months",
        "Cost & performance optimized",
        "Access to all AI tools",
        "High-speed render",
        "24/7 priority support",
        "Early feature access"
      ]
    },
    {
      name: "ULTRA",
      credits: "25.000 Credits",
      originalPrice: lang === 'vi' ? "2.500.000 đ" : "$98.23",
      discount: "-20%",
      price: lang === 'vi' ? "1.999.000" : "78.55",
      currency: lang === 'vi' ? "đ" : "$",
      isPrefixCurrency: lang !== 'vi',
      autoRenew: lang === 'vi' ? "Gia hạn tự động" : "Auto renew",
      buttonText: lang === 'vi' ? "NHẬN NGAY 25.000 Credits" : "GET NOW 25.000 Credits",
      bottomPrice: lang === 'vi' ? "Chọn Gói Này" : "Select This Package",
      popular: false,
      theme: "purple",
      features: lang === 'vi' ? [
        "Tổng 25.000 Credits",
        "Hạn sử dụng: 6 Tháng",
        "Chi phí rẻ nhất/credit",
        "Truy cập tất cả công cụ AI",
        "Render tốc độ siêu tốc",
        "Hỗ trợ ưu tiên 24/7",
        "Tính năng truy cập sớm"
      ] : [
        "Total 25,000 Credits",
        "Duration: 6 Months",
        "Lowest cost/credit",
        "Access to all AI tools",
        "Ultra-speed render",
        "24/7 priority support",
        "Early feature access"
      ]
    }
  ];

  return (
    <section className="py-12 px-4 max-w-[1600px] mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 mb-4 uppercase tracking-wider">
          CREDITS
        </h2>
        <p className="text-gray-400 text-sm">{t.creditDesc}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {packages.map((pkg, idx) => (
          <div 
            key={idx} 
            className={`relative rounded-2xl p-6 md:p-8 flex flex-col ${
              pkg.popular 
                ? 'bg-[#1a2235] border border-orange-500/80 shadow-[0_0_40px_rgba(249,115,22,0.15)] transform lg:-translate-y-4' 
                : 'bg-[#1a2235] border border-[#2e3b52] hover:border-white/10'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-400 text-black text-xs font-bold px-5 py-2 rounded-full flex items-center gap-1 shadow-lg whitespace-nowrap">
                <Flame size={14} /> {t.creditBadges[0]}
              </div>
            )}
            
            <div className="text-center mb-6 mt-2">
              <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wider">{pkg.name}</h3>
              <div className="flex justify-center items-center gap-2 mb-6 text-orange-400 font-bold text-lg">
                <Coins size={20} /> {pkg.credits}
              </div>
              
              <div className="flex justify-center items-center gap-3 text-sm mb-2">
                <span className="text-gray-500 line-through font-medium">{pkg.originalPrice}</span>
                <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs font-bold">{pkg.discount}</span>
              </div>
              <div className="flex justify-center items-baseline gap-1 mb-2">
                {pkg.isPrefixCurrency && <span className="text-xl font-bold text-gray-300">{pkg.currency}</span>}
                <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">{pkg.price}</span>
                {!pkg.isPrefixCurrency && <span className="text-xl font-bold text-gray-300">{pkg.currency}</span>}
              </div>
              <div className="text-gray-500 text-xs mb-8">{pkg.autoRenew}</div>
              
              <button 
                onClick={() => handleSelectPkg(pkg.name)}
                className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-colors uppercase tracking-wider ${
                  pkg.theme === 'orange' 
                    ? 'bg-[#ff6f00] hover:bg-[#e66400]' 
                    : 'bg-[#232d45] hover:bg-[#2a3652]'
                }`}
              >
                {pkg.buttonText}
              </button>
            </div>
            
            <div className="space-y-4 mb-10 pl-2">
              {pkg.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => handleSelectPkg(pkg.name)}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-colors mt-auto ${
                pkg.theme === 'orange' 
                  ? 'bg-[#ff6f00] text-white hover:bg-[#e66400]' 
                  : 'bg-[#232d45] text-white hover:bg-[#2a3652]'
              }`}
            >
              {pkg.bottomPrice}
            </button>
          </div>
        ))}
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedPackage={checkoutPkg}
      />
    </section>
  );
}

function GooglePackages() {
  const { t } = useLanguage();
  return (
    <section className="pb-16 px-4 max-w-[1600px] mx-auto">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-4 tracking-wider uppercase">
          {t.googlePackagesTitle}
        </h2>
      </div>
      
      <div className="flex flex-wrap justify-center gap-6">
        {t.googlePackages.map((pkg: any, idx: number) => (
          <div key={idx} className="w-full max-w-[320px] bg-[#1a2235] rounded-2xl overflow-hidden border border-[#2e3b52] hover:border-blue-500/50 transition-all group hover:-translate-y-1">
            {/* Image Placeholder mimicking the design */}
            <div className="relative aspect-square bg-[#0c162c] flex items-center justify-center p-4">
              <div className="absolute top-2 left-2 bg-[#e6f4ea] text-[#137333] text-xs font-bold px-2 py-1 rounded shadow-sm">
                {pkg.discount}
              </div>
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                {pkg.badge}
              </div>
              
              <div className="text-center w-full">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-red-400 to-yellow-400">Google</div>
                </div>
                <div className="text-2xl font-extrabold text-white mb-4">One</div>
                <div className="flex justify-center gap-3">
                  {/* Fake document icons */}
                  <div className="w-8 h-10 bg-blue-500 rounded relative overflow-hidden shadow">
                    <div className="absolute top-2 left-1.5 w-5 h-1 bg-white/50 rounded-sm"></div>
                    <div className="absolute top-4 left-1.5 w-5 h-1 bg-white/50 rounded-sm"></div>
                    <div className="absolute top-6 left-1.5 w-3 h-1 bg-white/50 rounded-sm"></div>
                  </div>
                  <div className="w-8 h-10 bg-yellow-500 rounded relative overflow-hidden shadow">
                     <div className="absolute top-2 left-1.5 w-5 h-1 bg-white/50 rounded-sm"></div>
                  </div>
                  <div className="w-8 h-10 bg-green-500 rounded relative overflow-hidden shadow">
                    <div className="absolute top-0 right-0 border-l-[32px] border-b-[40px] border-l-transparent border-b-green-600 opacity-50"></div>
                  </div>
                </div>
                {idx === 0 && (
                  <div className="mt-3 text-gray-400 italic font-light text-sm">1 Year</div>
                )}
                {idx === 1 && (
                  <div className="mt-3 text-gray-400 italic font-bold text-sm">1 Month</div>
                )}
              </div>
            </div>
            
            {/* Card Content */}
            <div className="p-5">
              <h3 className={`text-white font-bold text-base leading-snug ${pkg.description ? 'mb-1' : 'mb-3'}`}>{pkg.title}</h3>
              {pkg.description && (
                <p className="text-gray-400 text-xs italic font-light mb-3 whitespace-pre-wrap">{pkg.description}</p>
              )}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-yellow-400 text-sm">
                  {'★'.repeat(pkg.rating)}
                </div>
                <span className="text-gray-500 text-xs">({pkg.reviews})</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 line-through text-sm font-medium">{pkg.oldPrice}</span>
                  <span className="text-red-500 font-extrabold text-xl">{pkg.newPrice}</span>
                </div>
                <button className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded transition-colors uppercase">
                  Buy now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SupportSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const contacts = [
    {
      name: "Facebook",
      desc: t.contactItems[0],
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#1877F2]" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      name: "Youtube",
      desc: t.contactItems[1],
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#FF0000]" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    },
    {
      name: "Email",
      desc: t.contactItems[2],
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 8.404l8.073-4.911c1.618-1.214 3.927-.059 3.927 1.964Z" fill="#4285F4"/>
          <path d="M18.545 21.002h3.819c.904 0 1.636-.732 1.636-1.636V5.457c0-2.023-2.309-3.178-3.927-1.964L12 8.404l6.545 4.91v7.688Z" fill="#34A853"/>
          <path d="M5.455 21.002H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 8.404l-6.545 4.91v7.688Z" fill="#FBBC04"/>
          <path d="M12 16.64 5.455 11.73V3.493L12 8.404l6.545-4.911v8.237L12 16.64Z" fill="#EA4335"/>
        </svg>
      )
    },
    {
      name: "Tiktok",
      desc: t.contactItems[3],
      icon: (
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      )
    }
  ];

  return (
    <section className="pb-16 px-4 max-w-[1600px] mx-auto">
      <div className="grid lg:grid-cols-2 gap-16 items-start">
        {/* Contact Left Side */}
        <div>
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-4 tracking-wider uppercase">
              {t.contactTitle}
            </h2>
            <p className="text-gray-400 text-sm">{t.contactDesc}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {contacts.map((contact, idx) => (
              <div key={idx} className="bg-[#1a2235] rounded-2xl p-8 border border-[#2e3b52] flex flex-col items-center text-center hover:border-orange-500/50 transition-all group hover:-translate-y-1">
                <div className="w-16 h-16 rounded-2xl bg-[#232d45] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  {contact.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{contact.name}</h3>
                <p className="text-gray-400 text-sm mb-6 flex-1">{contact.desc}</p>
                <a 
                  href="https://www.facebook.com/f9renderdotcom"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 rounded-full border border-[#2e3b52] text-gray-300 hover:text-white hover:bg-[#232d45] transition-colors text-sm font-medium w-full flex items-center justify-center"
                >
                  {t.contactBtn}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Right Side */}
        <div>
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-4 tracking-wider uppercase">
              {t.faqTitle}
            </h2>
            <p className="text-gray-400 text-sm">{t.faqDesc}</p>
          </div>
          
          <div className="space-y-4">
            {t.faq.map((item: {q: string, a: string}, idx: number) => (
              <div 
                key={idx} 
                className="border border-[#2e3b52] rounded-xl bg-[#1a2235] overflow-hidden transition-colors hover:border-gray-500"
              >
                <button 
                  className="w-full flex justify-between items-center py-5 px-6 text-left focus:outline-none"
                  onClick={() => toggleOpen(idx)}
                >
                  <h3 className="text-base font-bold text-white pr-4">{item.q}</h3>
                  <div className={`text-gray-400 transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} />
                  </div>
                </button>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-5 text-gray-400 text-sm leading-relaxed">
                    {item.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  const { t } = useLanguage();
  return (
    <section className="py-16 px-4 text-center max-w-6xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8 uppercase tracking-wider leading-tight">
        {t.cta[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">F9 Rendering</span> {t.cta[1]}
      </h2>
      <button className="px-8 py-4 rounded-full bg-transparent border-2 border-white text-white font-bold text-sm tracking-wide hover:bg-white hover:text-black transition-all flex items-center gap-3 mx-auto">
        <Zap size={18} className="text-orange-400" /> {t.cta[2]}
      </button>
    </section>
  );
}

function Footer({ setActivePage }: { setActivePage: (p: string) => void }) {
  return (
    <footer className="pt-16 pb-8 px-4 bg-[#0b1120] border-t border-[#1a2235]">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Column 1 */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded flex items-center justify-center text-white font-bold text-xl">
                F9
              </div>
              <span className="text-white font-bold text-xl tracking-tight">
                <span className="text-gray-400 text-sm font-normal ml-1">Rendering</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Nền tảng AI Architecture số 1 Việt Nam. Trao quyền sáng tạo không giới hạn cho cộng đồng thiết kế.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/f9renderdotcom" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#1a2235] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#232d45] transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.youtube.com/@f9rendering" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#1a2235] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#232d45] transition-colors">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="mailto:contact@f9render.com" className="w-10 h-10 rounded-full bg-[#1a2235] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#232d45] transition-colors">
                <Mail size={18} />
              </a>
              <a href="https://www.tiktok.com/@f9rendering" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#1a2235] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#232d45] transition-colors">
                 <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                   <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                 </svg>
              </a>
            </div>
          </div>
          
          {/* Column 2 */}
          <div className="col-span-1 md:col-span-1 pl-0 md:pl-10">
            <h4 className="text-white font-bold text-base mb-6">Sản phẩm</h4>
            <ul className="flex flex-col gap-4">
              <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-gray-400 hover:text-white text-sm transition-colors">Render Ngoại thất</button></li>
              <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-gray-400 hover:text-white text-sm transition-colors">Render Nội thất</button></li>
              <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-gray-400 hover:text-white text-sm transition-colors">Cải tạo nhà</button></li>
              <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-gray-400 hover:text-white text-sm transition-colors">Làm phim kiến trúc</button></li>
            </ul>
          </div>
          
          {/* Column 3 */}
          <div className="col-span-1 md:col-span-1">
            <h4 className="text-white font-bold text-base mb-6">Tài nguyên</h4>
            <ul className="flex flex-col gap-4">
              <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-gray-400 hover:text-white text-sm transition-colors">Bảng giá</button></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="col-span-1 md:col-span-1">
            <h4 className="text-white font-bold text-base mb-6">Pháp lý</h4>
            <ul className="flex flex-col gap-4">
              <li><button onClick={() => { setActivePage('terms'); window.scrollTo(0,0); }} className="text-gray-400 hover:text-white text-sm transition-colors">Điều khoản sử dụng</button></li>
              <li><button onClick={() => { setActivePage('privacy'); window.scrollTo(0,0); }} className="text-gray-400 hover:text-white text-sm transition-colors">Chính sách bảo mật</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#1a2235] text-center flex flex-col items-center justify-center">
          <p className="text-[#a1b0cc] text-[15px] mb-2 font-medium">
            © 2024 Auto Rendering Apps.Bản quyền được bảo lưu và thuộc về F9render.com Team.
          </p>
          <p className="text-[#64748b] text-sm font-medium">
            Professional AI Rendering Solutions
          </p>
        </div>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      style={{
        zIndex: 50,
      }}
      className="fixed bottom-8 right-8 p-3 rounded-full border-2 border-orange-500 bg-[#0f1524]/80 text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-lg backdrop-blur-sm group"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
}

const blogPosts = [
  {
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "XU HƯỚNG AI", en: "AI TRENDS" },
    tagLogo: true,
    title: { vi: "Tương lai của Kiến trúc: Sự trỗi dậy của AI Rendering", en: "The Future of Architecture: The Rise of AI Rendering" },
    excerpt: { vi: "Công nghệ Trí tuệ Nhân tạo (AI) đang định hình lại cách chúng ta thiết kế và giới thiệu các dự án kiến trúc...", en: "Artificial Intelligence (AI) technology is reshaping how we design and present architectural projects..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600607687931-cebf574fd842?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "CÔNG CỤ", en: "TOOLS" },
    title: { vi: "5 Công Cụ AI Biến Bản Vẽ Thành Render Thực Tế Trong Giây Lát", en: "5 AI Tools to Turn Drawings into Realistic Renders in Seconds" },
    excerpt: { vi: "Khám phá các phần mềm mạnh mẽ có khả năng biến bản phác thảo thô thành hình ảnh photorealistic ngay lập tức...", en: "Discover powerful software capable of turning rough sketches into photorealistic images instantly..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "GÓC NHÌN", en: "PERSPECTIVE" },
    title: { vi: "AI Sẽ Thay Thế Diễn Họa Viên Không? Cơ Hội Hay Thách Thức?", en: "Will AI Replace 3D Artists? Opportunity or Challenge?" },
    excerpt: { vi: "Nhiều người e ngại AI sẽ cướp đi công việc của các họa viên 3D, nhưng sự thật có phải như vậy?...", en: "Many fear that AI will steal the jobs of 3D artists, but is that the truth?..." },
  },
  {
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "TUTORIALS", en: "TUTORIALS" },
    title: { vi: "Cách Ứng Dụng Midjourney & Stable Diffusion Trong Thiết Kế Nội Thất", en: "How to Apply Midjourney & Stable Diffusion in Interior Design" },
    excerpt: { vi: "Hướng dẫn từng bước cách sử dụng các mô hình AI tạo ảnh phổ biến nhất để lên ý tưởng không gian nội thất...", en: "Step-by-step guide on how to use the most popular AI image generation models to ideate interior spaces..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "GIẢI PHÁP", en: "SOLUTION" },
    title: { vi: "Tối Ưu Quy Trình Làm Việc Cho Studio Kiến Trúc Với AI", en: "Optimizing Workflow for Architecture Studios with AI" },
    excerpt: { vi: "Làm thế nào để tích hợp workflow AI vào studio của bạn để tiết kiệm thời gian và nâng cao chất lượng sản phẩm...", en: "How to integrate AI workflow into your studio to save time and improve product quality..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "SO SÁNH", en: "COMPARISON" },
    title: { vi: "Render AI và Render Truyền Thống: Chất lượng, Tốc độ, Chi phí", en: "AI Rendering vs Traditional Rendering: Quality, Speed, Cost" },
    excerpt: { vi: "Bài kiểm tra chi tiết đặt lên bàn cân sức mạnh của các trình render phổ thông và sức mạnh tạo ảnh từ AI...", en: "A detailed test weighting the power of popular renderers against the power of AI image generation..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "TUTORIALS", en: "TUTORIALS" },
    title: { vi: "Hướng Dẫn Viết Prompt Hiệu Quả Cho AI Render Kiến Trúc", en: "Guide to Writing Effective Prompts for Architecture AI Renders" },
    excerpt: { vi: "Bí kíp cấu trúc câu lệnh prompt engineering dành riêng cho các nhà thiết kế kiến trúc để AI hiểu ý tưởng tốt nhất...", en: "Prompt engineering structural secrets specifically for designers so AI understands ideas best..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600566753086-00f18efc2291?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "CHUYÊN ĐỀ", en: "TOPIC" },
    title: { vi: "Từ Khách Hàng Đến Bản Vẽ: Chốt Deal Nhanh Chóng Nhờ Hình Ảnh 3D AI", en: "From Client to Drawing: Closing Deals Fast with AI 3D Images" },
    excerpt: { vi: "Rút ngắn quy trình phản hồi và khiến khách hàng ấn tượng ngay từ bản xem trước nhờ sự thần tốc của AI...", en: "Shorten the feedback process and impress clients right from the preview thanks to the blazing speed of AI..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "XU HƯỚNG", en: "TREND" },
    title: { vi: "Top 10 Xu Hướng Thiết Kế Nội Thất 2026 Được Gợi Ý Bởi AI", en: "Top 10 Interior Design Trends of 2026 Suggested by AI" },
    excerpt: { vi: "AI đang dự đoán gì về màu sắc, chất liệu và phong cách không gian sống trong năm tới?...", en: "What is AI predicting about colors, materials, and living space styles in the coming year?..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600585154526-990dced4ea0d?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "QUAN ĐIỂM", en: "OPINION" },
    title: { vi: "Giải Phóng Sự Sáng Tạo: Khi AI Giúp Kiến Trúc Sư Vượt Qua Lối Mòn", en: "Unleashing Creativity: When AI Helps Architects Break Out of Ruts" },
    excerpt: { vi: "Đôi khi bạn cạn kiệt ý tưởng, đó là lúc AI đóng vai trò như một người cộng sự brainstorming hoàn hảo...", en: "Sometimes you run out of ideas, that's when AI acts as the perfect brainstorming partner..." },
  },
  {
    image: "https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "TÍNH NĂNG", en: "FEATURE" },
    title: { vi: "Ứng Dụng AI Sinh Động Hóa Không Gian Biệt Thự Nghỉ Dưỡng", en: "Applied AI to Enliven Resort Villa Spaces" },
    excerpt: { vi: "AI không chỉ dừng ở ảnh tĩnh, mà có thể biến concept thiết kế của bạn thành những đoạn video ngắn đầy nghệ thuật...", en: "AI doesn't stop at static images, it can turn your design concepts into artistic short videos..." },
  },
  {
    image: "https://images.unsplash.com/photo-1542361345-89e58247f2d5?auto=format&fit=crop&w=800&q=80",
    tag: { vi: "BÁO CÁO", en: "REPORT" },
    title: { vi: "Báo Cáo Chuyên Sâu Của F9Rendering: AI Giúp Tăng Doanh Số Design Tới 40%", en: "F9Rendering In-depth Report: AI Helps Increase Design Sales Up to 40%" },
    excerpt: { vi: "Trải nghiệm thực tế về cách tăng năng suất nhờ công nghệ kết xuất trí tuệ nhân tạo...", en: "Practical experience on how to increase productivity thanks to artificial intelligence rendering technology..." },
  }
];

function BlogPage({ setActivePage }: { setActivePage: (p: string) => void }) {
  const { lang } = useLanguage();
  const landingData = useLandingData();
  const currentLang = lang as 'vi' | 'en';
  const [visiblePosts, setVisiblePosts] = useState(10);

  // Use API posts if available, else fall back to hardcoded
  const posts = (landingData?.blogPosts?.length ? landingData.blogPosts : blogPosts).map((p: any) => ({
    image:   p.imageUrl   ?? p.image,
    tag:     p.tagVi      ? { vi: p.tagVi, en: p.tagEn } : p.tag,
    tagLogo: p.tagLogo    ?? false,
    title:   p.titleVi    ? { vi: p.titleVi, en: p.titleEn } : p.title,
    excerpt: p.excerptVi  ? { vi: p.excerptVi, en: p.excerptEn } : p.excerpt,
  }));

  return (
    <div className="pt-16 min-h-screen bg-[#070a13]">
      {/* Blog Hero section */}
      <section className="relative w-full h-[60vh] max-h-[600px] flex items-center justify-center pt-16 pb-12 overflow-hidden mx-auto max-w-[1600px]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1600&q=80" 
            alt="Blog Hero" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070a13] via-[#070a13]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-transparent to-transparent"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1200px] flex h-full items-center">
          <div className="max-w-lg mb-20 md:mb-0">
            <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6">Blog</h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed max-w-sm">
              {currentLang === 'vi' ? 'Cập nhật thông tin và kiến thức mới nhất về ngành diễn họa kiến trúc cùng F9 Rendering.' : 'Update the latest info and knowledge about architectural visualization with F9 Rendering.'}
            </p>
            <button className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded flex items-center gap-2 transition-colors uppercase text-sm">
              {currentLang === 'vi' ? 'ĐĂNG KÝ' : 'SUBSCRIBE'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-12 px-4 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
          {posts.slice(0, visiblePosts).map((post, idx) => (
            <div 
              key={idx} 
              onClick={() => {
                window.scrollTo(0, 0);
                setActivePage('blog_post');
              }} 
              className="group cursor-pointer flex flex-col h-full"
            >
              <div className="relative rounded-lg overflow-hidden mb-5 aspect-[16/9]">
                <img 
                  src={post.image} 
                  alt={post.title[currentLang]} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                
                {/* Overlay Badge */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-6 text-center lg:text-left w-11/12 lg:w-auto flex flex-col items-center lg:items-start">
                  {post.tagLogo && (
                    <div className="mb-2">
                       <Award size={36} className="text-white mx-auto lg:mx-0 opacity-80" />
                    </div>
                  )}
                  <div className="inline-block relative">
                    <div className="bg-black/90 text-orange-400 font-bold px-4 py-1.5 text-[11px] lg:text-xs tracking-wider border-l-4 border-orange-500 skew-x-[-10deg]">
                      <span className="skew-x-[10deg] block uppercase whitespace-nowrap">{post.tag[currentLang]}</span>
                    </div>
                  </div>
                  {post.tagLogo && <h3 className="text-lg lg:text-xl font-bold text-white mt-3 lg:w-4/5 leading-tight">{post.title[currentLang]}</h3>}
                  {!post.tagLogo && <h3 className="text-lg lg:text-xl font-bold text-white mt-3 lg:w-4/5 leading-tight">{post.title[currentLang].split(']')[1] ? post.title[currentLang].split(']')[1].trim() : post.title[currentLang]}</h3>}
                </div>
              </div>
              <h3 className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors leading-tight">
                {post.title[currentLang]}
              </h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {post.excerpt[currentLang]}
              </p>
              <div className="mt-auto">
                <span className="text-white font-bold text-sm flex items-center gap-1 group-hover:text-orange-400 transition-colors">
                  {currentLang === 'vi' ? 'Xem thêm' : 'Read more'} <ArrowRight size={16} />
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {visiblePosts < posts.length && (
          <div className="mt-16 flex justify-center">
            <button 
              onClick={() => setVisiblePosts(prev => prev + 10)}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded flex items-center gap-2 transition-colors uppercase text-sm"
            >
              {currentLang === 'vi' ? 'TẢI THÊM' : 'LOAD MORE'} <ArrowRight size={16} className="rotate-90" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#070a13] text-[#a1b0cc]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        <h1 className="text-3xl md:text-5xl font-bold text-white text-center mb-12">Điều Khoản Sử Dụng</h1>
        <div className="prose prose-invert max-w-none text-gray-300">
           
           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">1. Giới thiệu chung về F9 Rendering</h2>
           <p className="mb-4 leading-relaxed">
             Chào mừng bạn đến với <strong>F9 Rendering</strong>. Chúng tôi là nền tảng Render AI tiên phong tại Việt Nam, mang đến bộ giải pháp chuyên nghiệp để kết xuất hình ảnh kiến trúc, nội thất và quy hoạch đô thị. Bằng việc áp dụng các mô hình học máy (Machine Learning) và trí tuệ nhân tạo (AI) tiên tiến nhất, F9 Rendering giúp các kiến trúc sư, nhà thiết kế và studio tăng tốc quy trình làm việc từ phác thảo ý tưởng đến hình ảnh photorealistic chỉ trong vài giây.
           </p>
           <p className="mb-6 leading-relaxed">
             Khi bạn truy cập, đăng ký tài khoản và sử dụng các dịch vụ (bao gồm trình tạo ảnh AI, thư viện prompt, công cụ hỗ trợ chỉnh sửa) tại ứng dụng web của chúng tôi, bạn đồng ý tuân thủ và chịu ràng buộc bởi các Điều Khoản Sử Dụng dưới đây. Vui lòng đọc kỹ trước khi bắt đầu hành trình sáng tạo của bạn cùng F9 Rendering.
           </p>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">2. Quyền Sở hữu trí tuệ</h2>
           <p className="mb-4 leading-relaxed">
             <strong>2.1 Quyền đối với nền tảng:</strong> Toàn bộ mã nguồn, thiết kế giao diện, logo (bao gồm thương hiệu "F9 Rendering"), tài liệu hướng dẫn và các thuật toán AI tạo ảnh thuộc sở hữu độc quyền của đội ngũ F9render.com và được bảo hộ bởi luật sở hữu trí tuệ.
           </p>
           <p className="mb-6 leading-relaxed">
             <strong>2.2 Quyền đối với sản phẩm tạo ra (Output):</strong> Các hình ảnh kiến trúc, nội thất được tạo ra bởi bạn thông qua công cụ của F9 Rendering thuộc quyền sở hữu của bạn, ngoại trừ các trường hợp bạn sử dụng ảnh gốc có bản quyền của bên thứ ba mà chưa có sự cho phép. F9 Rendering được cấp quyền (có thể thu hồi) để sử dụng các hình ảnh được chia sẻ công khai nhằm mục đích quảng bá tính năng của nền tảng tại mục <em>Bộ Sưu Tập (Collection)</em>.
           </p>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">3. Sử dụng Nền tảng AI F9 Rendering</h2>
           <p className="mb-4 leading-relaxed">
             <strong>3.1 Mục đích sử dụng:</strong> Nền tảng được thiết kế chuyên biệt cho diễn họa viên, kiến trúc sư, sinh viên kiến trúc và chuyên gia bất động sản. Bạn có thể sử dụng F9 Rendering để:
           </p>
           <ul className="list-disc pl-5 space-y-2 mb-6">
             <li>Render từ bản vẽ phác thảo (Sketch-to-Image) hoặc mô hình 3D thô.</li>
             <li>Biến đổi phong cách thiết kế nội/ngoại thất bằng câu lệnh (Prompt-to-Image).</li>
             <li>Nội suy, thêm chi tiết vật liệu, môi trường và ánh sáng chân thực.</li>
           </ul>

           <p className="mb-4 leading-relaxed">
             <strong>3.2 Hành vi bị cấm:</strong>
           </p>
           <ul className="list-disc pl-5 space-y-2 mb-6">
             <li>Sử dụng nền tảng để tạo ra các hình ảnh vi phạm pháp luật, đồi trụy hoặc bạo lực.</li>
             <li>Tiến hành dịch ngược (reverse-engineer) hệ thống xử lý của F9 Rendering.</li>
             <li>Chia sẻ tài khoản (ngoại trừ các gói Doanh nghiệp có hỗ trợ cấp quyền nhiều thành viên).</li>
             <li>Lạm dụng tài nguyên hệ thống (như dùng tool tự động tạo hàng loạt truy vấn) gây gián đoạn dịch vụ.</li>
           </ul>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">4. Gói tín dụng (Credits) và Thanh toán</h2>
           <p className="mb-4 leading-relaxed">
             <strong>4.1 Cơ chế Credit:</strong> F9 Rendering hoạt động theo cơ chế trừ điểm (Credits) cho mỗi lượt tạo ảnh, upscale hoặc chỉnh sửa chuyên sâu. Các tính năng đòi hỏi sức mạnh điện toán và model AI lớn (VD: Render Siêu Thực 4K) sẽ tiêu tốn nhiều Credit hơn các tính năng cơ bản.
           </p>
           <p className="mb-6 leading-relaxed">
             <strong>4.2 Thanh toán và Hoàn tiền:</strong> Bạn có thể nạp Credit hoặc mua các gói trả phí tháng/năm. Mọi giao dịch qua thẻ quốc tế hoặc chuyển khoản nội địa được bảo mật 100%. Các khoản phí đã thanh toán sẽ không được hoàn trả (Non-refundable) trừ trường hợp nền tảng gặp sự cố không thể khắc phục vượt quá 48 giờ.
           </p>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">5. Giới hạn Trách nhiệm</h2>
           <p className="mb-6 leading-relaxed">
             Do bản chất của Generative AI, kết quả sinh ra mang tính ngẫu nhiên và có thể không đáp ứng chính xác 100% ý đồ ban đầu ở mọi chi tiết kỹ thuật nhỏ. F9 Rendering cung cấp công cụ "như hiện trạng" (as-is) và không cam kết tính hoàn hảo tuyệt đối của bản vẽ thi công. Bạn vẫn cần sử dụng năng lực chuyên môn để thẩm định tính khả thi của công trình từ bức ảnh kết xuất.
           </p>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">6. Cập nhật và Sửa đổi</h2>
           <p className="mb-6 leading-relaxed">
             F9 Rendering bảo lưu quyền cập nhật, nâng cấp các mô hình AI hoặc thay đổi giá các gói dịch vụ bất kỳ lúc nào để duy trì chất lượng tốt nhất. Chúng tôi cũng có thể sửa đổi Điều khoản này và sẽ thông báo đến email hoặc hiển thị thông báo trên ứng dụng trước khi áp dụng. Việc bạn tiếp tục sử dụng đồng nghĩa với việc chấp nhận các thay đổi.
           </p>

           <p className="italic text-gray-500 mt-12 text-sm text-center">
             Bản cập nhật gần nhất: Tháng 5, 2026.
           </p>

        </div>
      </div>
    </div>
  );
}

function PrivacyPolicyPage() {
  return (
    <div className="pt-24 pb-20 min-h-screen bg-[#070a13] text-[#a1b0cc]">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6">
        <h1 className="text-3xl md:text-5xl font-bold text-white text-center mb-12">Chính Sách Bảo Mật</h1>
        <div className="prose prose-invert max-w-none text-gray-300">
           
           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">1. Mục đích thu thập thông tin cá nhân</h2>
           <p className="mb-4 leading-relaxed">
             F9 Rendering cam kết bảo vệ sự riêng tư và thông tin cá nhân của người dùng. Các thông tin chúng tôi thu thập chủ yếu bằng cách tự nguyện từ phía bạn khi đăng ký tài khoản và sử dụng dịch vụ trên hệ thống Render AI, nhằm các mục đích sau:
           </p>
           <ul className="list-disc pl-5 space-y-2 mb-6">
             <li>Trao đổi về dịch vụ, xử lý thanh toán, và cấp phát Credit cho các gói trả phí.</li>
             <li>Quản lý thông tin tài khoản đăng nhập để lưu trữ các bộ ảnh, prompt, và quá trình render của riêng bạn.</li>
             <li>Nâng cấp hệ thống, cải thiện chất lượng của các mô hình AI hoặc khắc phục các lỗi kỹ thuật trong quá trình thao tác sinh ảnh.</li>
             <li>Gửi các thông báo về bản cập nhật mô hình mới, chương trình khuyến mãi hoặc tin tức đáng chú ý từ F9 Rendering.</li>
           </ul>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">2. Phạm vi sử dụng & Bảo mật Dữ liệu Dịch vụ</h2>
           <p className="mb-4 leading-relaxed">
             <strong>2.1 Dữ liệu Đầu vào (Input Data):</strong> Mọi thiết kế 2D, mô hình 3D thô hay hình ảnh tham khảo mà bạn dùng làm dữ liệu đầu vào cho AI được xem là tài sản bảo mật cao. Hệ thống của chúng tôi truyền tải dữ liệu ở trạng thái mã hóa (SSL/TLS). Các dữ liệu này KHÔNG dùng để chia sẻ, bán, hoặc công khai cho bên thứ ba ngoại trừ yêu cầu từ cơ quan có thẩm quyền và minh bạch theo pháp luật Việt Nam.
           </p>
           <p className="mb-6 leading-relaxed">
             <strong>2.2 Việc đào tạo AI:</strong> Chúng tôi có thể sử dụng (một cách ẩn danh và tổng hợp) các tham số (prompt, thông số settings kỹ thuật) nhằm mục đích cải thiện và đào tạo hệ thống học sâu, để đáp ứng chất lượng cho những phiên bản AI về sau. Hình ảnh thiết kế của bạn hoặc những dữ liệu chứa yếu tố bảo mật của khách hàng sẽ không được sử dụng để tiến hành model training nếu chưa có sự đồng ý của bạn.
           </p>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">3. Thời gian lưu trữ dữ liệu</h2>
           <p className="mb-6 leading-relaxed">
             Thông tin cá nhân, định danh, và các ảnh kết xuất (Output) của bạn sẽ được lưu trữ tự động trên nền tảng đám mây an toàn của chúng tôi, cho đến khi có yêu cầu xóa tài khoản từ phía khách hàng. Nếu tài khoản của bạn không được truy cập quá 2 năm hoặc quá thời hạn duy trì Credit, F9 Rendering có quyền thu hồi và xóa dữ liệu dự phòng.
           </p>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">4. Quyền của khách hàng đối với Dữ liệu</h2>
           <p className="mb-6 leading-relaxed">
             Là công cụ hướng tới Kiến trúc sư và những nhà thiết kế cần sự bảo mật đồ án, F9 Rendering tôn trọng quyền chủ động về dữ liệu cá nhân của người dùng. Bạn có quyền được cung cấp, xem xét bản tóm tắt hồ sơ thông tin hệ thống, thay đổi hay yêu cầu tiêu hủy đối với các thông tin đã cung cấp. Vui lòng liên hệ với bộ phận CSKH để được trợ giúp.
           </p>

           <h2 className="text-[#F58F00] font-bold text-2xl mt-10 mb-4">5. Thay đổi Chính sách bảo mật</h2>
           <p className="mb-6 leading-relaxed">
             Chính sách này có thể thay đổi và thích ứng để phản ánh các công nghệ bảo mật mới nhất cũng như quy định của pháp luật. Nếu có chỉnh sửa ảnh hưởng đáng kể đến tài khoản cá nhân, F9 Rendering sẽ gửi trực tiếp thông báo cảnh báo qua email của bạn.
           </p>
           
           <p className="italic text-gray-500 mt-12 text-sm text-center">
             Bản cập nhật gần nhất: Tháng 5, 2026.
           </p>

        </div>
      </div>
    </div>
  );
}

function BlogPostPage({ setActivePage }: { setActivePage: (p: string) => void }) {
  const { lang, t } = useLanguage();
  const currentLang = lang as 'vi' | 'en';
  const relatedPosts = blogPosts.slice(0, 6);
  const featuredPost = blogPosts[0];

  return (
    <div className="pt-24 pb-10 min-h-screen bg-[#070a13] text-[#a1b0cc]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-8 leading-tight">
          {featuredPost.title[currentLang]}
        </h1>

        <div className="mb-10 rounded-xl overflow-hidden aspect-[16/9] relative">
          <img 
            src={featuredPost.image} 
            alt="Cover" 
            className="w-full h-full object-cover" 
          />
          {/* Tag on image */}
          <div className="absolute top-6 left-6 flex flex-col items-start">
            <div className="mb-3">
              <Sparkles size={36} className="text-white opacity-80" />
            </div>
            <div className="inline-block relative">
              <div className="bg-black/90 text-[#F58F00] font-bold px-4 py-1.5 text-xs tracking-wider border-l-4 border-[#F58F00] skew-x-[-10deg]">
                <span className="skew-x-[10deg] block uppercase whitespace-nowrap">{featuredPost.tag[currentLang]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <button 
            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
            className="flex items-center gap-2 bg-[#F58F00] hover:bg-[#d97c00] text-white px-6 py-2.5 rounded font-bold text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14.6 22V12h3.3l.5-3.8h-3.8V5.7c0-1.1.3-1.8 1.9-1.8h2V.5C18.2.5 16.9 0 15.5 0c-2.9 0-4.9 1.8-4.9 5.1v3.1h-3.3v3.8h3.3V22h4z"/></svg>
            Facebook
          </button>
          <button 
            onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(featuredPost.title['en'])}`, '_blank')}
            className="flex items-center gap-2 bg-[#F58F00] hover:bg-[#d97c00] text-white px-6 py-2.5 rounded font-bold text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 3h3.5l4.8 6.5L20 3h3l-6.8 8.1L24 21h-5l-5.6-7.5L8 21H5l7.5-9L6 3zm4 16h1.5L18 5h-1.5L10 19z"/></svg>
            Twitter
          </button>
          <button 
            onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
            className="flex items-center gap-2 bg-[#F58F00] hover:bg-[#d97c00] text-white px-6 py-2.5 rounded font-bold text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5.5 22h-4V7.5h4V22zM3.5 5.5c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zM22.5 22h-4v-7.3c0-1.7-.6-2.9-2.2-2.9-1.2 0-1.9.8-2.2 1.6-.1.3-.1.6-.1.9V22h-4V7.5h4v2c.5-1 1.8-2.5 4.5-2.5 3.3 0 5.7 2.1 5.7 6.7V22z"/></svg>
            LinkedIn
          </button>
          <button 
            onClick={() => window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(window.location.href)}&media=${encodeURIComponent(featuredPost.image)}&description=${encodeURIComponent(featuredPost.title['en'])}`, '_blank')}
            className="flex items-center gap-2 bg-[#F58F00] hover:bg-[#d97c00] text-white px-6 py-2.5 rounded font-bold text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.4 23.2c-.1-1-.2-2.7 0-3.8.3-1.2 1.9-8.1 1.9-8.1s-.5-1-.5-2.4c0-2.3 1.3-4 3-4 1.4 0 2 1.1 2 2.4 0 1.4-1 3.5-1.5 5.5-.4 1.6.8 2.9 2.4 2.9 2.8 0 5-3 5-7.3 0-3.8-2.8-6.5-6.7-6.5-4.5 0-7.2 3.4-7.2 6.9 0 1.4.5 2.9 1.2 3.7.1.2.2.3.1.5-.1.5-.3 1.4-.4 1.6-.1.3-.3.4-.6.2-2.2-1-3.6-4.3-3.6-6.9 0-5.6 4.1-10.8 11.8-10.8 6.2 0 11 4.4 11 10.3 0 6.2-3.9 11.2-9.3 11.2-1.8 0-3.5-1-4.1-2.1 0 0-1 3.8-1.2 4.7-.4 1.7-1.6 3.8-2.4 5.1A12 12 0 1 0 12 0z"/></svg>
            Pinterest
          </button>
          <button 
            onClick={() => window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(featuredPost.title['en'])}`, '_blank')}
            className="flex items-center gap-2 bg-[#F58F00] hover:bg-[#d97c00] text-white px-6 py-2.5 rounded font-bold text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 11.5c0-1.6-1.3-2.9-2.9-2.9-1 0-1.9.5-2.4 1.3-1.6-1.1-3.6-1.8-5.9-1.9l1-4.7 3.2.7c0 1.2.9 2.1 2.1 2.1 1.2 0 2.1-.9 2.1-2.1S20.3 2 19.1 2c-1 0-1.8.6-2 1.4l-3.5-.8c-.2 0-.4.1-.5.3l-1.1 5.3c-2.3.1-4.4.8-6 1.9-.5-.8-1.4-1.3-2.4-1.3-1.6 0-2.9 1.3-2.9 2.9 0 1.2.7 2.2 1.7 2.6-.1.3-.1.5-.1.8 0 3.9 4.3 7 9.5 7s9.5-3.1 9.5-7c0-.3 0-.6-.1-.8 1-.4 1.8-1.5 1.8-2.6zM15 17c-1.3.8-2.8 1-3 1s-1.8-.2-3-1c-.2-.1-.2-.5 0-.7.2-.2.5-.2.7 0 .9.6 1.9.7 2.3.7s1.4-.1 2.3-.7c.2-.2.6-.1.7.1.1.2.1.5 0 .7zM9.5 12c.8 0 1.5.7 1.5 1.5S10.3 15 9.5 15 8 14.3 8 13.5 8.7 12 9.5 12zm5 0c.8 0 1.5.7 1.5 1.5S15.3 15 14.5 15 13 14.3 13 13.5 13.7 12 14.5 12z"/></svg>
            Reddit
          </button>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none text-gray-200">
           <p className="mb-6 leading-relaxed text-lg">
             Trí tuệ nhân tạo đang tạo ra những thay đổi chưa từng có trong quá trình thiết kế, khiến việc tạo ra các hình ảnh render kiến trúc phức tạp trở nên dễ dàng và nhanh chóng hơn bao giờ hết. Cùng điểm qua một số lợi ích vượt trội:
           </p>

           <h3 className="text-[#F58F00] font-bold text-xl md:text-2xl mt-12 mb-4">1. Rút Ngắn Thời Gian Tối Đa</h3>
           <p className="mb-4 leading-relaxed text-[17px]">
             Nếu trước đây, một bản thiết kế hoặc hình ảnh render kiến trúc phải tốn nhiều ngày (từ dựng hình đến setup ánh sáng, vật liệu), thì nay với các mô hình AI Diffusion, thời gian này được rút xuống còn vài phút. Mọi quy trình đều trở nên mượt mà.
           </p>
           <p className="mb-2 leading-relaxed text-white font-medium text-[17px]">– Điểm nổi bật:</p>
           <ul className="list-none pl-0 space-y-2 mb-4 text-[17px]">
              <li>+ Tự động nội suy các chi tiết vật liệu siêu thực như độ bóng, bump map từ ảnh tham khảo.</li>
              <li>+ Đánh sáng environment lighting bằng câu lệnh tự do thay vì setup setting thủ công.</li>
              <li>+ Phân tích không gian nội thất, tự động mix-match đồ đạc theo các phong cách như Scandinavian, Bauhaus, v.v.</li>
           </ul>

           <h3 className="text-[#F58F00] font-bold text-xl md:text-2xl mt-12 mb-4">2. Tự Do Khám Phá Ý Tưởng (Brainstorming)</h3>
           <p className="mb-4 leading-relaxed text-[17px]">
             Khách hàng thường mất nhiều thời gian để hình dung không gian của mình. AI render giúp vượt qua rào cản này bằng cách cung cấp cho kiến trúc sư khả năng biến ý tưởng trừu tượng thành thiết kế cụ thể.
           </p>
           <p className="mb-2 leading-relaxed text-white font-medium text-[17px]">– Khả năng của AI:</p>
           <ul className="list-none pl-0 space-y-2 mb-4 text-[17px]">
              <li>+ Biến những bản vẽ sơ bộ (sketch tay, sketch layout 2D) thành một bức ảnh đẹp mắt.</li>
              <li>+ Tạo ra vô vàn option thay thế màu sắc, chất liệu chỉ bằng cách mask vùng chọn.</li>
              <li>+ Gợi ý các phương án concept táo bạo mà kiến trúc sư có thể mất nhiều giờ mới nghĩ ra.</li>
           </ul>

           <h3 className="text-[#F58F00] font-bold text-xl md:text-2xl mt-12 mb-4">3. Chất Lượng Render Khó Phân Biệt</h3>
           <p className="mb-4 leading-relaxed text-[17px]">
             Đã qua rồi thời kì những hình ảnh AI trông "dại dại" hoặc có lỗi mờ chi tiết. Giờ đây, các công nghệ như ControlNet và Midjourney v6 đã có khả năng khống chế phối cảnh chuẩn xác đến từng mili.
           </p>
           <p className="mb-2 leading-relaxed text-white font-medium text-[17px]">– Tính năng hiện đại:</p>
           <ul className="list-none pl-0 space-y-2 mb-10 text-[17px]">
              <li>+ Khả năng tôn trọng góc camera ban đầu từ file 3D hoặc khối mô hình đơn giản.</li>
              <li>+ Độ chi tiết sắc nét của vật liệu: hắt sáng của bề mặt kính, màng da, hay độ nhám bề mặt rỉ sét.</li>
              <li>+ Giả lập được các cảm xúc, khí hậu thời tiết phức tạp hoặc render ánh sáng chạng vạng thực tế.</li>
           </ul>

           <div className="mb-10 rounded-xl overflow-hidden">
             <img src="https://images.unsplash.com/photo-1600607687931-cebf574fd842?auto=format&fit=crop&w=1200&q=80" alt="Working with AI" className="w-full h-auto" />
           </div>
        </div>
      </div>
      
      {/* Related Posts */}
      <div className="mt-8 pt-8 pb-0">
        <h2 className="text-2xl italic font-bold text-white text-center mb-8">Xem thêm:</h2>
        
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((post, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  window.scrollTo(0, 0);
                  setActivePage('blog_post');
                }} 
                className="group cursor-pointer flex flex-col h-full bg-[#0b1120] rounded-xl overflow-hidden border border-[#1a2235] hover:border-orange-500/50 transition-colors"
              >
                <div className="relative overflow-hidden aspect-[16/9]">
                  <img 
                    src={post.image} 
                    alt={post.title[currentLang]} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                  
                  {/* Overlay Badge */}
                  <div className="absolute bottom-4 left-4">
                    <div className="inline-block relative">
                      <div className="bg-black/90 text-[#F58F00] font-bold px-3 py-1.5 text-[10.5px] tracking-wider border-l-4 border-[#F58F00] skew-x-[-10deg]">
                        <span className="skew-x-[10deg] block uppercase whitespace-nowrap">{post.tag[currentLang]}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-[17px] font-bold text-white mb-3 group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                    {post.title[currentLang]}
                  </h3>
                  <div className="mt-auto">
                    <span className="text-white font-bold text-[13px] flex items-center gap-1.5 group-hover:text-[#F58F00] transition-colors">
                      Xem thêm <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activePage, setActivePage] = useState<string>('home');

  return (
    <LandingDataProvider>
    <LanguageProvider>
      <div className="min-h-screen bg-[#0f1524] font-sans selection:bg-orange-500/30 relative">
        <ScrollToTop />
        <Navbar activePage={activePage} setActivePage={setActivePage} />
        <main>
          {activePage === 'home' ? (
            <>
              <Hero />
              <HeroSlider />
              <Stats />
              <HowItWorks />
              <ShowcaseTabs />
              <AdvancedFeaturesBento />
              <FeaturesGrid />
              <Collection />
              <PricingTable />
              <CreditPackages />
              <BottomCTA />
              <GooglePackages />
              <SupportSection />
            </>
          ) : activePage === 'blog' ? (
            <BlogPage setActivePage={setActivePage} />
          ) : activePage === 'blog_post' ? (
            <BlogPostPage setActivePage={setActivePage} />
          ) : activePage === 'terms' ? (
            <TermsPage />
          ) : activePage === 'privacy' ? (
            <PrivacyPolicyPage />
          ) : null}
        </main>
        <Footer setActivePage={setActivePage} />
      </div>
    </LanguageProvider>
    </LandingDataProvider>
  );
}
