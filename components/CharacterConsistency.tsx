import React, { useState, useRef } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { RectangleGroupIcon } from './icons/RectangleGroupIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { useMode } from '../contexts/ModeContext';
import { apiClient, getImageSizeConfig } from '../lib/api';
import Pagination from './Pagination';
import ImageMaskEditor from './ImageMaskEditor';

interface CharacterConsistencyProps {
  onBack: () => void;
}

interface BackgroundImage {
    id: string;
    url: string;
    file: File;
    mask?: string; // Base64 mask data
}

interface CharacterImage {
    id: string;
    url: string;
    file: File;
}

interface HistoryItem {
    id: string;
    characterUrls: string[];
    backgroundUrl: string;
    resultUrl: string;
    prompt: string;
    timestamp: number;
}

const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error("Invalid data URL");
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const CharacterConsistency: React.FC<CharacterConsistencyProps> = ({ onBack }) => {
  const { getModelName, isPro, proResolution } = useMode();
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  
  // State for inputs
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImage[]>([]);
  const [selectedBackgroundIds, setSelectedBackgroundIds] = useState<string[]>([]);
  
  const [characterImages, setCharacterImages] = useState<CharacterImage[]>([]);
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [actionPrompt, setActionPrompt] = useState('');
  
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  
  const [generatedResults, setGeneratedResults] = useState<string[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [editingBackgroundImage, setEditingBackgroundImage] = useState<BackgroundImage | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
  const paginatedHistory = history.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const inputFileInputRef = useRef<HTMLInputElement>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);

  const handleInputImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newImages = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file as Blob),
        file: file as File
      }));
      setBackgroundImages(prev => [...prev, ...newImages]);
      setSelectedBackgroundIds(prev => [...prev, ...newImages.map(img => img.id)]);
    }
    if (event.target) event.target.value = '';
  };

  const removeBackgroundImage = (id: string) => {
    setBackgroundImages(prev => {
        const img = prev.find(i => i.id === id);
        if (img) URL.revokeObjectURL(img.url);
        return prev.filter(i => i.id !== id);
    });
    setSelectedBackgroundIds(prev => prev.filter(i => i !== id));
  };

  const handleCharacterImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const currentCount = characterImages.length;
      const remaining = 5 - currentCount;
      if (remaining <= 0) {
        alert("Bạn đã đạt giới hạn tối đa 5 ảnh nhân vật.");
        return;
      }

      const filesToProcess = Array.from(files).slice(0, remaining);
      const newImages = filesToProcess.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        // FIX: Cast 'file' to 'Blob' to resolve 'unknown' type error when calling URL.createObjectURL.
        url: URL.createObjectURL(file as Blob),
        file: file as File
      }));
      setCharacterImages(prev => [...prev, ...newImages]);
    }
    if (event.target) event.target.value = '';
  };

  const removeCharacterImage = (id: string) => {
    setCharacterImages(prev => {
        const img = prev.find(i => i.id === id);
        if (img) URL.revokeObjectURL(img.url);
        return prev.filter(i => i.id !== id);
    });
  };

  const toggleBackgroundSelection = (id: string) => {
    setSelectedBackgroundIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveMask = (maskBase64: string) => {
    if (editingBackgroundImage) {
        setBackgroundImages(prev => prev.map(img => 
            img.id === editingBackgroundImage.id ? { ...img, mask: maskBase64 } : img
        ));
        setEditingBackgroundImage(null);
    }
  };

  const handleGenerateCharacter = async () => {
    if (!characterPrompt.trim()) {
        alert("Vui lòng nhập mô tả nhân vật.");
        return;
    }

    if (characterImages.length >= 5) {
        alert("Đã đạt giới hạn 5 ảnh nhân vật.");
        return;
    }

    setIsGeneratingCharacter(true);
    try {
        
        let prompt = characterPrompt;
        if (isPro) {
            prompt += " Output resolution 4K, highly detailed, photorealistic character on white background.";
        } else {
            prompt += " Character on simple background.";
        }

        const response = await apiClient.generateContent({
            model: getModelName('image'),
            contents: { parts: [{ text: prompt }] },
            config: { 
                responseModalities: ['IMAGE'],
                ...getImageSizeConfig(isPro, proResolution)
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            const base64 = imagePart.inlineData.data;
            const mimeType = imagePart.inlineData.mimeType;
            const url = `data:${mimeType};base64,${base64}`;
            const file = dataURLtoFile(url, `generated-character-${Date.now()}.png`);
            
            setCharacterImages(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                url,
                file
            }]);
        } else {
            throw new Error("API returned no image data.");
        }
    } catch (error: any) {
        console.error("Error generating character:", error);
        alert("Thất bại khi tạo nhân vật.");
    } finally {
        setIsGeneratingCharacter(false);
    }
  };

  const handleMergeCharacter = async () => {
    if (characterImages.length === 0) {
        alert("Vui lòng tải lên ít nhất một ảnh nhân vật tham chiếu.");
        return;
    }
    if (selectedBackgroundIds.length === 0) {
        alert("Vui lòng chọn ít nhất một ảnh bối cảnh.");
        return;
    }
    if (!actionPrompt.trim()) {
        alert("Vui lòng nhập mô tả hành động/tư thế.");
        return;
    }

    setIsMerging(true);
    setGeneratedResults([]);
    setActiveTab('results');

    try {
        
        // 1. CHUẨN BỊ TẤT CẢ NHÂN VẬT THAM CHIẾU (NHẬN DIỆN CÙNG LÚC TỐI ĐA 5 ẢNH)
        const characterParts = await Promise.all(characterImages.map(async (img, idx) => {
            const b64 = await blobToBase64(img.file);
            return [
                { text: `Character Reference Profile ${idx + 1}:` },
                { inlineData: { data: b64, mimeType: img.file.type } }
            ];
        })).then(results => results.flat());

        for (const bgId of selectedBackgroundIds) {
            const bgImage = backgroundImages.find(img => img.id === bgId);
            if (!bgImage) continue;

            const bgBase64 = await blobToBase64(bgImage.file);

            // 2. XÂY DỰNG PROMPT THÔNG MINH KẾT HỢP HÀNH ĐỘNG
            let mergePrompt = `Bạn là chuyên gia xử lý hình ảnh AI cao cấp. 
Nhiệm vụ: Phân tích TẤT CẢ các ảnh tham chiếu nhân vật được cung cấp (tổng cộng ${characterImages.length} ảnh) để trích xuất các đặc điểm nhận dạng cốt lõi (khuôn mặt, kiểu tóc, trang phục, tỷ lệ cơ thể). 

YÊU CẦU QUAN TRỌNG:
1. [Đồng nhất nhân vật]: Sử dụng tất cả dữ liệu từ các ảnh tham chiếu để tạo ra MỘT nhân vật duy nhất (hoặc nhóm nhân vật nếu ảnh tham chiếu khác nhau) có độ tương đồng 100% về ngoại hình.
2. [Hành động & Tư thế]: Nhân vật PHẢI được đặt vào 'Background Scene' và thực hiện hành động này: "${actionPrompt}". 
3. [Tương tác vật lý]: Tư thế phải tự nhiên, tương tác đúng với các đồ vật trong bối cảnh (ngồi lên ghế, đứng trên sàn, tay chạm vào bàn...).
4. [Hòa nhập môi trường]: Áp dụng ánh sáng, bóng đổ và phối cảnh của ảnh bối cảnh lên nhân vật để tạo cảm giác nhân vật thực sự ở đó.
5. [Vùng chỉ định]: Nếu có 'Placement Mask', hãy ưu tiên đặt nhân vật vào vùng Cyan.
6. [Bảo toàn bối cảnh]: Giữ nguyên cấu trúc của ảnh bối cảnh gốc, chỉ thêm nhân vật vào.

KẾT QUẢ: Một bức ảnh siêu thực (photorealistic), chất lượng 8K, độ chi tiết cực cao.`;

            const parts: any[] = [
                ...characterParts,
                { text: "Đây là các dữ liệu tham chiếu nhân vật. Hãy ghi nhớ mọi chi tiết." },
                { text: "Background Scene (Bối cảnh đích):" },
                { inlineData: { data: bgBase64, mimeType: bgImage.file.type } }
            ];

            if (bgImage.mask) {
                parts.push({ text: "Placement Mask (Vùng chỉ định vị trí):" });
                parts.push({ inlineData: { data: bgImage.mask.split(',')[1], mimeType: 'image/png' } });
            }

            parts.push({ text: mergePrompt });

            try {
                const response = await apiClient.generateContent({
                    model: getModelName('image'),
                    contents: { parts },
                    config: { 
                        responseModalities: ['IMAGE'],
                        ...getImageSizeConfig(isPro, proResolution)
                    },
                });

                const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
                if (imagePart && imagePart.inlineData) {
                    const resultUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    setGeneratedResults(prev => [...prev, resultUrl]);

                    setHistory(prev => [{
                        id: Math.random().toString(36).substr(2, 9),
                        characterUrls: characterImages.map(img => img.url),
                        backgroundUrl: bgImage.url,
                        resultUrl: resultUrl,
                        prompt: actionPrompt,
                        timestamp: Date.now()
                    }, ...prev]);

                    setCurrentPage(1);
                }
            } catch (err) {
                console.error(`Failed to merge for background ${bgId}`, err);
            }
        }

    } catch (error) {
        console.error("Error merging character:", error);
        alert("Đã xảy ra lỗi trong quá trình xử lý.");
    } finally {
        setIsMerging(false);
    }
  };

  return (
    <>
    {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[10000] p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
            <img 
                src={zoomedImage} 
                alt="Zoomed view" 
                className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" 
                onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex items-center gap-3 z-[10001]">
                <a href={zoomedImage} download={`[F9render.com]_merged-${Date.now()}.png`} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <ArrowDownTrayIcon className="w-6 h-6" />
                </a>
                <button onClick={() => setZoomedImage(null)} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    )}

    {editingBackgroundImage && (
        <ImageMaskEditor 
            imageUrl={editingBackgroundImage.url}
            onClose={() => setEditingBackgroundImage(null)}
            onSave={handleSaveMask}
        />
    )}

    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)]">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
        
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 group"
        >
          <div className="p-1 rounded-full group-hover:bg-slate-700">
            <ChevronLeftIcon className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">Quay lại Kho tiện ích</span>
        </button>

        {/* 1. Upload Background */}
        <div className="space-y-2">
          <h2 className="font-bold text-white text-base">1. Tải ảnh bối cảnh</h2>
          
          {backgroundImages.length === 0 ? (
            <div 
                className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
                onClick={() => inputFileInputRef.current?.click()}
            >
                <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400">
                    <div className="p-3 bg-slate-700/50 rounded-full mb-3">
                        <PhotoIcon className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-medium">Kéo và thả hoặc nhấp để tải lên</p>
                </div>
            </div>
          ) : (
            <div className="bg-slate-800 p-3 rounded-lg max-h-48 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-3 gap-2">
                    {backgroundImages.map((img) => (
                        <div key={img.id} className="relative aspect-square group rounded-md overflow-hidden border border-gray-600">
                            <img src={img.url} alt="Uploaded" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <button 
                                    onClick={() => setEditingBackgroundImage(img)}
                                    className="p-1.5 bg-blue-600/80 text-white rounded-full hover:bg-blue-500 transition-colors"
                                    title="Chỉnh sửa vùng vẽ"
                                >
                                    <MagnifyingGlassPlusIcon className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => removeBackgroundImage(img.id)}
                                    className="p-1.5 bg-red-600/80 text-white rounded-full hover:bg-red-500 transition-colors"
                                    title="Xóa"
                                >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {img.mask && (
                                <div className="absolute top-1 left-1 bg-cyan-500 text-[8px] font-bold text-white px-1 rounded shadow-sm">MASK</div>
                            )}
                        </div>
                    ))}
                    <button 
                        onClick={() => inputFileInputRef.current?.click()}
                        className="aspect-square flex items-center justify-center bg-slate-700/50 rounded-md hover:bg-slate-700 border border-dashed border-gray-500 text-gray-400 hover:text-white transition-colors"
                    >
                        <span className="text-2xl">+</span>
                    </button>
                </div>
            </div>
          )}
          
          <input type="file" ref={inputFileInputRef} onChange={handleInputImageUpload} className="hidden" accept="image/*" multiple />
          {backgroundImages.length === 0 && (
            <button 
                onClick={() => inputFileInputRef.current?.click()}
                className="w-full bg-[#364053] hover:bg-[#475266] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
                Tải ảnh của bạn
            </button>
          )}
        </div>

        {/* 2. Add Character - Multi image support */}
        <div className="space-y-3">
          <h2 className="font-bold text-white text-base flex justify-between items-center">
            2. Thêm nhân vật
            <span className="text-[10px] font-normal text-gray-500 uppercase">Tối đa 5 ảnh</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            <div 
                className="relative border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-center h-32 hover:border-blue-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
                onClick={() => characterFileInputRef.current?.click()}
            >
                {characterImages.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1 w-full h-full p-1 overflow-y-auto custom-scrollbar">
                        {characterImages.map((img) => (
                            <div key={img.id} className="relative aspect-square rounded overflow-hidden border border-gray-700">
                                <img src={img.url} alt="Character" className="w-full h-full object-cover" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeCharacterImage(img.id); }} 
                                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ))}
                        {characterImages.length < 5 && (
                            <div className="aspect-square flex items-center justify-center bg-slate-700/30 rounded text-gray-500">
                                <span className="text-lg">+</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-gray-500 px-2">
                        {isGeneratingCharacter ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-1"></div>
                        ) : (
                            <PhotoIcon className="w-6 h-6 mb-1" />
                        )}
                        <p className="text-[10px] leading-tight">
                            {isGeneratingCharacter ? 'Đang tạo...' : 'Kéo thả, dán, hoặc nhấp để tải lên'}
                        </p>
                    </div>
                )}
                <input type="file" ref={characterFileInputRef} onChange={handleCharacterImageUpload} className="hidden" accept="image/*" multiple />
            </div>

            <textarea
                value={characterPrompt}
                onChange={(e) => setCharacterPrompt(e.target.value)}
                placeholder="Prompt nhân vật bạn muốn tạo thêm..."
                className="w-full h-32 bg-[#364053] border border-gray-600 rounded-lg p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button 
                onClick={() => characterFileInputRef.current?.click()}
                disabled={characterImages.length >= 5}
                className="w-full bg-[#364053] hover:bg-[#475266] text-white font-medium py-2 rounded-lg transition-colors text-xs disabled:opacity-50"
             >
                Tải ảnh nhân vật
             </button>
             <button 
                onClick={handleGenerateCharacter}
                disabled={isGeneratingCharacter || !characterPrompt.trim() || characterImages.length >= 5}
                className="w-full bg-[#364053] hover:bg-[#475266] text-white font-medium py-2 rounded-lg transition-colors text-xs disabled:opacity-50"
             >
                {isGeneratingCharacter ? 'Đang tạo...' : 'Tự tạo nhân vật'}
             </button>
          </div>

          <p className="text-[11px] text-yellow-500 italic mt-1">
            * Chú ý: AI nhận diện diện mạo dựa trên TẤT CẢ các ảnh tải lên. Có thể dùng nhiều góc độ của cùng 1 người để tăng độ chính xác.
          </p>
        </div>

        {backgroundImages.length > 0 && characterImages.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-700">
                <h2 className="font-bold text-white text-sm">Chọn bối cảnh</h2>
                <div className="bg-[#364053] rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        {backgroundImages.map((img, idx) => (
                            <label key={img.id} className="flex items-center gap-3 p-1.5 hover:bg-slate-700 rounded cursor-pointer transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={selectedBackgroundIds.includes(img.id)} 
                                    onChange={() => toggleBackgroundSelection(img.id)}
                                    className="w-4 h-4 rounded border-gray-500 text-orange-500 focus:ring-orange-500 bg-gray-700"
                                />
                                <img src={img.url} alt="thumb" className="w-8 h-8 rounded object-cover bg-black" />
                                <span className="text-xs text-gray-300">Ảnh {idx + 1} {img.mask ? '(Đã khoanh vùng)' : ''}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <div className="space-y-2">
            <h2 className="font-bold text-white text-sm">Mô tả hành động/tư thế (Prompt)</h2>
            <textarea
                value={actionPrompt}
                onChange={(e) => setActionPrompt(e.target.value)}
                placeholder="Ví dụ: Cô ấy đang ngồi thư giãn trên ghế sofa màu kem, hướng mắt nhìn ra cửa sổ..."
                className="w-full h-24 bg-[#364053] border border-gray-600 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
        </div>

        <div className="mt-auto pt-2">
          <button 
            onClick={handleMergeCharacter}
            disabled={isMerging || characterImages.length === 0 || selectedBackgroundIds.length === 0 || !actionPrompt.trim()}
            className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg uppercase tracking-wide text-sm disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isMerging ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    Đang ghép...
                </>
            ) : (
                "Ghép nhân vật vào ảnh (Adding characters to photos)"
            )}
          </button>
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
            <div className="w-full h-full">
                {isMerging && generatedResults.length === 0 ? (
                    <div className="w-full h-full bg-[#202633] rounded-xl border border-gray-700/50 flex flex-col items-center justify-center">
                        <div className="relative w-20 h-20 mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-orange-500/30"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                        </div>
                        <p className="text-gray-300 animate-pulse font-medium">AI đang đồng bộ {characterImages.length} tham chiếu và thực hiện hành động...</p>
                    </div>
                ) : generatedResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generatedResults.map((resUrl, index) => (
                            <div key={index} className="relative group bg-black/20 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-gray-700 hover:border-orange-500/50 transition-colors">
                                <img src={resUrl} alt={`Merged Result ${index + 1}`} className="w-full h-full object-contain" />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full px-4">
                                    <button onClick={() => setZoomedImage(resUrl)} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                        <MagnifyingGlassPlusIcon className="w-6 h-6" />
                                    </button>
                                    <div className="w-px h-6 bg-white/20"></div>
                                    <a href={resUrl} download={`[F9render]_merged-${index}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                        <ArrowDownTrayIcon className="w-6 h-6" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full bg-[#202633] rounded-xl border border-gray-700/50 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-slate-700/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <RectangleGroupIcon className="w-10 h-10 text-gray-600" />
                            </div>
                            <h3 className="text-gray-400 font-semibold text-lg mb-2">Chưa có kết quả</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                Tải ảnh bối cảnh, tải tối đa 5 ảnh nhân vật và nhấn "Ghép nhân vật vào ảnh".
                            </p>
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
                {history.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                        <p>Chưa có lịch sử</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar flex-grow content-start pr-2">
                            {paginatedHistory.map((item) => (
                                <div key={item.id} className="bg-[#202633] p-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors group">
                                    <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                                        <img src={item.resultUrl} alt="Result" className="w-full h-full object-contain bg-black/20" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                             <button onClick={() => setZoomedImage(item.resultUrl)} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                                <MagnifyingGlassPlusIcon className="w-5 h-5" />
                                            </button>
                                            <a href={item.resultUrl} download={`merged-${item.timestamp}.png`} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                                <ArrowDownTrayIcon className="w-5 h-5" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex -space-x-2 overflow-hidden flex-shrink-0">
                                            {item.characterUrls.slice(0, 3).map((url, i) => (
                                                <img key={i} src={url} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#202633] object-cover bg-white" title={`Character ${i+1}`} />
                                            ))}
                                            {item.characterUrls.length > 3 && (
                                                <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 ring-2 ring-[#202633] text-[8px] font-bold text-white">
                                                    +{item.characterUrls.length - 3}
                                                </div>
                                            )}
                                            <img src={item.backgroundUrl} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#202633] object-cover bg-white" title="Background" />
                                        </div>
                                        <p className="text-xs text-gray-400 truncate flex-1" title={item.prompt}>{item.prompt}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex-shrink-0">
                             <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
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

export default CharacterConsistency;