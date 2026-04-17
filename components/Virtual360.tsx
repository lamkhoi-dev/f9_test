
import React, { useState, useRef, useEffect } from 'react';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { MapIcon } from './icons/MapIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { useLanguage } from '../hooks/useLanguage';
import { useMode } from '../contexts/ModeContext';
import { apiClient, getImageSizeConfig } from '../lib/api';

interface Virtual360Props {
  onBack: () => void;
}

interface HistoryItem {
    id: string;
    inputUrl: string;
    resultUrl: string;
    mode: 'interior' | 'exterior';
    timestamp: number;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const Virtual360: React.FC<Virtual360Props> = ({ onBack }) => {
  const { t } = useLanguage();
  const { getModelName, isPro, proResolution } = useMode();
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [mode, setMode] = useState<'interior' | 'exterior'>('interior');
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [vrLink, setVrLink] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [activeVrUrl, setActiveVrUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pannellumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // Initialize/Destroy Pannellum Viewer
  useEffect(() => {
    if (activeVrUrl && pannellumContainerRef.current && (window as any).pannellum) {
        // Destroy existing viewer if any
        if (viewerRef.current) {
            try { viewerRef.current.destroy(); } catch(e) {}
        }
        
        try {
            viewerRef.current = (window as any).pannellum.viewer(pannellumContainerRef.current, {
                type: 'equirectangular',
                panorama: activeVrUrl,
                autoLoad: true,
                autoRotate: -2,
                showControls: true
            });
        } catch (err) {
            console.error("Pannellum init error:", err);
        }
    }
    
    return () => {
        if (viewerRef.current) {
            try { viewerRef.current.destroy(); } catch(e) {}
            viewerRef.current = null;
        }
    };
  }, [activeVrUrl]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setInputImage({ url, file });
      setResultImage(null);
      setActiveVrUrl(null);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputImage) URL.revokeObjectURL(inputImage.url);
    setInputImage(null);
    setResultImage(null);
    setActiveVrUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!inputImage) {
        alert("Vui lòng tải ảnh đầu vào.");
        return;
    }

    setIsGenerating(true);
    setResultImage(null);
    setActiveVrUrl(null);
    setActiveTab('results');

    try {

        const inputBase64 = await blobToBase64(inputImage.file);

        const interiorPrompt = "Use the uploaded image as the ONLY visual reference. Generate an interior 360-degree panorama in equirectangular format. HARD RULE: This panorama must be a perfect seamless loop. Treat the left border and right border as the SAME physical wall line. Walls, corners, ceiling, floor lines and furniture that touch one border must continue perfectly on the opposite border. Lighting, exposure, white balance, shadows and reflections must remain UNIFORM across the entire 360°. Do NOT change the time of day, light direction, brightness or color anywhere in the image. Do NOT use blur, cross-fade, haze or glow at the connection point. No seam, no banding, no brightness shift, no color shift at the borders. Keep the existing layout, geometry, furniture positions, materials and colors exactly the same. Do NOT redesign, add, remove or move any objects. Only reveal the remaining parts of the same room logically and consistently. Photorealistic, high resolution, sharp, no text, no watermark.";
        
        const exteriorPrompt = "Use the uploaded image as the ONLY visual reference. Generate a 360-degree panoramic image in equirectangular format. This is a HARD rule: the panorama must be a perfect seamless loop. Treat the left border and the right border as the SAME physical line in space. Any road, curb, fence, tree, building, or horizon line that touches one border must continue logically and align perfectly on the opposite border. The lighting, exposure, color temperature, fog, haze, and atmosphere must stay UNIFORM across the whole panorama. Do NOT change the time of day, sun direction, sky brightness, or contrast in any part of the image. Do NOT use cross-fade, blur, glow, or brightness changes at the connection point. No seam, no stitching line, no banding, no color shift at the borders. Keep the original architecture, layout, proportions, materials, and environment exactly the same as in the input image. Do NOT redesign, add, remove, move, or replace any objects. Only extend the real environment logically and consistently to reveal the rest of the same street. Photorealistic, high-resolution, sharp, no text, no watermark.";

        const finalPrompt = mode === 'interior' ? interiorPrompt : exteriorPrompt;

        const parts = [
            { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
            { text: finalPrompt }
        ];

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
                resultUrl: resUrl,
                mode: mode,
                timestamp: Date.now()
            }, ...prev]);
        } else {
            alert("Không nhận được dữ liệu ảnh từ AI. Vui lòng thử lại.");
        }

    } catch (error: any) {
        console.error("360 Generation Error:", error);
        alert(`Lỗi: ${error.message || "Đã xảy ra lỗi trong quá trình xử lý."}`);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleOpenVR = (link?: string) => {
    const urlToOpen = link || vrLink.trim();
    if (urlToOpen) {
        setActiveVrUrl(urlToOpen);
        setResultImage(null);
        setActiveTab('results');
    } else {
        alert("Vui lòng nhập liên kết ảnh 360 hoặc tạo kết quả mới.");
    }
  };

  const handleUseResult = () => {
    if (resultImage) {
        setActiveVrUrl(resultImage);
        // We don't necessarily need to clear resultImage, 
        // but activeVrUrl takes precedence in the UI.
        setActiveTab('results');
    }
  };

  const handleActivateFromHistory = (item: HistoryItem) => {
      setActiveVrUrl(item.resultUrl);
      setResultImage(null); // Clear static result if we're jumping to history VR
      setActiveTab('results');
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
                <a href={zoomedImage} download={`[F9render]_360-${Date.now()}.png`} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <ArrowDownTrayIcon className="w-6 h-6" />
                </a>
                <button onClick={() => setZoomedImage(null)} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    )}

    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)] bg-[#282f3d]">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          <span className="font-semibold text-sm">Home</span>
        </button>

        <div className="space-y-4">
          <h2 className="font-bold text-white text-base">1. Ảnh đầu vào</h2>
          
          {/* Upload Area */}
          <div 
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-56 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {inputImage ? (
              <>
                <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md shadow-2xl" />
                <button 
                  onClick={clearImage} 
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                <div className="p-3 bg-slate-700/50 rounded-full mb-3">
                    <PhotoIcon className="w-10 h-10" />
                </div>
                <p className="text-sm font-medium">Tải ảnh công trình</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#364053] p-1 rounded-lg">
            <button 
              onClick={() => setMode('interior')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'interior' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Nội thất
            </button>
            <button 
              onClick={() => setMode('exterior')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'exterior' ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Ngoại thất
            </button>
          </div>

          {/* Create Button */}
          <button 
            onClick={handleGenerate} 
            disabled={isGenerating || !inputImage}
            className="w-full bg-[#526071] hover:bg-[#607085] text-white font-bold py-3.5 rounded-lg transition-all shadow-lg uppercase tracking-wide text-sm flex items-center justify-center gap-2 disabled:bg-gray-700"
          >
            {isGenerating ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ĐANG TẠO...
                </>
            ) : (
                "TẠO ẢNH 360 NGAY"
            )}
          </button>
        </div>

        {/* VR Link Input Section */}
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-bold text-white text-[11px] uppercase tracking-tight">Điền liên kết ảnh 360 vào đây</h2>
            <a 
              href="https://imgbb.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[11px] font-bold text-red-500 hover:text-red-400 transition-colors"
            >
              Tải ảnh lên tại đây
            </a>
          </div>
          <textarea
            value={vrLink}
            onChange={(e) => setVrLink(e.target.value)}
            placeholder="Hãy coppy liên kết ảnh 360 paste vào đây"
            className="w-full h-24 bg-[#364053] border border-gray-600 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none custom-scrollbar"
          />
          <div className="space-y-2">
            {resultImage && (
                <button 
                    onClick={handleUseResult}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg uppercase tracking-wide text-xs flex items-center justify-center gap-2 border border-orange-400/30"
                >
                    <SparklesIcon className="w-4 h-4" /> KÍCH HOẠT XEM 360 (ẢNH VỪA TẠO)
                </button>
            )}
            <button 
                onClick={() => handleOpenVR()}
                className="w-full bg-[#526071] hover:bg-[#607085] text-white font-bold py-3.5 rounded-lg transition-all shadow-lg uppercase tracking-wide text-xs flex items-center justify-center gap-2"
            >
                XEM ẢNH 360 NGAY (LINK)
            </button>
            <a 
                href="https://renderstuff.com/tools/360-panorama-web-viewer/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg uppercase tracking-wide text-xs flex items-center justify-center gap-2"
            >
                XEM ẢNH 360 TRỰC TUYẾN
            </a>
          </div>
        </div>
      </aside>

      {/* Right Main Content */}
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

        <div className="flex-grow p-6 h-full min-h-0 overflow-y-auto custom-scrollbar">
          {activeTab === 'results' ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                    </div>
                    <p className="text-gray-300 font-medium text-lg animate-pulse text-center">
                        AI đang chuyển không gian sang ảnh toàn cảnh 360...<br/>
                        <span className="text-xs text-gray-500 mt-2 block">Quá trình này có thể mất một lát</span>
                    </p>
                </div>
              ) : activeVrUrl ? (
                <div className="w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col">
                    <div className="bg-[#1e293b] p-2 flex justify-between items-center flex-shrink-0">
                         <span className="text-xs font-bold text-orange-400 uppercase tracking-widest px-3">360 VR Viewer (Active)</span>
                         <button onClick={() => setActiveVrUrl(null)} className="text-gray-400 hover:text-white p-1" title="Đóng chế độ xem 360"><XMarkIcon className="w-5 h-5"/></button>
                    </div>
                    <div 
                        ref={pannellumContainerRef} 
                        className="flex-grow w-full bg-slate-900"
                    ></div>
                </div>
              ) : resultImage ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center gap-6 group">
                    <img src={resultImage} alt="360 Result" className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded-lg border border-white/10" />
                    
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button 
                            onClick={handleUseResult}
                            className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-2xl transform hover:scale-105 transition-all flex items-center gap-2 uppercase tracking-wide text-sm"
                        >
                            <MapIcon className="w-5 h-5" /> KÍCH HOẠT XEM 360 TRỰC TIẾP
                        </button>
                        
                        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-2 px-6 rounded-full shadow-2xl border border-white/10">
                            <button onClick={() => setZoomedImage(resultImage)} className="p-3 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                <MagnifyingGlassPlusIcon className="w-6 h-6" />
                            </button>
                            <div className="w-px h-8 bg-white/20"></div>
                            <a href={resultImage} download={`[F9render]_360-${Date.now()}.png`} className="p-3 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                <ArrowDownTrayIcon className="w-6 h-6" />
                            </a>
                        </div>
                    </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 flex flex-col items-center gap-4 opacity-50">
                    <PhotoIcon className="w-20 h-20" />
                    <p className="text-lg">Chưa có kết quả</p>
                    <p className="text-sm max-w-xs">Tải ảnh công trình hoặc nhập liên kết ảnh 360 để bắt đầu.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-500 opacity-50 flex flex-col items-center gap-4">
                        <PhotoIcon className="w-20 h-20" />
                        <p className="text-lg">Chưa có lịch sử</p>
                    </div>
                ) : (
                    history.map((item) => (
                        <div key={item.id} className="bg-[#202633] p-4 rounded-xl border border-slate-700 hover:border-orange-500/50 transition-all group overflow-hidden relative">
                            <div 
                                className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-black/40 cursor-pointer"
                                onClick={() => handleActivateFromHistory(item)}
                                title="Nhấp để xem 360"
                            >
                                <img src={item.resultUrl} alt="History Result" className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-xl">
                                        <MapIcon className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <span className="text-white text-xs font-bold uppercase tracking-widest">Xem 360</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center px-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{item.mode === 'interior' ? 'Nội thất' : 'Ngoại thất'}</span>
                                    <span className="text-[9px] text-gray-600">{new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => setZoomedImage(item.resultUrl)} 
                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition-colors"
                                        title="Phóng to ảnh"
                                    >
                                        <MagnifyingGlassPlusIcon className="w-4 h-4" />
                                    </button>
                                    <a 
                                        href={item.resultUrl} 
                                        download={`360-${item.timestamp}.png`} 
                                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition-colors"
                                        title="Tải xuống"
                                    >
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                    </a>
                                </div>
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

export default Virtual360;
