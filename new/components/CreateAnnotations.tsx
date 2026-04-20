import React, { useState, useRef } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import CustomSelect from './CustomSelect';
import { useLanguage } from '../hooks/useLanguage';

interface CreateAnnotationsProps {
  onBack: () => void;
}

const CreateAnnotations: React.FC<CreateAnnotationsProps> = ({ onBack }) => {
  const { locale } = useLanguage();
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const annotationTemplates = [
    locale === 'vi' ? "Chú thích vật liệu mặt đứng" : "Elevation Material Callouts",
    locale === 'vi' ? "Chú thích cấu tạo kỹ thuật" : "Technical Detail Annotations",
    locale === 'vi' ? "Ghi chú hoàn thiện nội thất" : "Interior Finish Notes",
    locale === 'vi' ? "Ký hiệu sơ đồ chức năng" : "Functional Diagram Symbols"
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setInputImage({ url, file });
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputImage) URL.revokeObjectURL(inputImage.url);
    setInputImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)] bg-[#202633]">
      {/* Sidebar */}
      <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 group"
        >
          <div className="p-1 rounded-full group-hover:bg-slate-700">
            <ChevronLeftIcon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">Home</span>
        </button>

        {/* 1. Ảnh đầu vào */}
        <div className="space-y-3">
          <h2 className="font-bold text-white text-base">1. Ảnh đầu vào</h2>
          <div 
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-orange-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {inputImage ? (
              <>
                <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md" />
                <button 
                  onClick={clearImage} 
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <PhotoIcon className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Tải ảnh công trình / nhân vật</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>

        {/* 2. Mẫu Chú thích */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-white text-base">2. Mẫu Chú thích</h2>
            <span className="text-red-500 text-[10px] font-bold uppercase">* BẮT BUỘC</span>
          </div>
          <CustomSelect 
            options={annotationTemplates} 
            value={selectedTemplate} 
            onChange={setSelectedTemplate} 
            placeholder="Chọn 1 mẫu có sẵn" 
          />
        </div>

        {/* 3. Mô tả (Input Prompt) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-white text-base">3. Mô tả (Input Prompt)</h2>
            <span className="text-orange-500 text-[10px] font-bold uppercase">** CHÚ Ý ĐỌC KĨ MÔ TẢ</span>
          </div>
          <textarea 
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-[#364053] border border-gray-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500 resize-none"
            placeholder="Mô tả thêm các yêu cầu cụ thể của bạn..."
          />
        </div>

        {/* Action Button */}
        <div className="mt-auto pt-4">
          <button 
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-lg transition-all shadow-lg uppercase tracking-widest text-sm flex items-center justify-center gap-2"
          >
            TẠO ẢNH NGAY
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col bg-[#202633]">
        <div className="flex border-b border-gray-700 px-6 pt-2 gap-8 flex-shrink-0 bg-[#282f3d]">
          <button 
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Kết quả
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Lịch sử
          </button>
        </div>

        <div className="flex-grow p-6 flex flex-col items-center justify-center relative overflow-y-auto custom-scrollbar">
          <div className="text-center text-gray-600 flex flex-col items-center gap-4 opacity-40">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <SparklesIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Chưa có kết quả</p>
              <p className="text-[11px] max-w-xs leading-relaxed">
                Tải ảnh công trình và nhấn "Bắt đầu cải thiện" để AI nâng cấp chất lượng ảnh của bạn.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateAnnotations;