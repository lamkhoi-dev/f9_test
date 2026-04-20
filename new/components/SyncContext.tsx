
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { MapIcon } from './icons/MapIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { useLanguage } from '../hooks/useLanguage';
import { useMode } from '../contexts/ModeContext';
import { GoogleGenAI, Modality } from '@google/genai';
import ImageEditor from './ImageEditor';
import { XMarkIcon } from './icons/XMarkIcon';
import Pagination from './Pagination';
import FilterDropdown from './FilterDropdown';

interface SyncContextProps {
  onBack: () => void;
  onEdit?: (imageUrl: string) => void;
}

interface SyncHistoryItem {
    id: string;
    inputs: string[];
    output: string;
    prompt: string;
    timestamp: number;
    mode: string;
}

const cameraAngles = [
    "Góc chính diện (Frontal View) - Rõ mặt tiền, hình khối",
    "Góc mắt người (Eye-level) - Tự nhiên, chân thực",
    "Góc nhìn từ mặt đường (Street-level) - Hòa nhập bối cảnh phố",
    "Góc nhìn 3/4 bên trái",
    "Góc nhìn 3/4 bên phải",
    "Góc nhìn từ trên cao (Bird's-eye view): Góc nhìn được đặt từ trên xuống để lộ rõ phần mái, sân thượng và cấu trúc khối của ngôi nhà.",
    "Góc từ dưới lên (Low angle) - Hùng vĩ, ấn tượng"
];

const SyncContext: React.FC<SyncContextProps> = ({ onBack, onEdit }) => {
  const { t, locale } = useLanguage();
  const { getModelName, isPro, proResolution } = useMode();
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [activeWay, setActiveWay] = useState<'way1' | 'way2'>('way1');
  const [images, setImages] = useState<{ url: string; file: File }[]>([]);
  const [syncCount, setSyncCount] = useState<number>(0);
  const [prompt, setPrompt] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMergingImages, setIsMergingImages] = useState(false);
  const [mergedImage, setMergedImage] = useState<{ url: string; file: File } | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergedImageInputRef = useRef<HTMLInputElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const paginatedHistory = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Way 2 States
  const [way2MainImage, setWay2MainImage] = useState<{ url: string; file: File } | null>(null);
  const [way2RefImages, setWay2RefImages] = useState<{ id: string; url: string; file: File }[]>([]);
  const [way2CameraAngle, setWay2CameraAngle] = useState('');
  const [isAngleDropdownOpen, setIsAngleDropdownOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('Auto');
  
  const way2MainInputRef = useRef<HTMLInputElement>(null);
  const way2RefInputRef = useRef<HTMLInputElement>(null);
  const angleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (angleDropdownRef.current && !angleDropdownRef.current.contains(event.target as Node)) {
        setIsAngleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const updatedImages = [...images];
      
      for (const file of newFiles) {
        if (updatedImages.length < 4) {
          updatedImages.push({
            url: URL.createObjectURL(file as Blob),
            file: file as File
          });
        }
      }
      setImages(updatedImages);
      // Khi tải ảnh lên lần đầu và syncCount đang là 0, gợi ý giá trị bằng số ảnh tải lên
      if (syncCount === 0) {
        setSyncCount(updatedImages.length);
      }
      setResultImage(null);
    }
    if (event.target) event.target.value = '';
  };

  const handleMergedImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (mergedImage) URL.revokeObjectURL(mergedImage.url);
      setMergedImage({ url: URL.createObjectURL(file), file });
    }
    if (event.target) event.target.value = '';
  };

  const handleWay2MainUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (way2MainImage) URL.revokeObjectURL(way2MainImage.url);
      setWay2MainImage({ url: URL.createObjectURL(file), file });
    }
    if (event.target) event.target.value = '';
  };

  const handleWay2RefUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const remaining = 5 - way2RefImages.length;
      if (remaining <= 0) {
          alert(locale === 'vi' ? "Tối đa 5 ảnh tham chiếu." : "Maximum 5 reference images.");
          return;
      }
      
      const filesToAdd = newFiles.slice(0, remaining);
      const newRefs = filesToAdd.map(file => ({
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file as Blob),
          file: file as File
      }));
      setWay2RefImages(prev => [...prev, ...newRefs]);
    }
    if (event.target) event.target.value = '';
  };

  const removeWay2Ref = (id: string) => {
      setWay2RefImages(prev => {
          const img = prev.find(i => i.id === id);
          if (img) URL.revokeObjectURL(img.url);
          return prev.filter(i => i.id !== id);
      });
  };

  const removeImage = (index: number) => {
    const updated = [...images];
    URL.revokeObjectURL(updated[index].url);
    updated.splice(index, 1);
    setImages(updated);
    setResultImage(null);
  };

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

  const handleMergeImages = async () => {
    if (images.length === 0) {
      alert("Vui lòng tải lên ít nhất 1 ảnh để gộp.");
      return;
    }

    setIsMergingImages(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imageParts = await Promise.all(images.map(async (img) => {
        const b64 = await blobToBase64(img.file);
        return { inlineData: { data: b64, mimeType: img.file.type } };
      }));

      const mergePrompt = "Ghép các ảnh tải lên thành 1 ảnh duy nhất dạng storyboard trên nền trắng, xếp dọc hiển thị đầy đủ tất cả chi tiết của ảnh gốc, không được lặp lại ảnh. Mỗi hình sẽ được để trong 1 khung hình vuông để lấy trọn chi tiết ảnh gốc, không thêm viền hoặc chi tiết khác vào khung ảnh.";

      const response = await ai.models.generateContent({
        model: getModelName('image'),
        contents: {
          parts: [...imageParts, { text: mergePrompt }]
        },
        config: { 
          responseModalities: [Modality.IMAGE],
          ...(isPro ? { imageConfig: { imageSize: '2K' } } : {})
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart && imagePart.inlineData) {
        const resUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        const newFile = dataURLtoFile(resUrl, `merged-${Date.now()}.png`);
        
        if (mergedImage) URL.revokeObjectURL(mergedImage.url);
        setMergedImage({ url: resUrl, file: newFile });
      } else {
        alert("Không thể gộp ảnh. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Merge Images Error:", error);
      alert("Đã xảy ra lỗi khi gộp ảnh.");
    } finally {
      setIsMergingImages(false);
    }
  };

  const handleStartSync = async () => {
    if (activeWay === 'way1') {
        if (!mergedImage && images.length === 0) {
            alert("Vui lòng tải lên ít nhất 1 ảnh gốc hoặc thực hiện gộp ảnh.");
            return;
        }
    } else {
        if (!way2MainImage || way2RefImages.length === 0) {
            alert("Vui lòng tải ảnh công trình và ít nhất 1 ảnh tham chiếu.");
            return;
        }
    }

    if (isPro && !(window as any).aistudio?.hasSelectedApiKey()) {
        try { await (window as any).aistudio?.openSelectKey(); } catch(e) {}
    }

    setIsSyncing(true);
    setResultImage(null);
    setActiveTab('results');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let parts: any[] = [];
        let finalPrompt = "";

        const supportedAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
        const validAspectRatio = supportedAspectRatios.includes(aspectRatio) ? aspectRatio : undefined;

        if (activeWay === 'way1') {
            const sourceImage = mergedImage || (images.length > 0 ? images[0] : null);
            if (!sourceImage) return;

            const b64 = await blobToBase64(sourceImage.file);
            parts.push({ inlineData: { data: b64, mimeType: sourceImage.file.type } });
            
            // Mandatory prefix from syncCount
            const mandatoryPrefix = `Ảnh đầu ra ${syncCount} ảnh trong 1 khung hình. giữ nguyên chi tiết ảnh gốc.`;
            finalPrompt = `${mandatoryPrefix}
${prompt || 'thực tế, sắc nét'}.
Nhiệm vụ: Đồng bộ bối cảnh và ánh sáng cho các công trình trong hình ảnh Storyboard này. 
Quy tắc: GIỮ NGUYÊN CHI TIẾT ảnh GỐC. ĐỒNG NHẤT ÁNH SÁNG, BỐI CẢNH cho toàn bộ khung hình. 
Xuất kết quả là ảnh thực tế 8K.`;
            
            if (aspectRatio !== 'Auto' && !validAspectRatio) {
                finalPrompt += `\nEnsure the final image has an aspect ratio of ${aspectRatio}.`;
            }
            
            parts.push({ text: finalPrompt });
        } else {
            const mainB64 = await blobToBase64(way2MainImage!.file);
            parts.push({ text: "MỤC 1 - ẢNH CÔNG TRÌNH GỐC CHÍNH (PHẢI GIỮ NGUYÊN HÌNH KHỐI TUYỆT ĐỐI):" });
            parts.push({ inlineData: { data: mainB64, mimeType: way2MainImage!.file.type } });

            const refParts = await Promise.all(way2RefImages.map(async (img, idx) => {
                const b64 = await blobToBase64(img.file);
                return [
                    { text: `MỤC 2 - ẢNH THAM CHIẾU BỐI CẢNH VÀ ÁNH SÁNG ${idx + 1}:` },
                    { inlineData: { data: b64, mimeType: img.file.type } }
                ];
            }));
            parts.push(...refParts.flat());

            const cameraPart = way2CameraAngle ? `${way2CameraAngle}` : "giữ nguyên phối cảnh";
            finalPrompt = `Ảnh thực tế công trình, ${cameraPart} công trình, bối cảnh và ánh sáng bám theo các ảnh tham khảo ở mục 2. Ảnh tham chiếu (Bối cảnh).
Yêu cầu kỹ thuật quan trọng nhất:
1. Giữ nguyên 100% hình khối, kiến trúc, tỷ lệ và mọi chi tiết của tòa nhà trong 'ẢNH CÔNG TRÌNH GỐC CHÍNH'. 
2. Chỉ thay thế môi trường xung quanh, bầu trời, cây cối, mặt đường và ánh sáng tổng thể sao cho đồng bộ hoàn hảo with các 'ẢNH THAM CHIẾU'.
3. Kết quả là ảnh thực tế 8K photorealistic, sắc nét cao.`;

            if (aspectRatio !== 'Auto' && !validAspectRatio) {
                finalPrompt += `\nEnsure the final image has an aspect ratio of ${aspectRatio}.`;
            }

            parts.push({ text: finalPrompt });
        }

        const response = await ai.models.generateContent({
            model: getModelName('image'),
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                ...( (isPro || validAspectRatio) ? {
                    imageConfig: {
                        ...(isPro ? { imageSize: proResolution === '4k' ? '4K' : '2K' } : {}),
                        ...(validAspectRatio ? { aspectRatio: validAspectRatio as any } : {})
                    }
                } : {})
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            const resUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            setResultImage(resUrl);
            setHistory(prev => [{
                id: Math.random().toString(36).substr(2, 9),
                inputs: activeWay === 'way1' ? (mergedImage ? [mergedImage.url] : images.map(img => img.url)) : [way2MainImage!.url, ...way2RefImages.map(img => img.url)],
                output: resUrl,
                prompt: activeWay === 'way1' ? prompt : way2CameraAngle,
                timestamp: Date.now(),
                mode: activeWay === 'way1' ? 'Cách 1: Storyboard Sync' : 'Cách 2: Tham chiếu bối cảnh'
            }, ...prev]);
        }
    } catch (error) {
        console.error("Sync Context Error:", error);
    } finally {
        setIsSyncing(false);
    }
  };

  const filteredAngles = cameraAngles.filter(angle => 
    angle.toLowerCase().includes(way2CameraAngle.toLowerCase())
  );

  return (
    <>
    {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
            <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
                <img src={zoomedImage} alt="Zoomed" className="max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10" />
                <div className="absolute top-4 right-4 flex gap-3">
                    <a href={zoomedImage} download={`F9-Sync-${Date.now()}.png`} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
                        <ArrowDownTrayIcon className="w-6 h-6" />
                    </a>
                    <button onClick={() => setZoomedImage(null)} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    )}

    <div className="flex flex-col h-full bg-[#282f3d]">
      <div className="flex flex-grow min-h-0">
        <aside className="w-full lg:w-[350px] bg-[#282f3d] flex flex-col border-r border-gray-800 p-4 gap-4 overflow-y-auto custom-scrollbar">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2">
            <ChevronLeftIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Quay lại Kho tiện ích</span>
          </button>

          <div className="flex bg-[#364053] p-1 rounded-lg">
            <button
              onClick={() => setActiveWay('way1')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                activeWay === 'way1' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cách 1
            </button>
            <button
              onClick={() => setActiveWay('way2')}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                activeWay === 'way2' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cách 2
            </button>
          </div>

          {activeWay === 'way1' ? (
            <>
              {/* 1. Tải ảnh lên */}
              <div className="space-y-3">
                <h2 className="font-bold text-white text-sm">1. Tải ảnh lên</h2>
                <div 
                  className="relative border border-dashed border-gray-600 rounded-md p-4 flex flex-col items-center justify-center text-center h-44 hover:border-orange-500/50 cursor-pointer bg-[#202633]/50 transition-all group overflow-hidden"
                  onClick={() => !isSyncing && fileInputRef.current?.click()}
                >
                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 w-full h-full">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded overflow-hidden border border-gray-700">
                          <img src={img.url} alt={`upload-${idx}`} className="w-full h-full object-cover" />
                          <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 hover:bg-red-500">
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                      <div className="p-2 bg-slate-700/30 rounded-lg mb-2"><PhotoIcon className="w-8 h-8" /></div>
                      <p className="text-[11px] leading-tight px-4 text-center">Kéo và thả hoặc nhấp để tải lên ( tải tối đa 4 ảnh )</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" multiple />
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#364053] hover:bg-[#475266] text-white font-bold py-2.5 rounded text-xs transition-colors uppercase tracking-widest"
                  >
                    Tải ảnh của bạn
                  </button>
                  <button 
                    disabled={isSyncing || images.length === 0 || isMergingImages} 
                    onClick={handleMergeImages} 
                    className="w-full bg-[#364053] hover:bg-[#475266] text-white font-bold py-2.5 rounded text-xs transition-colors disabled:opacity-50 uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {isMergingImages ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                    Gộp ảnh
                  </button>
                </div>
              </div>

              {/* 2. Ảnh đã gộp */}
              <div className="space-y-3">
                <h2 className="font-bold text-white text-sm">2. Ảnh đã gộp</h2>
                <div 
                  className="relative border border-dashed border-gray-600 rounded-md p-4 flex flex-col items-center justify-center text-center h-44 hover:border-orange-500/50 cursor-pointer bg-[#202633]/50 transition-all group overflow-hidden"
                  onClick={() => mergedImageInputRef.current?.click()}
                >
                  {mergedImage ? (
                    <>
                      <img src={mergedImage.url} alt="Merged Preview" className="max-h-full max-w-full object-contain rounded-md" />
                      <button onClick={(e) => { e.stopPropagation(); setMergedImage(null); }} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1">
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500">
                      <PhotoIcon className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-[10px] uppercase font-medium">Ảnh đã gộp</p>
                    </div>
                  )}
                </div>
                <input type="file" ref={mergedImageInputRef} onChange={handleMergedImageUpload} className="hidden" accept="image/*" />
                <button onClick={() => mergedImageInputRef.current?.click()} className="w-full bg-[#364053] hover:bg-[#475266] text-white font-bold py-2.5 rounded text-xs transition-colors uppercase tracking-widest">
                  Tải ảnh đã gộp của bạn
                </button>
              </div>

              {/* 3. Tỉ lệ khung hình */}
              <div className="space-y-2">
                  <FilterDropdown 
                      label="3. Tỉ lệ khung hình"
                      options={['Auto', '1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9']}
                      value={aspectRatio}
                      onChange={setAspectRatio}
                      placeholder="Auto"
                  />
              </div>

              <div className="space-y-2">
                <h2 className="font-bold text-white text-sm">Mô tả (Prompt)</h2>
                <div className="w-full bg-[#202633] border border-gray-700 rounded overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-orange-500">
                    <div className="p-3 bg-slate-800/50 border-b border-gray-700/50 text-[11px] text-orange-400 font-bold select-none italic leading-relaxed">
                        Ảnh đầu ra {syncCount} ảnh trong 1 khung hình. giữ nguyên chi tiết ảnh gốc.
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Nhập mô tả bạn muốn..."
                        className="w-full h-32 bg-transparent p-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none custom-scrollbar"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="font-bold text-white text-sm">Trạng thái đồng bộ</h2>
                <div className="bg-[#202633] rounded border border-gray-700 p-3 px-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs uppercase tracking-wider">Số lượng ảnh đầu ra:</span>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number"
                            min="0"
                            max="9"
                            value={syncCount}
                            onChange={(e) => setSyncCount(parseInt(e.target.value) || 0)}
                            className="w-16 bg-slate-800 border border-gray-600 text-white text-center font-bold rounded py-1 focus:outline-none focus:border-orange-500"
                        />
                        <span className="text-white text-sm">ảnh</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <button 
                    onClick={handleStartSync} 
                    disabled={isSyncing || (!mergedImage && images.length === 0)} 
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded flex items-center justify-center gap-2 transition-all shadow-lg disabled:bg-gray-700 disabled:cursor-not-allowed"
                >
                  {isSyncing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>ĐANG XỬ LÝ...</span></>
                  ) : (
                      <><SparklesIcon className="w-4 h-4" /><span className="uppercase tracking-widest text-xs">Bắt đầu đồng bộ</span></>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
                {/* Section 1: Main Architecture */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-white text-sm">1. Ảnh công trình (Gốc chính) <span className="text-red-500">*</span></h2>
                    </div>
                    <div 
                        className="relative border border-dashed border-gray-600 rounded-md p-2 flex flex-col items-center justify-center text-center h-44 hover:border-orange-500/50 cursor-pointer bg-[#202633]/50 transition-all overflow-hidden"
                        onClick={() => !isSyncing && way2MainInputRef.current?.click()}
                    >
                        {way2MainImage ? (
                            <>
                                <img src={way2MainImage.url} alt="Main" className="max-h-full max-w-full object-contain rounded-md" />
                                <button onClick={(e) => { e.stopPropagation(); setWay2MainImage(null); }} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1">
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500">
                                <PhotoIcon className="w-8 h-8 mb-2 opacity-30" />
                                <p className="text-[11px] font-medium">Tải ảnh công trình gốc</p>
                                <p className="text-[9px] text-gray-600">GIỮ NGUYÊN CHI TIẾT GỐC</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={way2MainInputRef} onChange={handleWay2MainUpload} className="hidden" accept="image/*" />
                </div>

                {/* Section 2: Reference Contexts (Up to 5) */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-white text-sm">2. Ảnh tham chiếu (Bối cảnh) <span className="text-red-500">*</span></h2>
                        <span className="text-[10px] text-gray-500 uppercase">{way2RefImages.length}/5</span>
                    </div>
                    
                    <div className="bg-[#202633]/50 border border-dashed border-gray-600 rounded-md p-2 min-h-[100px]">
                        <div className="grid grid-cols-4 gap-1.5">
                            {way2RefImages.map((img) => (
                                <div key={img.id} className="relative aspect-square rounded overflow-hidden border border-gray-700 bg-black/20">
                                    <img src={img.url} alt="Ref" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => removeWay2Ref(img.id)}
                                        className="absolute top-0.5 right-0.5 bg-red-600/80 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                                    >
                                        <XMarkIcon className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            ))}
                            {way2RefImages.length < 5 && (
                                <button 
                                    onClick={() => way2RefInputRef.current?.click()}
                                    className="aspect-square flex flex-col items-center justify-center bg-slate-800/50 rounded border border-dashed border-gray-600 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    <span className="text-lg">+</span>
                                    <span className="text-[7px] uppercase tracking-tighter">Thêm</span>
                                </button>
                            )}
                        </div>
                        {way2RefImages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-20 text-gray-600">
                                <p className="text-[10px] italic">Lấy bối cảnh from các ảnh này</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={way2RefInputRef} onChange={handleWay2RefUpload} className="hidden" accept="image/*" multiple />
                    
                    <div className="px-1">
                      <p className="text-[9px] text-orange-400 italic font-medium leading-tight">
                        * Chú ý: Nên tải ảnh tham chiếu có 1 ảnh góc chính diện nhìn đầy đủ tổng thể công trình
                      </p>
                    </div>
                </div>

                {/* Section 3: Aspect Ratio */}
                <div className="space-y-2 relative">
                    <FilterDropdown 
                        label="3. Tỉ lệ khung hình"
                        options={['Auto', '1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9']}
                        value={aspectRatio}
                        onChange={setAspectRatio}
                        placeholder="Auto"
                    />
                </div>

                {/* Section 4: Camera Angle Dropdown */}
                <div className="space-y-2 relative" ref={angleDropdownRef}>
                    <h2 className="font-bold text-white text-sm">4. Góc nhìn Camera</h2>
                    <div className={`flex items-center w-full bg-[#202633] border rounded transition-all ${isAngleDropdownOpen ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-700'}`}>
                        <input 
                            type="text" 
                            value={way2CameraAngle}
                            onChange={(e) => {
                                setWay2CameraAngle(e.target.value);
                                setIsAngleDropdownOpen(true);
                            }}
                            onFocus={() => setIsAngleDropdownOpen(true)}
                            placeholder="Chọn hoặc nhập góc nhìn..." 
                            className="w-full bg-transparent p-3 text-sm text-white placeholder-gray-600 focus:outline-none"
                        />
                    </div>
                    {isAngleDropdownOpen && filteredAngles.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#202633] border border-gray-700 rounded shadow-2xl max-h-64 overflow-y-auto custom-scrollbar animate-fade-in">
                            {filteredAngles.map((angle, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setWay2CameraAngle(angle);
                                        setIsAngleDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-3 text-[11px] text-gray-300 hover:bg-[#364053] hover:text-white transition-colors border-b border-gray-700/30 last:border-0"
                                >
                                    {angle}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* START SYNC BUTTON: Below Section 3 with prominent color */}
                <div className="pt-2">
                  <button 
                      onClick={handleStartSync} 
                      disabled={isSyncing || !way2MainImage || way2RefImages.length === 0} 
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded flex items-center justify-center gap-2 transition-all shadow-lg disabled:bg-gray-700 disabled:cursor-not-allowed"
                  >
                    {isSyncing ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>ĐANG XỬ LÝ...</span></>
                    ) : (
                        <><SparklesIcon className="w-4 h-4" /><span className="uppercase tracking-widest text-xs">Bắt đầu đồng bộ</span></>
                    )}
                  </button>
                </div>
            </div>
          )}
        </aside>

        <main className="flex-grow flex flex-col bg-[#202633]">
          <div className="flex border-b border-gray-800 px-6 pt-2 gap-8 flex-shrink-0 bg-[#282f3d]">
            <button onClick={() => setActiveTab('results')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Kết quả</button>
            <button onClick={() => setActiveTab('history')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Lịch sử</button>
          </div>

          <div className="flex-grow p-6 flex flex-col items-center justify-start relative overflow-y-auto custom-scrollbar">
            {activeTab === 'results' ? (
                resultImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center animate-fade-in group">
                        <div className="relative max-w-full max-h-full bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-gray-800">
                            <img src={resultImage} alt="Result" className="max-h-[75vh] w-auto object-contain" />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full px-6 border border-white/10 shadow-2xl">
                                <button onClick={() => setZoomedImage(resultImage)} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to"><MagnifyingGlassPlusIcon className="w-6 h-6" /></button>
                                <div className="w-px h-8 bg-white/20"></div>
                                <button 
                                    onClick={() => onEdit?.(resultImage)} 
                                    className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" 
                                    title="Chỉnh sửa ảnh"
                                >
                                    <SparklesIcon className="w-6 h-6" />
                                </button>
                                <div className="w-px h-8 bg-white/20"></div>
                                <a href={resultImage} download={`Sync-${Date.now()}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống"><ArrowDownTrayIcon className="w-6 h-6" /></a>
                            </div>
                        </div>
                    </div>
                ) : isSyncing ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center gap-6 animate-fade-in">
                        <div className="relative w-32 h-32">
                            <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center"><MapIcon className="w-12 h-12 text-orange-500 animate-pulse" /></div>
                        </div>
                        <h3 className="text-white font-bold text-xl uppercase tracking-widest">Đang đồng bộ bao cảnh...</h3>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 animate-fade-in opacity-50">
                        <div className="w-28 h-28 rounded-full bg-slate-800/30 border border-slate-700/50 flex items-center justify-center text-gray-600 shadow-inner"><MapIcon className="w-14 h-14 opacity-20" /></div>
                        <div className="space-y-2">
                            <h3 className="text-gray-400 font-bold text-lg">Chưa có kết quả</h3>
                            <p className="text-gray-600 text-xs max-w-sm leading-relaxed">
                                {activeWay === 'way1' 
                                    ? 'Tải lên các góc chụp của công trình để ghép grid đồng bộ.' 
                                    : 'Tải ảnh công trình gốc và các ảnh tham chiếu bối cảnh mong muốn.'
                                }
                            </p>
                        </div>
                    </div>
                )
            ) : (
                <div className="w-full flex flex-col gap-6">
                    {history.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-gray-600 text-sm italic">Lịch sử trống</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {paginatedHistory.map((item) => (
                                    <div key={item.id} className="bg-[#282f3d] p-4 rounded-xl border border-gray-800 space-y-4 shadow-lg group">
                                        <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-xs uppercase tracking-wider text-orange-400">{item.mode}</span>
                                                <span className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="relative aspect-video rounded overflow-hidden bg-black/40 border border-gray-700">
                                            <img src={item.output} alt="history" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                <button onClick={() => setZoomedImage(item.output)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md"><MagnifyingGlassPlusIcon className="w-6 h-6" /></button>
                                                <a href={item.output} download={`sync-history-${item.id}.png`} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md"><ArrowDownTrayIcon className="w-6 h-6" /></a>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-2">
                                            {item.inputs.map((url, idx) => (
                                                <img key={idx} src={url} className="w-10 h-10 rounded object-cover border border-gray-700 opacity-50" alt="input thumb" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        </>
                    )}
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default SyncContext;
