import React, { useState, useRef } from 'react';
import { apiClient, getImageSizeConfig } from '../lib/api';
import { useLanguage } from '../hooks/useLanguage';
import { saveHistory, getHistory, deleteHistoryItem as dbDeleteHistoryItem, HistoryRecord } from '../lib/db';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ClockIcon } from './icons/ClockIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ExteriorViewSuggestionsProps {
  onBack: () => void;
}

interface GeneratedView {
  id: string;
  name: string;
  group: string;
  url: string;
  prompt: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  inputImage: string; // base64
  aspectRatio: string;
  results: GeneratedView[];
}

interface CharacterImage {
  id: string;
  url: string;
  file: File;
}

const VIEW_GROUPS = [
  {
    name: 'I. Nhóm Toàn cảnh (Wide Shots)',
    nameEn: 'I. Wide Shots Group',
    views: [
      { 
        id: 'wide-1', 
        name: 'Toàn cảnh 1 (Bình minh)', 
        nameEn: 'Wide Shot 1 (Sunrise)', 
        prompt: 'Wide-angle lens, clear morning light, soft morning mist, peaceful and serene atmosphere, fresh colors. High resolution 8K, photorealistic architectural photography.' 
      },
      { 
        id: 'wide-2', 
        name: 'Toàn cảnh 2 (Hoàng hôn)', 
        nameEn: 'Wide Shot 2 (Sunset)', 
        prompt: 'Wide-angle lens, vibrant golden hour lighting, orange and purple clouds in the sky, dramatic long shadows, warm and emotional atmosphere. High resolution 8K, photorealistic architectural photography.' 
      },
    ]
  },
  {
    name: 'II. Nhóm Trung cảnh (Medium Shots)',
    nameEn: 'II. Medium Shots Group',
    views: [
      { 
        id: 'medium-1', 
        name: 'Trung cảnh 1 (Góc chính diện)', 
        nameEn: 'Medium Shot 1 (Frontal View)', 
        prompt: 'Eye-level frontal view, balanced composition, clear view of the main facade. High resolution 8K, photorealistic architectural photography.' 
      },
      { 
        id: 'medium-2', 
        name: 'Trung cảnh 2 (Góc 3/4 bên trái)', 
        nameEn: 'Medium Shot 2 (3/4 Left View)', 
        prompt: '3/4 perspective view from the left side, showing depth and the relationship between front and side facades. High resolution 8K, photorealistic architectural photography.' 
      },
      { 
        id: 'medium-3', 
        name: 'Trung cảnh 3 (Góc 3/4 bên phải)', 
        nameEn: 'Medium Shot 3 (3/4 Right View)', 
        prompt: '3/4 perspective view from the right side, showing depth and the relationship between front and side facades. High resolution 8K, photorealistic architectural photography.' 
      },
      { 
        id: 'medium-4', 
        name: 'Trung cảnh 4 (Lối vào chính)', 
        nameEn: 'Medium Shot 4 (Main Entrance)', 
        prompt: 'Medium shot focusing on the main entrance and lobby area, inviting perspective, clear view of the transition between outside and inside. High resolution 8K, photorealistic architectural photography.' 
      },
      { 
        id: 'medium-5', 
        name: 'Trung cảnh 5 (Chi tiết kiến trúc)', 
        nameEn: 'Medium Shot 5 (Architectural Detail)', 
        prompt: 'Medium-close shot focusing on a specific architectural feature or material intersection. High resolution 8K, photorealistic architectural photography.' 
      },
    ]
  },
  {
    name: 'III. Nhóm Nghệ thuật (Artistic Shots)',
    nameEn: 'III. Artistic Shots Group',
    views: [
      { 
        id: 'art-1', 
        name: 'Nghệ thuật 1 (Xóa phông tiền cảnh)', 
        nameEn: 'Artistic 1 (Foreground Blur)', 
        prompt: 'Artistic composition with shallow depth of field. Foreground objects like leaves or a character are softly blurred, while the building remains perfectly sharp in the background. Cinematic feel. High resolution 8K, photorealistic architectural photography.' 
      },
      { 
        id: 'art-2', 
        name: 'Nghệ thuật 2 (Phối cảnh đêm)', 
        nameEn: 'Artistic 2 (Night Perspective)', 
        prompt: 'Night perspective with glowing interior and exterior lighting. Warm lights contrasting with the deep blue or black night sky. Sparkling and magical atmosphere. High resolution 8K, photorealistic architectural photography.' 
      },
      { 
        id: 'art-3', 
        name: 'Nghệ thuật 3 (Phản chiếu)', 
        nameEn: 'Artistic 3 (Reflection)', 
        prompt: 'Artistic shot focusing on reflections of the building on glass or water surfaces. Symmetrical or abstract composition. High resolution 8K, photorealistic architectural photography.' 
      },
    ]
  },
  {
    name: 'IV. Nhóm Ngước nhìn (Upward Angle)',
    nameEn: 'IV. Upward Angle Group',
    views: [
      { 
        id: 'upward-1', 
        name: 'Ngước nhìn từ dưới lên', 
        nameEn: 'Low-angle Upward Shot', 
        prompt: 'Dramatic low-angle shot looking up at the building, emphasizing height, scale, and grandeur. High resolution 8K, photorealistic architectural photography.' 
      },
    ]
  },
  {
    name: 'V. Nhóm Drone (Drone Angle)',
    nameEn: 'V. Drone Angle Group',
    views: [
      { 
        id: 'drone-1', 
        name: 'Drone (Cao & bên hông)', 
        nameEn: 'High Drone Side View', 
        prompt: 'High altitude drone view from a side perspective, showing the building in its urban or natural context. High resolution 8K, photorealistic architectural photography.' 
      },
    ]
  }
];

const ExteriorViewSuggestions: React.FC<ExteriorViewSuggestionsProps> = ({ onBack }) => {
  const { locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<'result' | 'history'>('result');
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [characterImages, setCharacterImages] = useState<CharacterImage[]>([]);
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [results, setResults] = useState<GeneratedView[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const characterInputRef = useRef<HTMLInputElement>(null);

  // Load history from IndexedDB
  React.useEffect(() => {
    const loadHistory = async () => {
      try {
        const allHistory = await getHistory();
        const exteriorHistory = allHistory
          .filter(record => record.page === 'exterior_view_suggestions')
          .map(record => ({
            id: record.id,
            timestamp: record.timestamp,
            inputImage: record.inputImage,
            aspectRatio: record.config?.aspectRatio || 'Auto',
            results: record.config?.results || []
          }));
        setHistory(exteriorHistory);
      } catch (e) {
        console.error('Failed to load history', e);
      }
    };
    loadHistory();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<{ url: string; file: File } | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setter({ url, file });
    }
    if (e.target) e.target.value = '';
  };

  const handleCharacterImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const currentCount = characterImages.length;
      const remaining = 5 - currentCount;
      if (remaining <= 0) {
        alert(locale === 'vi' ? "Bạn đã đạt giới hạn tối đa 5 ảnh nhân vật." : "You have reached the limit of 5 character images.");
        return;
      }

      const filesToProcess = Array.from(files).slice(0, remaining);
      const newImages = filesToProcess.map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file as Blob),
        file: file as File
      }));
      setCharacterImages(prev => [...prev, ...newImages]);
    }
    if (e.target) e.target.value = '';
  };

  const removeCharacterImage = (id: string) => {
    setCharacterImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleGenerateCharacter = async () => {
    if (!characterPrompt.trim()) {
      alert(locale === 'vi' ? "Vui lòng nhập mô tả nhân vật." : "Please enter a character description.");
      return;
    }

    if (characterImages.length >= 5) {
      alert(locale === 'vi' ? "Đã đạt giới hạn 5 ảnh nhân vật." : "Reached limit of 5 character images.");
      return;
    }

    setIsGeneratingCharacter(true);
    try {
      
      let prompt = characterPrompt;
      prompt += " Character on simple background, highly detailed, photorealistic.";

      const response = await apiClient.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { 
          responseModalities: ['IMAGE'],
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
      if (imagePart && imagePart.inlineData) {
        const base64 = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType;
        const url = `data:${mimeType};base64,${base64}`;
        
        // Convert base64 to File
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const file = new File([u8arr], `generated-character-${Date.now()}.png`, { type: mime });
        
        setCharacterImages(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          url,
          file
        }]);
      } else {
        throw new Error("API returned no image data.");
      }
    } catch (error: unknown) {
      console.error("Error generating character:", error);
      alert(locale === 'vi' ? "Thất bại khi tạo nhân vật." : "Failed to generate character.");
    } finally {
      setIsGeneratingCharacter(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleGenerate = async () => {
    if (!inputImage) {
      alert(locale === 'vi' ? 'Vui lòng tải lên ảnh công trình.' : 'Please upload a building image.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setResults([]);
    setError(null);

    try {
      const inputBase64 = await blobToBase64(inputImage.file);
      
      const characterParts: any[] = [];
      if (characterImages.length > 0) {
        for (const img of characterImages) {
          const b64 = await blobToBase64(img.file);
          characterParts.push({ text: "Character Reference:" });
          characterParts.push({ inlineData: { data: b64, mimeType: img.file.type } });
        }
      }

      const totalViews = VIEW_GROUPS.reduce((acc, group) => acc + group.views.length, 0);
      let completedViews = 0;

      const allViews: GeneratedView[] = [];

      for (const group of VIEW_GROUPS) {
        for (const view of group.views) {
          try {
            const promptParts: any[] = [
              {
                inlineData: {
                  data: inputBase64,
                  mimeType: inputImage.file.type,
                },
              },
              ...characterParts
            ];

            const systemInstruction = `You are a professional architectural photographer and AI rendering expert.
Your task is to generate a specific camera angle for the provided architectural building image.

STRICT RULES:
1. ARCHITECTURAL INTEGRITY: Maintain 100% of the building's architectural details, shapes, materials, and structure from the original image.
2. NO CREATIVITY: Do NOT add new windows, columns, or change the roof. Do NOT invent new architectural elements.
3. PHOTOGRAPHY ONLY: You are only allowed to change the camera angle, focal length, and lighting conditions.
4. QUALITY: The output must be photorealistic, 8K resolution, and absolutely sharp.

${characterImages.length > 0 ? `
CHARACTER INTEGRATION:
- Analyze the character's features (face, hair, skin, style, outfit) from the provided character reference images (total ${characterImages.length} images).
- Maintain 100% identity consistency. The character must be the same person as shown in the reference images.
- Integrate this specific character naturally into the scene (e.g., walking in front of the lobby, standing on a balcony, or walking in the garden).
- Ensure the character's appearance is consistent with the provided images.
- The character provides scale and life to the architectural space.
- The character should be performing an action suitable for the view.
` : ''}

TARGET VIEW: ${view.prompt}`;

            promptParts.push({ text: systemInstruction });

            const response = await apiClient.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: promptParts },
              config: {
                responseModalities: ['IMAGE'],
                ...(aspectRatio !== 'Auto' ? { imageConfig: { aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9" } } : {})
              },
            });

            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart && imagePart.inlineData) {
              const base64 = imagePart.inlineData.data;
              const mimeType = imagePart.inlineData.mimeType;
              const url = `data:${mimeType};base64,${base64}`;
              
              const newView: GeneratedView = {
                id: view.id,
                name: locale === 'vi' ? view.name : view.nameEn,
                group: locale === 'vi' ? group.name : group.nameEn,
                url: url,
                prompt: view.prompt
              };
              
              allViews.push(newView);
              setResults([...allViews]);
            }
          } catch (err) {
            console.error(`Error generating view ${view.id}:`, err);
          }
          
          completedViews++;
          setGenerationProgress(Math.round((completedViews / totalViews) * 100));
        }
      }

      if (allViews.length === 0) {
        throw new Error('Failed to generate any views.');
      }

      // Save to history (IndexedDB)
      const historyRecord: HistoryRecord = {
        id: Date.now().toString(),
        page: 'exterior_view_suggestions',
        inputImage: inputBase64,
        outputImages: allViews.map(v => v.url),
        prompt: 'Exterior View Suggestions',
        timestamp: Date.now(),
        config: {
          aspectRatio,
          results: allViews
        }
      };

      await saveHistory(historyRecord);
      
      // Update local state
      const newHistoryItem: HistoryItem = {
        id: historyRecord.id,
        timestamp: historyRecord.timestamp,
        inputImage: historyRecord.inputImage,
        aspectRatio,
        results: allViews
      };
      setHistory(prev => [newHistoryItem, ...prev]);

    } catch (err: unknown) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await dbDeleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      console.error('Failed to delete history item', e);
    }
  };

  const viewHistoryItem = (item: HistoryItem) => {
    setResults(item.results);
    setAspectRatio(item.aspectRatio);
    setActiveTab('result');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1f2b] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-800 bg-[#202633]">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors mr-4"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold uppercase tracking-wider">
          {locale === 'vi' ? 'Quay lại Kho Tiện ích khác' : 'Return to Other Utilities'}
        </h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 lg:w-96 bg-[#202633] border-r border-gray-800 flex flex-col p-6 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Input Image */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-tight">
              {locale === 'vi' ? '1. Ảnh đầu vào' : '1. Input Image'}
            </h2>
            <div 
              className="relative aspect-video border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center hover:border-orange-500/50 transition-all cursor-pointer group bg-[#161b26] overflow-hidden"
              onClick={() => !inputImage && fileInputRef.current?.click()}
            >
              {inputImage ? (
                <>
                  <img src={inputImage.url} alt="Input" className="w-full h-full object-contain" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setInputImage(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-10"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center space-y-2 p-4 text-center">
                  <div className="p-3 bg-gray-800 rounded-full group-hover:bg-gray-700 transition-colors">
                    <PhotoIcon className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">
                    {locale === 'vi' ? 'Tải ảnh công trình cần tạo góc mới' : 'Upload building image to generate new angles'}
                  </p>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, setInputImage)} 
            />
          </div>

          {/* 2. Character Reference */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-gray-300 uppercase tracking-tight">
                {locale === 'vi' ? '2. Ảnh tham chiếu Nhân vật' : '2. Character Reference Image'}
              </h2>
              <span className="text-[10px] text-gray-500 uppercase">{locale === 'vi' ? 'Tối đa 5 ảnh' : 'Max 5 images'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="relative border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center hover:border-orange-500/50 transition-all cursor-pointer group bg-[#161b26] overflow-hidden h-32"
                onClick={() => characterImages.length < 5 && characterInputRef.current?.click()}
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
                        <PlusIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 p-4 text-center">
                    <div className="p-2 bg-gray-800 rounded-full group-hover:bg-gray-700 transition-colors">
                      <PhotoIcon className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {locale === 'vi' ? 'Tải ảnh mẫu Nhân vật' : 'Upload character sample images'}
                    </p>
                  </div>
                )}
              </div>
              
              <textarea
                value={characterPrompt}
                onChange={(e) => setCharacterPrompt(e.target.value)}
                placeholder={locale === 'vi' ? "Mô tả nhân vật muốn tạo..." : "Describe character to generate..."}
                className="w-full h-32 bg-[#161b26] border border-gray-700 rounded-xl p-3 text-[10px] text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => characterInputRef.current?.click()}
                disabled={characterImages.length >= 5}
                className="w-full bg-[#364053] hover:bg-[#475266] text-white font-medium py-2 rounded-lg transition-colors text-[10px] disabled:opacity-50"
              >
                {locale === 'vi' ? 'Tải ảnh nhân vật' : 'Upload character'}
              </button>
              <button 
                onClick={handleGenerateCharacter}
                disabled={isGeneratingCharacter || !characterPrompt.trim() || characterImages.length >= 5}
                className="w-full bg-[#364053] hover:bg-[#475266] text-white font-medium py-2 rounded-lg transition-colors text-[10px] disabled:opacity-50"
              >
                {isGeneratingCharacter ? (locale === 'vi' ? 'Đang tạo...' : 'Generating...') : (locale === 'vi' ? 'Tự tạo nhân vật' : 'Generate character')}
              </button>
            </div>
            
            <input 
              type="file" 
              ref={characterInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple
              onChange={handleCharacterImageUpload} 
            />
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">
              {locale === 'vi' ? 'Tỉ lệ khung hình' : 'Aspect Ratio'}
            </label>
            <select 
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-[#161b26] border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer"
            >
              <option value="Auto">Auto</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="9:16">9:16 (Portrait)</option>
            </select>
          </div>

          {/* Action Button */}
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !inputImage}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm uppercase tracking-widest transition-all shadow-lg ${
              isGenerating || !inputImage 
                ? 'bg-gray-700 cursor-not-allowed text-gray-500' 
                : 'bg-orange-600 hover:bg-orange-500 text-white hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{locale === 'vi' ? `ĐANG TẠO (${generationProgress}%)` : `GENERATING (${generationProgress}%)`}</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                <span>{locale === 'vi' ? 'BẮT ĐẦU SÁNG TẠO' : 'START CREATING'}</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-[#161b26] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 px-6 bg-[#202633]">
            <button 
              onClick={() => setActiveTab('result')}
              className={`py-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'result' ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {locale === 'vi' ? 'Kết quả' : 'Result'}
              {activeTab === 'result' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-400"></div>}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`py-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'history' ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {locale === 'vi' ? 'Lịch sử' : 'History'}
              {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-400"></div>}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
            {activeTab === 'result' ? (
              results.length > 0 ? (
                <div className="space-y-12">
                  {VIEW_GROUPS.map((group, gIdx) => {
                    const groupResults = results.filter(r => r.group === (locale === 'vi' ? group.name : group.nameEn));
                    if (groupResults.length === 0) return null;
                    
                    return (
                      <div key={gIdx} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <h3 className="text-lg font-bold text-orange-400 uppercase tracking-wider">
                            {locale === 'vi' ? group.name : group.nameEn}
                          </h3>
                          <div className="h-px flex-1 bg-gray-800"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {groupResults.map((result, rIdx) => (
                            <div key={rIdx} className="group relative bg-[#202633] rounded-2xl overflow-hidden border border-gray-800 hover:border-orange-500/50 transition-all shadow-xl">
                              <div className="aspect-video relative overflow-hidden">
                                <img src={result.url} alt={result.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <button 
                                    onClick={() => handleDownload(result.url, `${result.id}.png`)}
                                    className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-orange-500 transition-colors"
                                    title={locale === 'vi' ? 'Tải xuống' : 'Download'}
                                  >
                                    <ArrowDownTrayIcon className="w-6 h-6" />
                                  </button>
                                </div>
                              </div>
                              <div className="p-4 bg-[#202633]">
                                <h4 className="font-bold text-sm text-white">{result.name}</h4>
                                <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 italic">{result.prompt}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                  {isGenerating ? (
                    <div className="space-y-4 flex flex-col items-center">
                       <div className="relative w-24 h-24">
                          <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                          <SparklesIcon className="absolute inset-0 m-auto w-10 h-10 text-orange-400 animate-pulse" />
                       </div>
                       <p className="text-lg font-medium text-gray-300">
                        {locale === 'vi' ? 'Đang phân tích và tái tạo các góc nhìn...' : 'Analyzing and recreating views...'}
                      </p>
                      <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 transition-all duration-500" 
                          style={{ width: `${generationProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <PhotoIcon className="w-20 h-20 text-gray-700" />
                      <p className="text-lg font-medium text-gray-400">
                        {locale === 'vi' ? 'Chưa có kết quả. Hãy tải ảnh và nhấn Bắt đầu sáng tạo.' : 'No results yet. Upload images and click Start Creating.'}
                      </p>
                    </>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-6">
                {history.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {history.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-[#202633] border border-gray-800 rounded-xl p-4 flex items-center gap-6 hover:border-orange-500/30 transition-all group"
                      >
                        <div className="w-32 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0">
                          <img 
                            src={item.results[0]?.url} 
                            alt="Thumbnail" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ClockIcon className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-xs text-gray-400">{formatDate(item.timestamp)}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate">
                            {locale === 'vi' ? `Phiên tạo: ${item.results.length} góc nhìn` : `Session: ${item.results.length} views`}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {locale === 'vi' ? `Tỉ lệ: ${item.aspectRatio}` : `Ratio: ${item.aspectRatio}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => viewHistoryItem(item)}
                            className="px-4 py-2 bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            {locale === 'vi' ? 'Xem lại' : 'View'}
                          </button>
                          <button 
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
                    <ClockIcon className="w-20 h-20 text-gray-700" />
                    <p className="text-lg font-medium text-gray-400">
                      {locale === 'vi' ? 'Lịch sử trống' : 'History is empty'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ExteriorViewSuggestions;
