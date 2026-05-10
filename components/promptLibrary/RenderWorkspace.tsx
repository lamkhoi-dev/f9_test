import React from 'react';

interface RenderWorkspaceProps {
  onBack: () => void;
  title?: string;
}

const RenderWorkspace: React.FC<RenderWorkspaceProps> = ({ onBack, title }) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full min-h-[80vh] text-left">
      {/* Left Column: Controls */}
      <div className="w-full lg:w-[380px] xl:w-[400px] flex flex-col gap-5 shrink-0">
        
        {/* 1. Ảnh đầu vào */}
        <div className="flex flex-col gap-2">
          <h3 className="text-white font-bold text-sm">1. Ảnh đầu vào</h3>
          <div className="border border-dashed border-[#4b5563] rounded-lg h-32 flex flex-col items-center justify-center bg-[#151921] cursor-pointer hover:bg-[#1e232d] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-400 text-sm">Tải ảnh của bạn</span>
          </div>
          <button className="w-full bg-[#374151] hover:bg-[#4b5563] text-white py-2.5 rounded-md text-sm font-medium transition-colors">
            Tải ảnh của bạn
          </button>
          
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-300">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="style" className="accent-[#f97316]" defaultChecked />
              <span>Ảnh mặc định</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="style" className="accent-[#f97316]" />
              <span>Ảnh phong cách 1</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="style" className="accent-[#f97316]" />
              <span>Ảnh phong cách 2</span>
            </label>
          </div>
          <p className="text-[10px] text-[#f97316] italic">
            * Chú ý: Nên chuyển đổi các Phong cách ảnh đầu vào để AI nhận diện 1 cách tốt nhất
          </p>
        </div>

        {/* Vật liệu ứng dụng */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">
              Vật liệu ứng dụng <span className="text-red-500 font-normal">* Bắt buộc</span>
            </h3>
            <span className="text-[#f97316] text-xs cursor-pointer hover:underline font-medium">Gợi ý sử dụng</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#151921] border border-[#374151] rounded-md p-1.5 flex flex-wrap gap-1.5 min-h-[42px]">
              <div className="bg-[#f97316] text-white text-[11px] px-2 py-1 rounded flex items-center gap-1">
                Công trình sử dụng vật liệu như ảnh tải lên.
                <button className="hover:text-gray-200 ml-1 font-bold">×</button>
              </div>
            </div>
            <button className="bg-[#374151] hover:bg-[#4b5563] text-white px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              AI Gợi ý
            </button>
          </div>
        </div>

        {/* 4. Mô tả (Input Prompt) */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">4. Mô tả (Input Prompt)</h3>
            <span className="text-red-500 text-[10px] italic">** Chú ý đọc kĩ Mô tả</span>
          </div>
          <textarea 
            className="w-full h-36 bg-[#151921] border border-[#374151] rounded-md p-3 text-xs text-gray-300 focus:outline-none focus:border-[#f97316] resize-none leading-relaxed"
            defaultValue="Ảnh thực tế của công trình Kiến trúc nhiệt đới hiện đại, ưu tiên không gian xanh và vật liệu tự nhiên., phong cách Hiện đại - Nhiệt đới.
Bối cảnh tại Tọa lạc trong một khu dân cư đô thị.
Công trình sử dụng vật liệu như ảnh tải lên.
Không gian xung quanh bao gồm Hệ thống cây xanh đa dạng trên các ban công, Hai cây lớn xanh tốt ở hai bên vỉa hè, hài hòa với cảnh quan tự nhiên."
          />
          <button className="w-full bg-[#151921] hover:bg-[#1e232d] text-[#f97316] py-2 rounded-md text-xs font-medium transition-colors border border-[#374151]">
            Tối ưu hóa mô tả trên
          </button>
        </div>

        {/* 6. Tỉ lệ khung hình */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-white font-bold text-sm">6. Tỉ lệ khung hình</h3>
          <div className="relative">
            <select className="w-full bg-[#374151] border border-[#4b5563] rounded-md p-2.5 text-sm text-white appearance-none focus:outline-none focus:border-[#f97316]">
              <option>Tự động</option>
              <option>1:1</option>
              <option>16:9</option>
              <option>9:16</option>
              <option>4:3</option>
              <option>3:4</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Số lượng ảnh kết quả */}
        <div className="flex flex-col gap-2 mt-2">
          <h3 className="text-white font-bold text-sm">Số lượng ảnh kết quả</h3>
          <div className="flex items-center justify-between bg-[#151921] border border-[#374151] rounded-md p-1">
            <button className="w-10 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#374151] rounded transition-colors">-</button>
            <span className="text-white font-bold text-sm">1</span>
            <button className="w-10 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#374151] rounded transition-colors">+</button>
          </div>
        </div>

        {/* Tạo Ảnh ngay */}
        <button className="w-full bg-[#374151] hover:bg-[#4b5563] text-white py-3.5 rounded-md text-sm font-bold transition-colors mt-4 shadow-lg">
          Tạo Ảnh ngay
        </button>

      </div>

      {/* Right Column: Results */}
      <div className="flex-1 flex flex-col bg-[#151921] border border-[#374151] rounded-lg overflow-hidden min-h-[600px]">
        {/* Tabs */}
        <div className="flex border-b border-[#374151] bg-[#1e232d]">
          <button className="px-6 py-3 text-sm font-medium text-white border-b-2 border-[#f97316] bg-[#151921]">
            Kết quả
          </button>
          <button className="px-6 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Lịch sử
          </button>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          {/* Empty state for result */}
        </div>
      </div>
    </div>
  );
};

export default RenderWorkspace;
