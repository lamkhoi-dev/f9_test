
import React, { useState, useRef } from 'react';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { useLanguage } from '../hooks/useLanguage';
import { useMode } from '../contexts/ModeContext';
import { apiClient, getImageSizeConfig } from '../lib/api';

interface ChangeStyleProps {
  onBack: () => void;
}

interface HistoryItem {
  input: string;
  output: string;
  style: string;
}

const ChangeStyle: React.FC<ChangeStyleProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const { getModelName, isPro, proResolution } = useMode();
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  
  // Input Images
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [referenceImage, setReferenceImage] = useState<{ url: string; file: File } | null>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const styles = [
    "Hiện đại (Modern)",
    "Tân cổ điển (Neoclassical)",
    "Nhiệt đới (Tropical)",
    "Đông Dương (Indochine)",
    "Tối giản (Minimalist)",
    "Công nghiệp (Industrial)",
    "Bắc Âu (Scandinavian)",
    "Nhật Bản (Zen/Japandi)",
    "Địa Trung Hải",
    "Futuristic (Tương lai)"
  ];

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setInputImage({ url, file });
      setResultImage(null);
    }
  };

  const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setReferenceImage({ url, file });
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputImage) URL.revokeObjectURL(inputImage.url);
    setInputImage(null);
    setResultImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearReferenceImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (referenceImage) URL.revokeObjectURL(referenceImage.url);
    setReferenceImage(null);
    if (referenceFileInputRef.current) referenceFileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!inputImage) {
        alert("Vui lòng tải ảnh đầu vào.");
        return;
    }

    if (!referenceImage && !selectedStyle && !customPrompt) {
        alert("Vui lòng chọn phong cách, nhập mô tả hoặc tải ảnh tham khảo.");
        return;
    }

    if (isPro) {
    }

    setIsGenerating(true);
    setResultImage(null);
    setActiveTab('results');

    try {

        const inputBase64 = await blobToBase64(inputImage.file);
        let parts: any[] = [];

        if (referenceImage) {
            // MODE: STYLE REFERENCE TRANSFER
            const refBase64 = await blobToBase64(referenceImage.file);
            const prompt = `Bạn là công cụ chuyển đổi phong cách kiến trúc.
Nhiệm vụ:
Dựa vào [ẢNH THAM KHẢO PHONG CÁCH], hãy áp dụng phong cách, màu sắc, vật liệu, ánh sáng và mood vào công trình trong [ẢNH GỐC].
YÊU CẦU BẮT BUỘC:
- Giữ NGUYÊN 100% hình khối, bố cục, tỷ lệ, vị trí cửa – ban công – mái của ảnh gốc.
- Giữ nguyên góc chụp, phối cảnh, mốc máy ảnh.
- Tuyệt đối KHÔNG sao chép hình dạng công trình từ ảnh tham chiếu.
- Chỉ thay: màu sơn, chất liệu tường, chất liệu mái, khung cửa, lan can, đèn, landscape, ánh sáng tổng thể.
Áp dụng:
- Lấy tone màu, texture, vật liệu, mood và ánh sáng từ ảnh phong cách.
- Giữ lại toàn bộ cấu trúc kiến trúc ảnh gốc.
Kết quả: ảnh kiến trúc siêu thực, vật liệu PBR, ánh sáng HDR, chi tiết sắc nét.
Output: 1 ảnh cuối cùng đúng phong cách tham chiếu nhưng GIỮ HÌNH NGUYÊN vẹn.`;

            parts = [
                { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
                { text: "Đây là [ẢNH GỐC]" },
                { inlineData: { data: refBase64, mimeType: referenceImage.file.type } },
                { text: "Đây là [ẢNH THAM KHẢO PHONG CÁCH]\n\n" + prompt }
            ];
        } else {
            // MODE: PRESET STYLE
            const prompt = `Change the architectural style of the building in this image to: ${selectedStyle}. ${customPrompt}. 
            Keep the original building geometry, perspective, and composition exactly as it is. 
            Only change materials, colors, and architectural details to match the requested style. 
            Photorealistic, high quality, 8k render.`;

            parts = [
                { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
                { text: prompt }
            ];
        }

        const response = await apiClient.generateContent({
            model: getModelName('image'),
            contents: { parts },
            config: { 
                responseModalities: ['IMAGE'],
                ...getImageSizeConfig(isPro, proResolution)
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            const resUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            setResultImage(resUrl);
            setHistory(prev => [{ 
                input: inputImage.url, 
                output: resUrl, 
                style: referenceImage ? 'Theo ảnh tham khảo' : selectedStyle 
            }, ...prev]);
        } else {
            alert("Không thể tạo ảnh. Vui lòng thử lại.");
        }

    } catch (error) {
        console.error("Change Style Error:", error);
        alert("Đã xảy ra lỗi khi tạo ảnh. Vui lòng kiểm tra lại.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <>
    {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
            <img 
                src={zoomedImage} 
                alt="Zoomed view" 
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" 
                onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex items-center gap-3 z-[101]">
                <a href={zoomedImage} download={`[F9render.com]_style-transfer-${Date.now()}.png`} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <ArrowDownTrayIcon className="w-6 h-6" />
                </a>
                <button onClick={() => setZoomedImage(null)} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    )}

    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)]">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 group"
        >
          <div className="p-1 rounded-full group-hover:bg-slate-700">
            <ChevronLeftIcon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">Quay lại Kho tiện ích</span>
        </button>

        {/* 1. Input Image */}
        <div className="space-y-2">
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            1. Ảnh đầu vào
            <span className="text-red-500 text-xs font-normal">* Bắt buộc</span>
          </h2>
          <div 
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-orange-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group"
            onClick={() => fileInputRef.current?.click()}
          >
            {inputImage ? (
              <>
                <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md" />
                <button 
                  onClick={clearImage} 
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                <div className="p-3 bg-slate-700/50 rounded-full mb-3">
                    <PhotoIcon className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">Tải ảnh công trình cần đổi style</p>
                <p className="text-xs mt-1 opacity-70">Hỗ trợ JPG, PNG</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>

        {/* 1.1 Reference Image */}
        <div className="space-y-2">
          <h2 className="font-bold text-white text-base">2. Ảnh tham khảo phong cách</h2>
          <div 
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-40 hover:border-gray-500 cursor-pointer bg-[#282f3d]/50 transition-all group"
            onClick={() => referenceFileInputRef.current?.click()}
          >
            {referenceImage ? (
              <>
                <img src={referenceImage.url} alt="Reference Style" className="max-h-full max-w-full object-contain rounded-md" />
                <button 
                  onClick={clearReferenceImage} 
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                <div className="p-3 bg-slate-700/50 rounded-full mb-3">
                    <PhotoIcon className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">Tải ảnh tham khảo phong cách</p>
                <p className="text-xs mt-1 opacity-70">Hỗ trợ JPG, PNG</p>
              </div>
            )}
          </div>
          <input type="file" ref={referenceFileInputRef} onChange={handleReferenceImageUpload} className="hidden" accept="image/*" />
        </div>

        {/* 2. Style Selection (Disabled if Reference Image present) */}
        <div className={`space-y-3 ${referenceImage ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="font-bold text-white text-base">3. Chọn Phong cách kiến trúc</h2>
          <div className="grid grid-cols-2 gap-2">
            {styles.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all border ${
                  selectedStyle === style 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50' 
                    : 'bg-[#364053] border-transparent text-gray-300 hover:bg-slate-600 hover:border-slate-500'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Additional Prompt (Disabled if Reference Image present) */}
        <div className={`space-y-2 ${referenceImage ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="font-bold text-white text-base">4. Mô tả bổ sung (Optional)</h2>
            <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ví dụ: Giữ nguyên hình khối, thay đổi sang tone màu trắng sáng, thêm cây xanh ở ban công..."
                className="w-full h-24 bg-[#364053] border border-slate-600 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
        </div>

        {/* Action Button */}
        <div className="pt-2 mt-auto">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !inputImage}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/30 uppercase tracking-wide text-sm flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    Đang chuyển đổi...
                </>
            ) : (
                <>
                    <SparklesIcon className="w-5 h-5 group-hover:animate-pulse" />
                    Bắt đầu chuyển đổi
                </>
            )}
          </button>
        </div>
      </aside>

      {/* Right Main Content */}
      <main className="flex-grow flex flex-col bg-[#282f3d]">
        <div className="flex border-b border-gray-700 px-6 pt-4 gap-6">
          <button 
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'results' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Kết quả
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Lịch sử
          </button>
        </div>

        <div className="flex-grow p-6 h-full min-h-0 overflow-y-auto custom-scrollbar">
          {activeTab === 'results' ? (
            <div className="w-full h-full bg-[#202633] rounded-xl border border-gray-700/50 flex items-center justify-center relative overflow-hidden group">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/30"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                        </div>
                        <p className="text-gray-300 animate-pulse font-medium">AI đang biến đổi phong cách...</p>
                    </div>
                ) : resultImage ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black/20">
                        <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain shadow-2xl" />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full px-4">
                            <button onClick={() => setZoomedImage(resultImage)} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                <MagnifyingGlassPlusIcon className="w-6 h-6" />
                            </button>
                            <div className="w-px h-6 bg-white/20"></div>
                            <a href={resultImage} download={`[F9render]_style-transfer-${Date.now()}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                <ArrowDownTrayIcon className="w-6 h-6" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SparklesIcon className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-gray-400 font-semibold text-lg mb-2">Chưa có kết quả</h3>
                        <p className="text-gray-500 text-sm max-w-md mx-auto">
                            Tải ảnh công trình và chọn phong cách (hoặc tải ảnh mẫu) rồi nhấn "Bắt đầu chuyển đổi".
                        </p>
                    </div>
                )}
            </div>
          ) : (
            // History Tab
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {history.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-500">
                        <p>Chưa có lịch sử chuyển đổi</p>
                    </div>
                ) : (
                    history.map((item, index) => (
                        <div key={index} className="bg-[#202633] p-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors">
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-3 group/item">
                                <img src={item.output} alt={`History ${index}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => setZoomedImage(item.output)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                        <MagnifyingGlassPlusIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs text-gray-400 truncate max-w-[120px]" title={item.style}>{item.style}</span>
                                <span className="text-[10px] text-gray-500">#{history.length - index}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  );
};

export default ChangeStyle;
