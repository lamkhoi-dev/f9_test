
import React, { useState, useRef } from 'react';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { useMode } from '../contexts/ModeContext';
import { GoogleGenAI, Modality } from '@google/genai';

interface ImproveImageQualityProps {
  onBack: () => void;
}

interface HistoryItem {
    id: string;
    inputUrl: string;
    resultUrl: string;
    prompt: string;
    timestamp: number;
}

const ImproveImageQuality: React.FC<ImproveImageQualityProps> = ({ onBack }) => {
  const { getModelName, isPro, proResolution } = useMode();
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputImage) URL.revokeObjectURL(inputImage.url);
    setInputImage(null);
    setResultImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImprove = async () => {
    if (!inputImage) {
        alert("Vui lòng tải ảnh đầu vào.");
        return;
    }

    if (isPro && !(window as any).aistudio?.hasSelectedApiKey()) {
        try { await (window as any).aistudio?.openSelectKey(); } catch(e) {}
    }

    setIsGenerating(true);
    setResultImage(null);
    setActiveTab('results');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const inputBase64 = await blobToBase64(inputImage.file);

        // Logic prompt mặc định theo yêu cầu
        const finalPrompt = description.trim() || "Cải thiện chi tiết , màu sắc,vật liệu và nâng cao chất lượng ảnh lên 4k";
        
        const systemInstruction = `Bạn là chuyên gia xử lý hậu kỳ hình ảnh kiến trúc và nội thất.
NHIỆM VỤ: Nâng cấp chất lượng hình ảnh được cung cấp.

YÊU CẦU KỸ THUẬT:
1. Cải thiện độ sắc nét của các đường nét kiến trúc, vật liệu (vân gỗ, vân đá, vải...).
2. Tối ưu hóa màu sắc và ánh sáng (HDR) để ảnh trông sống động và chân thực hơn.
3. KHÔNG thay đổi hình khối, bố cục hay kiến trúc của công trình gốc.
4. Yêu cầu chi tiết: "${finalPrompt}".

Kết quả phải là một hình ảnh siêu thực, chất lượng cao, sắc nét đến từng chi tiết.`;

        const parts = [
            { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
            { text: systemInstruction }
        ];

        const response = await ai.models.generateContent({
            model: getModelName('image'),
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                ...(isPro ? { 
                    imageConfig: { 
                        imageSize: proResolution === '4k' ? '4K' : '2K' 
                    } 
                } : {})
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            const resUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            setResultImage(resUrl);
            setHistory(prev => [{
                id: Math.random().toString(36).substr(2, 9),
                inputUrl: inputImage.url,
                resultUrl: resUrl,
                prompt: finalPrompt,
                timestamp: Date.now()
            }, ...prev]);
        } else {
            alert("Không nhận được dữ liệu ảnh từ AI. Vui lòng thử lại.");
        }

    } catch (error: any) {
        console.error("Improve Quality Error:", error);
        alert(`Lỗi: ${error.message || "Đã xảy ra lỗi trong quá trình xử lý."}`);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <>
    {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
            <img 
                src={zoomedImage} 
                alt="Zoomed view" 
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10" 
                onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex items-center gap-3 z-[101]">
                <a href={zoomedImage} download={`[F9render]_improved-${Date.now()}.png`} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <ArrowDownTrayIcon className="w-6 h-6" />
                </a>
                <button onClick={() => setZoomedImage(null)} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    )}

    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)]">
      {/* Sidebar - Configuration */}
      <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Home</span>
        </button>

        {/* 1. Input Image */}
        <div className="space-y-4">
          <h2 className="font-bold text-white text-base">1. Ảnh đầu vào</h2>
          <div 
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {inputImage ? (
              <>
                <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md" />
                <button 
                  onClick={clearImage} 
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 shadow-lg"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                <PhotoIcon className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">Tải ảnh công trình cần cải thiện</p>
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>

        {/* 2. Additional Description */}
        <div className="space-y-2">
          <h2 className="font-bold text-white text-base">2. Mô tả bổ sung (Tùy chọn)</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Giữ nguyên hình khối, cải thiện, nâng cao chi tiết chất lượng hình ảnh."
            className="w-full h-48 bg-[#364053] border border-gray-600 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none custom-scrollbar"
          />
          <p className="text-[10px] text-gray-500 italic mt-1">* Nếu để trống, AI sẽ tự động tối ưu hóa chi tiết và vật liệu lên mức cao nhất.</p>
        </div>

        {/* Action Button */}
        <div className="mt-auto pt-4">
          <button 
            onClick={handleImprove}
            disabled={isGenerating || !inputImage}
            className="w-full bg-[#8c2d2d] hover:bg-[#a33535] text-white font-bold py-4 rounded-lg transition-all shadow-lg uppercase tracking-wider text-sm flex items-center justify-center gap-2 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Đang xử lý...
                </>
            ) : (
                <>
                    <SparklesIcon className="w-4 h-4" />
                    BẮT ĐẦU CẢI THIỆN
                </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col bg-[#282f3d]">
        <div className="flex border-b border-gray-700 px-6 pt-4 gap-6">
          <button 
            onClick={() => setActiveTab('results')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Kết quả
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
          >
            Lịch sử
          </button>
        </div>

        <div className="flex-grow p-6 h-full overflow-y-auto custom-scrollbar">
          {activeTab === 'results' ? (
            <div className="w-full h-full bg-[#202633] rounded-xl border border-gray-700/50 flex flex-col items-center justify-center relative group overflow-hidden">
                {isGenerating ? (
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-24 h-24">
                            <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <SparklesIcon className="w-8 h-8 text-orange-500 animate-pulse" />
                            </div>
                        </div>
                        <p className="text-gray-300 font-medium text-lg animate-pulse text-center">
                            AI đang nâng cấp chất lượng ảnh...<br/>
                            <span className="text-xs text-gray-500">Quá trình này có thể mất vài giây</span>
                        </p>
                    </div>
                ) : resultImage ? (
                    <div className="relative w-full h-full flex items-center justify-center p-2 bg-black/10">
                        <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain shadow-2xl" />
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 px-6 rounded-full shadow-2xl border border-white/10">
                            <button onClick={() => setZoomedImage(resultImage)} className="p-3 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                <MagnifyingGlassPlusIcon className="w-6 h-6" />
                            </button>
                            <div className="w-px h-8 bg-white/20"></div>
                            <a href={resultImage} download={`[F9render]_improved-${Date.now()}.png`} className="p-3 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                <ArrowDownTrayIcon className="w-6 h-6" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-600 animate-fade-in">
                        <div className="w-20 h-20 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-600/30">
                            <SparklesIcon className="w-10 h-10 text-gray-600" />
                        </div>
                        <p className="text-sm font-medium">Chưa có kết quả</p>
                        <p className="text-xs mt-2 max-w-xs mx-auto">Tải ảnh công trình và nhấn "Bắt đầu cải thiện" để AI nâng cấp chất lượng ảnh của bạn.</p>
                    </div>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {history.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                        <PhotoIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Chưa có lịch sử xử lý</p>
                    </div>
                ) : (
                    history.map((item) => (
                        <div key={item.id} className="bg-[#202633] p-4 rounded-xl border border-slate-700 hover:border-orange-500/50 transition-all group shadow-lg">
                            <div className="relative aspect-video rounded-lg overflow-hidden mb-3 bg-black/40">
                                <img src={item.resultUrl} alt="History Result" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button onClick={() => setZoomedImage(item.resultUrl)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10">
                                        <MagnifyingGlassPlusIcon className="w-5 h-5" />
                                    </button>
                                    <a href={item.resultUrl} download={`improved-${item.timestamp}.png`} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors border border-white/10">
                                        <ArrowDownTrayIcon className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[10px] text-gray-400 font-medium truncate" title={item.prompt}>{item.prompt}</span>
                                    <span className="text-[9px] text-gray-600">{new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                                <img src={item.inputUrl} className="w-8 h-8 rounded border border-slate-600 object-cover flex-shrink-0 ml-2" alt="input-thumb" />
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

export default ImproveImageQuality;
