
import React from 'react';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { useLanguage } from '../hooks/useLanguage';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const { locale } = useLanguage();

  const strings = {
    vi: {
      title: "F9 Rendering",
      description: "Khai phóng sáng tạo trong kiến trúc & nội thất bằng trí tuệ nhân tạo — nơi mọi ý tưởng được hiện thực hóa thành bản thiết kế sống động, chính xác và đầy cảm hứng.",
      start: "Bắt đầu - Start ",
      tutorial: "Video Hướng dẫn - Tutorials"
    },
    en: {
      title: "F9 Rendering",
      description: "Unleash creativity in architecture & interior design with artificial intelligence — where every idea is realized into vivid, accurate, and inspiring designs.",
      start: "Start Now",
      tutorial: "Video Tutorials"
    }
  };

  const content = strings[locale] || strings.vi;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black font-sans">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('https://cdn.bestme.vn/images/bestme/y-nghia-hoa-dao-ngay-tet-va-cach-cham-soc-ra-hoa-dep-tuoi-lau-1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/85 z-10" />
      <div className="relative z-20 text-center px-4 max-w-4xl mx-auto flex flex-col items-center animate-fade-in">
        <div className="w-32 h-32 bg-white rounded-full mb-8 flex items-center justify-center shadow-2xl overflow-hidden transform hover:scale-105 transition-transform duration-500 p-4">
            <img 
                src="https://shop3dmili.com/wp-content/themes/shop3dmili-ltt/images/brand-22.png" 
                alt="3DMili Logo" 
                className="w-full h-full object-contain"
            />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl font-architecture">
          {content.title}
        </h1>
        <p className="text-gray-300 text-lg md:text-xl mb-12 max-w-2xl leading-relaxed font-light text-center opacity-90">
          {content.description}
        </p>
        <div className="flex flex-col items-center gap-4 w-full">
            <button
              onClick={onStart}
              className="group relative bg-red-800 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-lg text-lg md:text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(153,27,27,0.5)] min-w-[200px]"
            >
              <span className="relative z-10">{content.start}</span>
              <div className="absolute inset-0 rounded-lg bg-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-md"></div>
            </button>
            <a
                href="https://www.youtube.com/playlist?list=PLNPj8_jC2osptHJ3QwzG2n6U7qAOvFWVn"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-[#00897b] hover:bg-[#00796b] text-white font-bold py-3 px-8 rounded-lg text-base transition-all duration-300 transform hover:scale-105 shadow-lg border border-teal-500/30 flex items-center justify-center min-w-[180px] gap-2"
            >
                <VideoCameraIcon className="w-5 h-5" />
                {content.tutorial}
            </a>
        </div>
      </div>
      <div className="absolute bottom-6 w-full text-center z-20">
        <p className="text-xs text-gray-600">© 2025 F9 Rendering AI. All rights reserved.</p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
