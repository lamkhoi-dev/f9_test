import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { useLanguage } from '../hooks/useLanguage';
import { RectangleGroupIcon } from './icons/RectangleGroupIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { GoogleGenAI, Modality } from '@google/genai';
import { useMode } from '../contexts/ModeContext';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';

interface MergeBuildingProps {
  onBack: () => void;
}

interface HistoryItem {
  id: string;
  inputUrl: string;
  resultUrl: string;
  mode: string;
  timestamp: number;
}

const MergeBuilding: React.FC<MergeBuildingProps> = ({ onBack }) => {
  const { t, locale } = useLanguage();
  const { getModelName, isPro, proResolution } = useMode();
  const [activeSideTab, setActiveSideTab] = useState<'way1' | 'way2'>('way1');
  const [activeMainTab, setActiveMainTab] = useState<'results' | 'history'>('results');
  const [inputMode, setInputMode] = useState<'default' | 'clean'>('default');
  
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [userConstructionImage, setUserConstructionImage] = useState<{ url: string; file: File } | null>(null);
  const [description, setDescription] = useState('');
  const [treeType, setTreeType] = useState('Hãy chọn 1 dạng cây mong muốn');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const inputFileInputRef = useRef<HTMLInputElement>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleCleanLand = async () => {
    if (!inputImage) {
      alert("Vui lòng tải ảnh bối cảnh ở Mục 1 trước khi thực hiện làm sạch.");
      setInputMode('default');
      return;
    }

    setIsCleaning(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputBase64 = await blobToBase64(inputImage.file);
      
      const cleanPrompt = "Ảnh chụp thực tế, dọn sạch khu đất trống, xóa bỏ cây xanh trước lô đất trống, cây vỉa hè (nếu có), ánh sáng ban ngày, trời trong xanh, giữ nguyên bao cảnh của ảnh gốc.";

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
            { text: cleanPrompt }
          ]
        },
        config: { 
          responseModalities: [Modality.IMAGE]
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart && imagePart.inlineData) {
        const resUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        const newFile = dataURLtoFile(resUrl, `cleaned-${Date.now()}.png`);
        
        URL.revokeObjectURL(inputImage.url);
        setInputImage({ url: resUrl, file: newFile });
      } else {
        alert("AI không thể làm sạch ảnh. Vui lòng thử lại.");
        setInputMode('default');
      }
    } catch (error: any) {
      console.error("Clean Land Error:", error);
      alert("Đã xảy ra lỗi khi làm sạch khu đất.");
      setInputMode('default');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'input' | 'user') => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'input') setInputImage({ url, file });
      else setUserConstructionImage({ url, file });
    }
    if (event.target) event.target.value = '';
  };

  const clearImage = (type: 'input' | 'user') => {
    if (type === 'input') {
      if (inputImage) URL.revokeObjectURL(inputImage.url);
      setInputImage(null);
      setInputMode('default');
    } else {
      if (userConstructionImage) URL.revokeObjectURL(userConstructionImage.url);
      setUserConstructionImage(null);
    }
  };

  const handleGenerate = async () => {
    if (!inputImage || !userConstructionImage) {
      alert("Vui lòng tải đầy đủ ảnh bối cảnh và ảnh công trình.");
      return;
    }

    if (isPro && !(window as any).aistudio?.hasSelectedApiKey()) {
      try { await (window as any).aistudio?.openSelectKey(); } catch(e) {}
    }

    setIsLoading(true);
    setResultImage(null);
    setActiveMainTab('results');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputBase64 = await blobToBase64(inputImage.file);
      const userBase64 = await blobToBase64(userConstructionImage.file);
      
      let finalPrompt = "";
      
      if (activeSideTab === 'way1') {
        finalPrompt = "Ảnh chụp thực tế, ghép công trình 2 vào bối cảnh khu đất trống của ảnh 1, giữ nguyên chi tiết kiến trúc, bối cảnh, ánh sáng của ảnh gốc, độ phân giải cao.";
        if (description) finalPrompt += ` Yêu cầu bổ sung: ${description}`;
        if (treeType !== 'Hãy chọn 1 dạng cây mong muốn') finalPrompt += ` Thêm cây: ${treeType}`;
      } else {
        finalPrompt = "Đặt ảnh 2D trong hình 2 vào vùng màu đỏ trong hình 1 và chuyển nó thành ảnh 3D thực.";
      }

      const parts: any[] = [
          { text: "Hình 1: Ảnh bối cảnh" },
          { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
          { text: "Hình 2: Ảnh công trình 2D/3D của bạn" },
          { inlineData: { data: userBase64, mimeType: userConstructionImage.file.type } },
          { text: finalPrompt }
      ];

      const response = await ai.models.generateContent({
        model: getModelName('image'),
        contents: { parts },
        config: { 
          responseModalities: [Modality.IMAGE],
          ...(isPro ? { imageConfig: { imageSize: proResolution === '4k' ? '4K' : '2K' } } : {})
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
          mode: activeSideTab === 'way1' ? 'Ghép công trình (Cách 1)' : 'Ghép công trình (Cách 2)',
          timestamp: Date.now()
        }, ...prev]);
      } else {
        alert("Không nhận được dữ liệu ảnh từ AI. Vui lòng thử lại.");
      }

    } catch (error: any) {
      console.error("Merge Error:", error);
      alert(`Lỗi: ${error.message || "Đã xảy ra lỗi trong quá trình xử lý."}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10" 
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a href={zoomedImage} download={`F9-Merge-${Date.now()}.png`} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all">
              <ArrowDownTrayIcon className="w-6 h-6" />
            </a>
            <button onClick={() => setZoomedImage(null)} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)] bg-[#282f3d]">
        {/* Sidebar */}
        <aside className="w-full lg:w-[350px] flex-shrink-0 bg-[#1e232e] border-r border-black/20 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 group"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="font-semibold text-sm">Quay lại</span>
          </button>

          {/* Tab Toggles */}
          <div className="flex bg-[#2c3444] p-1 rounded-lg">
            <button 
              onClick={() => setActiveSideTab('way1')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeSideTab === 'way1' ? 'bg-[#3b4455] text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Cách 1
            </button>
            <button 
              onClick={() => setActiveSideTab('way2')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeSideTab === 'way2' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Cách 2
            </button>
          </div>

          {activeSideTab === 'way1' ? (
            <>
              {/* Nội dung Cách 1 */}
              <div className="space-y-3">
                <h2 className="font-bold text-white text-base">1. Ảnh đầu vào</h2>
                <div 
                  className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center text-center h-48 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group"
                  onClick={() => !isCleaning && inputFileInputRef.current?.click()}
                >
                  {isCleaning ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
                      <p className="text-xs text-orange-400 animate-pulse font-medium">Đang dọn dẹp khu đất...</p>
                    </div>
                  ) : inputImage ? (
                    <>
                      <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md" />
                      <button onClick={(e) => { e.stopPropagation(); clearImage('input'); }} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"><TrashIcon className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                      <PhotoIcon className="w-12 h-12 mb-3" />
                      <p className="text-xs">Tải ảnh bối cảnh / bãi đất trống</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={inputFileInputRef} onChange={(e) => handleImageUpload(e, 'input')} className="hidden" accept="image/*" />

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="inputMode" className="w-4 h-4 accent-orange-500" checked={inputMode === 'default'} onChange={() => setInputMode('default')} />
                    <span className={`text-sm ${inputMode === 'default' ? 'text-orange-400' : 'text-gray-400 group-hover:text-gray-300'}`}>Ảnh mặc định</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="inputMode" className="w-4 h-4 accent-orange-500" checked={inputMode === 'clean'} onChange={() => { setInputMode('clean'); handleCleanLand(); }} />
                    <span className={`text-sm ${inputMode === 'clean' ? 'text-orange-400' : 'text-gray-400 group-hover:text-gray-300'}`}>Làm sạch khu đất</span>
                  </label>
                </div>

                {/* Chú ý: Dòng chữ được yêu cầu thêm cho Cách 1 */}
                <div className="bg-[#2c3444] p-2 rounded border border-white/5 mt-1">
                    <p className="text-[#ea580c] text-[10px] font-bold italic">
                        * Chú ý: Ảnh phải là ảnh chụp 1 bãi đất trống
                    </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h2 className="font-bold text-white text-base">Ảnh công trình của bạn</h2>
                <div 
                  className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center text-center h-48 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group"
                  onClick={() => userFileInputRef.current?.click()}
                >
                  {userConstructionImage ? (
                    <>
                      <img src={userConstructionImage.url} alt="User project" className="max-h-full max-w-full object-contain rounded-md" />
                      <button onClick={(e) => { e.stopPropagation(); clearImage('user'); }} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"><TrashIcon className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                      <PhotoIcon className="w-12 h-12 mb-3" />
                      <p className="text-xs">Kéo và thả hoặc nhấp để tải lên</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={userFileInputRef} onChange={(e) => handleImageUpload(e, 'user')} className="hidden" accept="image/*" />
                <button onClick={() => userFileInputRef.current?.click()} className="w-full bg-[#364053] hover:bg-[#475266] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm uppercase">Tải ảnh của bạn</button>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-white text-sm">Thêm cây cối</label>
                <select value={treeType} onChange={(e) => setTreeType(e.target.value)} className="w-full bg-[#364053] border border-gray-600 text-gray-300 text-sm rounded-lg p-3 appearance-none focus:outline-none focus:border-orange-500 cursor-pointer">
                  <option>Hãy chọn 1 dạng cây mong muốn</option>
                  <option>Cây xanh nhiệt đới (Resort)</option>
                  <option>Cây dạng hàn đới</option>
                  <option>Cây hoa giấy rực rỡ</option>
                  <option>Hàng rào trúc cảnh</option>
                  <option>Cây tùng La Hán</option>
                  <option>Thảm cỏ xanh mướt</option>
                </select>
              </div>

              <div className="space-y-2">
                <h2 className="font-bold text-white text-base">3. Mô tả (Input Prompt)</h2>
                <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả thêm các yêu cầu cụ thể của bạn..." className="w-full bg-[#364053] border border-gray-600 text-white rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 resize-none placeholder-gray-500 custom-scrollbar"></textarea>
              </div>

              <div className="mt-auto pt-4">
                <button onClick={handleGenerate} disabled={isLoading || !inputImage || isCleaning} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-lg transition-all shadow-lg uppercase tracking-wider text-sm disabled:bg-gray-700 flex items-center justify-center gap-2">
                  {isLoading ? "ĐANG XỬ LÝ..." : "TẠO ẢNH NGAY"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* --- GIAO DIỆN CÁCH 2 --- */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="font-bold text-white text-base">1. Ảnh đầu vào</h2>
                  <div 
                    className="relative border border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center h-44 hover:border-gray-500 cursor-pointer bg-[#1a1e28] transition-all group overflow-hidden"
                    onClick={() => inputFileInputRef.current?.click()}
                  >
                    {inputImage ? (
                      <>
                        <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain" />
                        <button onClick={(e) => { e.stopPropagation(); clearImage('input'); }} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-gray-600">
                        <PhotoIcon className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-[10px] uppercase font-medium">Tải ảnh bối cảnh / bãi đất trống</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={inputFileInputRef} onChange={(e) => handleImageUpload(e, 'input')} className="hidden" accept="image/*" />
                  <button onClick={() => inputFileInputRef.current?.click()} className="w-full bg-[#2a303c] hover:bg-[#343b4a] text-gray-300 font-bold py-2 rounded-lg transition-colors text-[10px] uppercase border border-gray-700">Tải ảnh của bạn</button>
                  
                  {/* Chú ý: Dòng chữ được yêu cầu thêm */}
                  <div className="bg-[#2c3444] p-2 rounded border border-white/5 mt-2">
                    <p className="text-[#ea580c] text-[10px] font-bold italic">
                      * Chú ý: Tô màu vào vị trí công trình muốn ghép
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="font-bold text-white text-base">Ảnh công trình của bạn</h2>
                  <div 
                    className="relative border border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center h-44 hover:border-gray-500 cursor-pointer bg-[#1a1e28] transition-all group overflow-hidden"
                    onClick={() => userFileInputRef.current?.click()}
                  >
                    {userConstructionImage ? (
                      <>
                        <img src={userConstructionImage.url} alt="User project" className="max-h-full max-w-full object-contain" />
                        <button onClick={(e) => { e.stopPropagation(); clearImage('user'); }} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"><TrashIcon className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-gray-600">
                        <PhotoIcon className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-[10px] uppercase font-medium">Kéo và thả hoặc nhấp để tải lên</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={userFileInputRef} onChange={(e) => handleImageUpload(e, 'user')} className="hidden" accept="image/*" />
                  <button onClick={() => userFileInputRef.current?.click()} className="w-full bg-[#2a303c] hover:bg-[#343b4a] text-gray-300 font-bold py-2 rounded-lg transition-colors text-[10px] uppercase border border-gray-700">Tải ảnh của bạn</button>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <button 
                    onClick={handleGenerate}
                    disabled={isLoading || !inputImage || !userConstructionImage}
                    className="w-full bg-[#3b4455] hover:bg-orange-500 text-white font-bold py-4 rounded-lg transition-all shadow-lg uppercase tracking-widest text-xs disabled:opacity-50"
                >
                    {isLoading ? "ĐANG XỬ LÝ..." : "TẠO ẢNH NGAY"}
                </button>
              </div>
            </>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col bg-[#202633]">
          <div className="flex border-b border-gray-800 px-6 pt-4 gap-8 flex-shrink-0 bg-[#282f3d]/50 backdrop-blur-sm">
            <button 
              onClick={() => setActiveMainTab('results')}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeMainTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              Kết quả
            </button>
            <button 
              onClick={() => setActiveMainTab('history')}
              className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeMainTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              Lịch sử
            </button>
          </div>

          <div className="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col">
            {activeMainTab === 'results' ? (
              <div className="flex-grow bg-[#1a1e28]/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center p-8">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium text-lg">AI đang ghép công trình...</p>
                  </div>
                ) : resultImage ? (
                  <div className="relative group max-w-4xl w-full">
                    <img src={resultImage} alt="Result" className="w-full rounded-xl shadow-2xl border border-white/10" />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 px-6 rounded-full border border-white/10 shadow-2xl">
                        <button onClick={() => setZoomedImage(resultImage)} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                            <MagnifyingGlassPlusIcon className="w-6 h-6" />
                        </button>
                        <div className="w-px h-8 bg-white/10"></div>
                        <a href={resultImage} download={`F9-Result-${Date.now()}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                            <ArrowDownTrayIcon className="w-6 h-6" />
                        </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center opacity-40 grayscale group">
                    <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
                        <RectangleGroupIcon className="w-12 h-12 text-gray-600" />
                    </div>
                    <h3 className="text-gray-300 font-bold text-xl uppercase tracking-widest mb-3">Chưa có kết quả</h3>
                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                        Tải ảnh gốc và chọn mẫu bố cục ở cột bên trái để bắt đầu.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.length === 0 ? (
                  <div className="col-span-full text-center py-20 text-gray-600 italic">Chưa có lịch sử.</div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="bg-[#282f3d] p-4 rounded-xl border border-white/5 space-y-4 shadow-lg group hover:border-orange-500/20 transition-all">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40 border border-white/5">
                          <img src={item.resultUrl} alt="History Result" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button onClick={() => setZoomedImage(item.resultUrl)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
                                  <MagnifyingGlassPlusIcon className="w-5 h-5" />
                              </button>
                              <a href={item.resultUrl} download={`f9-history-${item.id}.png`} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white">
                                  <ArrowDownTrayIcon className="w-5 h-5" />
                              </a>
                          </div>
                      </div>
                      <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{item.mode}</span>
                              <span className="text-[9px] text-gray-600">{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                          <img src={item.inputUrl} className="w-8 h-8 rounded border border-white/10 object-cover" alt="thumb" />
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

export default MergeBuilding;