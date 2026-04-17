import React, { useState, useRef, useMemo } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useLanguage } from '../hooks/useLanguage';
import { SparklesIcon } from './icons/SparklesIcon';
import { RectangleGroupIcon } from './icons/RectangleGroupIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ClockIcon } from './icons/ClockIcon';
import CustomSelect from './CustomSelect';
import { useMode } from '../contexts/ModeContext';
import { apiClient, getImageSizeConfig } from '../lib/api';
import Pagination from './Pagination';

interface ChangeTonemoodProps {
  onBack: () => void;
}

interface HistoryItem {
  id: string;
  inputUrl: string;
  refUrl?: string;
  resultUrl: string;
  preset: string;
  timestamp: number;
}

const ChangeTonemood: React.FC<ChangeTonemoodProps> = ({ onBack }) => {
  const { locale } = useLanguage();
  const { getModelName, isPro, proResolution } = useMode();
  
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [refImage, setRefImage] = useState<{ url: string; file: File } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [prompt, setPrompt] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Pagination for history
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return history.slice(start, start + ITEMS_PER_PAGE);
  }, [history, currentPage]);

  const inputRef = useRef<HTMLInputElement>(null);
  const toneRef = useRef<HTMLInputElement>(null);

  const presets = [
    "Chuyển sang ảnh Buổi sáng sớm,chụp Nắng vàng ấm chiếu xiên từ trái sang phải, tạo tương phản sáng–tối mềm, highlight lên mái ngói và mảng tường trắng; không khí có cảm giác hơi sương/dust particles nhẹ. ",
    "Chuyển sang ảnh chụp Ban ngày (10h sáng),Trời xanh trong, ánh sáng tự nhiên mạnh nhưng dịu; bóng đổ của cây và lam tạo pattern rõ trên tường nhưng mềm vừa, tổng thể sáng – sạch – yên bình.",
    "Chuyển sang ảnh chụp Hoàng hôn,Ánh sáng vàng cam, bầu trời glow nhẹ; đèn nội thất ấm bật sáng xuyên qua kính, đèn hắt sân vườn và tường đá tạo điểm nhấn, tương phản ấm–lạnh, cinematic.",
    "Chuyển sang ảnh chụp Ngày u ám / Mưa (Overcast / Rainy)",
    "Chuyển sang ảnh chụp Ban đêm lung linh (Night City Lights)",
    "Chuyển đổi khung cảnh from ban ngày sang ban đêm, tạo nên bầu không khí ấm áp và dễ chịu. Bật toàn bộ hệ thống chiếu sáng nhân tạo và bổ sung hệ đèn LED hắt nhẹ dưới tủ, kệ hoặc các chi tiết kiến trúc. Tăng cường độ phát sáng của đèn và hệ chiếu sáng gián tiếp để tạo hiệu ứng ánh sáng mềm mại, thân thiện và cuốn hút.",
    "Chuyển sang ảnh chụp chập tối (hoàng hôn muộn) vào một ngày nhiều mây, trong khoảng thời gian Mùa Xuân hoặc Hè với không khí tĩnh lặng và êm đềm."
  ];

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'input' | 'tone') => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'input') setInputImage({ url, file });
      else setRefImage({ url, file });
      setResultImage(null);
    }
  };

  const clearImage = (type: 'input' | 'tone') => {
    if (type === 'input') {
      if (inputImage) URL.revokeObjectURL(inputImage.url);
      setInputImage(null);
    } else {
      if (refImage) URL.revokeObjectURL(refImage.url);
      setRefImage(null);
    }
    setResultImage(null);
  };

  const handleGenerate = async () => {
    if (!inputImage) {
      alert(locale === 'vi' ? "Vui lòng tải ảnh công trình đầu vào." : "Please upload an input architecture image.");
      return;
    }

    setIsGenerating(true);
    setResultImage(null);
    setActiveTab('results');

    try {

      const inputBase64 = await blobToBase64(inputImage.file);
      
      let systemInstruction = "";
      const parts: any[] = [];

      parts.push({ text: "ẢNH ĐẦU VÀO (Ảnh Gốc):" });
      parts.push({ inlineData: { data: inputBase64, mimeType: inputImage.file.type } });

      if (refImage) {
        const refBase64 = await blobToBase64(refImage.file);
        parts.push({ text: "ẢNH THAM CHIẾU MOOD & ÁNH SÁNG:" });
        parts.push({ inlineData: { data: refBase64, mimeType: refImage.file.type } });

        systemInstruction = `Bạn là chuyên gia hậu kỳ ánh sáng và màu sắc kiến trúc.
NHIỆM VỤ: Phân tích tông màu (tonemood), hướng sáng, độ tương phản và không khí tổng thể từ [ẢNH THAM CHIẾU] để áp dụng lên [ẢNH ĐẦU VÀO].

YÊU CẦU BẮT BUỘC:
1. GIỮ NGUYÊN 100% hình khối kiến trúc, vị trí cửa, tường, tỷ lệ và bố cục của [ẢNH ĐẦU VÀO]. Tuyệt đối không thay đổi hình dạng tòa nhà.
2. Áp dụng chính xác đặc tính ánh sáng (màu nắng, bóng đổ, HDR) và tâm trạng màu sắc (color grading) từ [ẢNH THAM CHIẾU] vào công trình của [ẢNH ĐẦU VÀO].
3. Đồng bộ hóa bối cảnh bầu trời và môi trường xung quanh của [ẢNH ĐẦU VÀO] cho khớp với mood tham chiếu.
4. Kết quả phải là ảnh chụp thực tế (photorealistic), chất lượng 8K, sắc nét.
${prompt ? `Yêu cầu thêm từ người dùng: ${prompt}` : ''}`;
      } else {
        systemInstruction = `Bạn là chuyên gia ánh sáng kiến trúc. Thay đổi bối cảnh ánh sáng và màu sắc của công trình trong ảnh theo phong cách: "${selectedPreset || 'Realistic'}".
YÊU CẦU: Giữ nguyên 100% kiến trúc gốc. Chỉ thay đổi ánh sáng, bầu trời, bóng đổ và màu sắc phim. Sắc nét cao, chân thực.
${prompt ? `Yêu cầu thêm: ${prompt}` : ''}`;
      }

      parts.push({ text: systemInstruction });

      const response = await apiClient.generateContent({
        model: getModelName('image'),
        contents: { parts },
        config: { 
          responseModalities: ['IMAGE'],
          ...getImageSizeConfig(isPro, proResolution)
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart && imagePart.inlineData) {
        const resUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        setResultImage(resUrl);
        setHistory(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          inputUrl: inputImage.url,
          refUrl: refImage?.url,
          resultUrl: resUrl,
          preset: refImage ? "Đồng bộ ảnh tham chiếu" : selectedPreset,
          timestamp: Date.now()
        }, ...prev]);
        setCurrentPage(1);
      } else {
        throw new Error("No image data returned from AI.");
      }

    } catch (error: any) {
      console.error("Tonemood Error:", error);
      alert(locale === 'vi' ? "Đã xảy ra lỗi khi xử lý. Vui lòng thử lại." : "An error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <img src={zoomedImage} alt="Zoomed" className="max-h-[90vh] object-contain rounded shadow-2xl" />
            <div className="absolute top-4 right-4 flex gap-3">
               <a href={zoomedImage} download={`F9-Tonemood-${Date.now()}.png`} className="p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all">
                  <ArrowDownTrayIcon className="w-6 h-6" />
                </a>
                <button onClick={() => setZoomedImage(null)} className="p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-all">
                  <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)] bg-[#282f3d]">
        {/* Sidebar */}
        <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 group"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Quay lại Kho tiện ích</span>
          </button>

          {/* 1. Ảnh đầu vào */}
          <div className="space-y-3">
            <h2 className="font-bold text-white text-base">Ảnh đầu vào</h2>
            <div 
              className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-orange-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
              onClick={() => inputRef.current?.click()}
            >
              {inputImage ? (
                <>
                  <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md shadow-lg" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearImage('input'); }} 
                    className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <PhotoIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Tải ảnh công trình</p>
                </div>
              )}
            </div>
            <input type="file" ref={inputRef} onChange={(e) => handleImageUpload(e, 'input')} className="hidden" accept="image/*" />
            <button onClick={() => inputRef.current?.click()} className="w-full bg-[#364053] hover:bg-[#475266] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm uppercase">Tải ảnh của bạn</button>
          </div>

          {/* 2. Ảnh tham chiếu */}
          <div className="space-y-3">
            <h2 className="font-bold text-white text-base">Ảnh tham chiếu Tonemood và Ánh sáng</h2>
            <div 
              className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-orange-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
              onClick={() => toneRef.current?.click()}
            >
              {refImage ? (
                <>
                  <img src={refImage.url} alt="Tone Ref" className="max-h-full max-w-full object-contain rounded-md shadow-lg" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearImage('tone'); }} 
                    className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <PhotoIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Tải ảnh mẫu Tonemood / Ánh sáng</p>
                </div>
              )}
            </div>
            <input type="file" ref={toneRef} onChange={(e) => handleImageUpload(e, 'tone')} className="hidden" accept="image/*" />
            <button onClick={() => toneRef.current?.click()} className="w-full bg-[#364053] hover:bg-[#475266] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm uppercase">TẢI ẢNH THAM CHIẾU</button>
          </div>

          {/* 3. Preset Templates - Locked if Ref Image exists */}
          <div className={`space-y-2 transition-opacity duration-300 ${refImage ? 'opacity-40 pointer-events-none' : ''}`}>
            <h2 className="font-bold text-white text-base">Mẫu Tonemood và Ánh sáng được thiết lập sẵn</h2>
            <CustomSelect 
              options={presets} 
              value={selectedPreset} 
              onChange={setSelectedPreset} 
              placeholder="Hãy chọn 1 mẫu phù hợp với mong muốn" 
            />
          </div>

          {/* 4. Description - Locked if Ref Image exists */}
          <div className={`space-y-2 transition-opacity duration-300 ${refImage ? 'opacity-40 pointer-events-none' : ''}`}>
            <h2 className="font-bold text-white text-base">3. Mô tả (Input Prompt)</h2>
            <textarea 
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-[#364053] border border-gray-600 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500 resize-none custom-scrollbar"
              placeholder="Mô tả thêm các yêu cầu cụ thể của bạn..."
            />
          </div>

          {/* Action Button */}
          <div className="mt-auto pt-4">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !inputImage || (!refImage && !selectedPreset && !prompt)}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-lg transition-all shadow-lg uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>ĐANG XỬ LÝ...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  <span>TẠO ẢNH NGAY</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow flex flex-col bg-[#202633]">
          <div className="flex border-b border-gray-700 px-6 pt-2 gap-8 flex-shrink-0 bg-[#282f3d]">
            <button 
              onClick={() => setActiveTab('results')}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
            >
              Kết quả
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
            >
              Lịch sử
            </button>
          </div>

          <div className="flex-grow p-6 flex flex-col relative overflow-y-auto custom-scrollbar">
            {activeTab === 'results' ? (
               resultImage ? (
                <div className="flex-grow flex items-center justify-center animate-fade-in group">
                    <div className="relative max-w-5xl w-full">
                        <img src={resultImage} alt="Result" className="w-full h-auto rounded-xl shadow-2xl border border-white/5" />
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all bg-black/60 backdrop-blur-md p-2 px-6 rounded-full border border-white/10 shadow-2xl">
                            <button onClick={() => setZoomedImage(resultImage)} className="p-3 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                <MagnifyingGlassPlusIcon className="w-6 h-6" />
                            </button>
                            <div className="w-px h-8 bg-white/10"></div>
                            <a href={resultImage} download={`F9-Tonemood-${Date.now()}.png`} className="p-3 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                <ArrowDownTrayIcon className="w-6 h-6" />
                            </a>
                        </div>
                    </div>
                </div>
               ) : isGenerating ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center gap-6 animate-fade-in">
                      <div className="relative w-32 h-32">
                          <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center"><SparklesIcon className="w-12 h-12 text-orange-500 animate-pulse" /></div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-white font-bold text-xl uppercase tracking-widest">Đang đồng bộ ánh sáng...</h3>
                        <p className="text-gray-500 text-sm italic">Quá trình này có thể mất vài giây</p>
                      </div>
                  </div>
               ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center gap-4 opacity-40">
                    <div className="w-16 h-16 rounded-2xl bg-[#282f3d] flex items-center justify-center border border-gray-700 shadow-inner">
                      <RectangleGroupIcon className="w-8 h-8 opacity-20" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-gray-400 font-bold text-lg uppercase tracking-widest">CHƯA CÓ KẾT QUẢ</h3>
                      <p className="text-[11px] max-w-xs leading-relaxed">
                        Tải ảnh gốc và chọn mẫu bố cục ở cột bên trái để bắt đầu.
                      </p>
                    </div>
                  </div>
               )
            ) : (
              <div className="w-full flex flex-col gap-6">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-600 opacity-40">
                     <ClockIcon className="w-16 h-16 mb-2" />
                     <p className="italic">Chưa có lịch sử</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {paginatedHistory.map((item) => (
                        <div key={item.id} className="bg-[#2a303c] p-4 rounded-xl border border-gray-800 space-y-4 shadow-lg group hover:border-orange-500/20 transition-all">
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40 border border-gray-700">
                             <img src={item.resultUrl} alt="History" className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button onClick={() => setZoomedImage(item.resultUrl)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><MagnifyingGlassPlusIcon className="w-5 h-5" /></button>
                                <a href={item.resultUrl} download={`f9-tonemood-${item.id}.png`} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><ArrowDownTrayIcon className="w-5 h-5" /></a>
                             </div>
                          </div>
                          <div className="flex justify-between items-center px-1">
                             <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-orange-400 font-bold uppercase truncate">{item.preset}</span>
                                <span className="text-[9px] text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                             </div>
                             <div className="flex -space-x-2 flex-shrink-0">
                               <img src={item.inputUrl} className="w-6 h-6 rounded-full border border-gray-700 object-cover bg-white" title="Gốc" />
                               {item.refUrl && <img src={item.refUrl} className="w-6 h-6 rounded-full border border-gray-700 object-cover bg-white" title="Tham chiếu" />}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default ChangeTonemood;