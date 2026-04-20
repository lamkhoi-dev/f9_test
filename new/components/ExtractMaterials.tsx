import React, { useState, useRef, useMemo } from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useLanguage } from '../hooks/useLanguage';
import { SparklesIcon } from './icons/SparklesIcon';
import { useMode } from '../contexts/ModeContext';
import { GoogleGenAI, Modality } from '@google/genai';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { RectangleGroupIcon } from './icons/RectangleGroupIcon';

interface ExtractMaterialsProps {
  onBack: () => void;
}

interface GeneratedMap {
  type: string;
  url: string;
}

interface MapSettings {
  normalDepth: number;
  invertNormal: boolean;
  invertColor: boolean;
  brightness: number;
  gamma: number;
  contrast: number;
  saturation: number;
  groutSize: number;
  groutIntensity: number;
}

const DEFAULT_SETTINGS: MapSettings = {
  normalDepth: 1.0,
  invertNormal: false,
  invertColor: false,
  brightness: 0,
  gamma: 1.0,
  contrast: 0,
  saturation: 0,
  groutSize: 5,
  groutIntensity: 50
};

interface HistoryItem {
  id: string;
  inputUrl: string;
  maps: GeneratedMap[];
  description: string;
  timestamp: number;
  mode: string;
}

const ExtractMaterials: React.FC<ExtractMaterialsProps> = ({ onBack }) => {
  const { locale } = useLanguage();
  const { getModelName, isPro, proResolution } = useMode();
  
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [isTextureFromObject, setIsTextureFromObject] = useState(true);
  const [isExtractFromReal, setIsExtractFromReal] = useState(false);
  const [materialDescription, setMaterialDescription] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMaps, setGeneratedMaps] = useState<GeneratedMap[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [selectedMapIndex, setSelectedMapIndex] = useState<number | null>(null);
  const [allMapSettings, setAllMapSettings] = useState<Record<string, MapSettings>>({});

  const [selectedMaps, setSelectedMaps] = useState({
    diffuse: true,
    normal: true,
    displacement: false,
    roughness: true,
    glossiness: false,
    bump: false,
    opacity: false,
    grout: false
  });

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
      setGeneratedMaps([]);
      setSelectedMapIndex(null);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputImage) URL.revokeObjectURL(inputImage.url);
    setInputImage(null);
    setGeneratedMaps([]);
    setSelectedMapIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleMap = (map: keyof typeof selectedMaps) => {
    setSelectedMaps(prev => ({ ...prev, [map]: !prev[map] }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedMaps).every(v => v);
    const newVal = !allSelected;
    setSelectedMaps({
        diffuse: newVal,
        normal: newVal,
        displacement: newVal,
        roughness: newVal,
        glossiness: newVal,
        bump: newVal,
        opacity: newVal,
        grout: newVal
    });
  };

  const handleGenerateMaps = async () => {
    if (!inputImage) {
      alert(locale === 'vi' ? "Vui lòng tải ảnh đầu vào." : "Please upload an input image.");
      return;
    }

    const mapsToGenerate = Object.entries(selectedMaps)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);

    if (mapsToGenerate.length === 0) {
      alert(locale === 'vi' ? "Vui lòng chọn ít nhất một loại map." : "Please select at least one map type.");
      return;
    }

    if (isPro && !(window as any).aistudio?.hasSelectedApiKey()) {
      try { await (window as any).aistudio?.openSelectKey(); } catch(e) {}
    }

    setIsGenerating(true);
    setGeneratedMaps([]);
    setSelectedMapIndex(null);
    setActiveTab('results');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputBase64 = await blobToBase64(inputImage.file);

      const results: GeneratedMap[] = [];

      for (const mapType of mapsToGenerate) {
        let mapDetailPrompt = "";
        switch (mapType) {
          case 'diffuse': 
            mapDetailPrompt = "[ALBEDO/DIFFUSE MAP]: Trích xuất bản đồ màu cơ bản (Base Color). Yêu cầu: màu sắc trung thực, phẳng hóa hoàn toàn, loại bỏ 100% bóng đổ và điểm sáng chói (specular highlights) để có bề mặt màu thuần khiết."; 
            break;
          case 'normal': 
            mapDetailPrompt = "[NORMAL MAP]: Quan trọng nhất sau ảnh màu. Sử dụng các kênh màu RGB để đánh lừa thị giác về hướng của ánh sáng, tạo ra các chi tiết lồi lõm, vết xước hoặc vân gỗ cực chi tiết mà không cần tăng số lượng đa giác (polygons)."; 
            break;
          case 'displacement': 
            mapDetailPrompt = "[DISPLACEMENT MAP]: Bản đồ độ cao thực tế (Height Map). Sử dụng sắc độ xám (Trắng cao, Đen thấp) để mô phỏng sự biến dạng hình khối thật sự của vật thể, cần thiết cho đá cuội, gạch cổ hoặc bề mặt gồ ghề mạnh."; 
            break;
          case 'roughness': 
            mapDetailPrompt = "[ROUGHNESS MAP]: Bản đồ độ nhám. Xác định cách ánh sáng tán xạ trên bề mặt. Trắng là nhám (ánh sáng bị nhòe), Đen là mịn (phản xạ rõ nét). Giúp phân biệt phần gỗ thô và gỗ đã sơn bóng."; 
            break;
          case 'glossiness': 
            mapDetailPrompt = "[GLOSSINESS MAP]: Bản đồ độ bóng. Ngược lại với Roughness. Trắng đại diện cho độ bóng cao (như gương), Đen là mờ đục hoàn toàn. Phù hợp workflow V-Ray."; 
            break;
          case 'bump': 
            mapDetailPrompt = "[BUMP MAP]: Bản đồ độ sâu thang xám cơ bản. Dùng để mô phỏng các chi tiết siêu nhỏ như lỗ chân lông, thớ vải li ti hoặc bụi bẩn trên bề mặt. Tăng tối đa độ sắc nét khi kết hợp với Normal Map."; 
            break;
          case 'opacity': 
            mapDetailPrompt = "[OPACITY/ALPHA MAP]: Bản đồ độ đục/thủng. Xác định vùng hiển thị (Trắng) và vùng trong suốt hoàn toàn (Đen). Dùng tạo lưới thép, rèm vải mỏng hoặc lá cây."; 
            break;
          case 'grout': 
            mapDetailPrompt = "[GROUT MAP]: Map đặc thù cho gạch, gỗ sàn. Trích xuất chính xác vị trí các đường chỉ gạch/gỗ (ron). Giúp đổ vật liệu khác vào phần ron trong phần mềm 3D."; 
            break;
        }

        let systemInstruction = "";
        if (isTextureFromObject) {
            // LOGIC CHUYÊN SÂU CHO "TẠO TEXTURE TỪ VẬT THỂ"
            systemInstruction = `Bạn là chuyên gia Texture Artist 3D cao cấp. Nhiệm vụ của bạn là trích xuất vật liệu từ VẬT THỂ trong ảnh để tạo thành tấm texture PBR chuyên nghiệp.

QUY TRÌNH XỬ LÝ BẮT BUỘC:
1. Material Extraction (Trích xuất bề mặt): Phân tích ảnh, tách biệt phần vân/họa tiết của vật thể (ví dụ: da ghế, thớ gỗ cửa, mặt đá) ra khỏi hình dáng 3D của nó.
2. Flattening (Phẳng hóa): Chuyển đổi phối cảnh (perspective) từ ảnh chụp nghiêng thành góc nhìn thẳng trực diện 90 độ (Orthographic). Đảm bảo các đường nét vật liệu song song và vuông góc hoàn hảo.
3. Neutralizing (Khử bóng & Phản xạ): Tự động xóa bỏ toàn bộ bóng đổ (shadows), vùng cháy sáng (highlights) và ánh sáng không đều để tạo ra bản đồ ${mapType.toUpperCase()} "sạch" hoàn toàn.
4. Seamless Synthesis (Tạo sự liền mạch): Tính toán và xử lý các cạnh để tấm texture này trở thành SEAMLESS (có thể lặp lại vô hạn mà không lộ vết nối).
5. Output format: Ảnh texture hình vuông (1:1), sắc nét cao, đúng chuẩn diễn họa 3D.

Yêu cầu thêm từ người dùng: ${materialDescription || 'Chân thực, chất lượng cao'}.
Loại Map cần tạo: ${mapDetailPrompt}`;
        } else {
            // LOGIC CHO "TRÍCH XUẤT THỰC TẾ" (Dùng cho ảnh chụp phẳng sẵn hoặc bối cảnh rộng)
            systemInstruction = `Bạn là chuyên gia Texture Artist PBR. Nhiệm vụ: Trích xuất thực tế bản đồ vật liệu. 
            Loại map cần tạo: ${mapDetailPrompt}. 
            Yêu cầu kỹ thuật: Phẳng hóa phối cảnh, khử bóng đổ, kết quả hình vuông (1:1). 
            Mô tả bổ sung: ${materialDescription || 'Sắc nét, chân thực'}.`;
        }

        const response = await ai.models.generateContent({
          model: getModelName('image'),
          contents: {
            parts: [
              { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
              { text: systemInstruction }
            ]
          },
          config: {
            responseModalities: [Modality.IMAGE],
            ...(isPro ? { imageConfig: { imageSize: '2K' } } : {})
          }
        });

        const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
          results.push({
            type: mapType,
            url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
          });
          setGeneratedMaps([...results]);
          setAllMapSettings(prev => ({ ...prev, [mapType]: { ...DEFAULT_SETTINGS } }));
        }
      }

      if (results.length > 0) {
        setHistory(prev => [{
          id: Math.random().toString(36).substr(2, 9),
          inputUrl: inputImage.url,
          maps: results,
          description: materialDescription,
          timestamp: Date.now(),
          mode: isTextureFromObject ? 'Texture từ vật thể' : 'Trích xuất thực tế'
        }, ...prev]);
        setSelectedMapIndex(0);
      }

    } catch (error) {
      console.error("Material Extraction Error:", error);
      alert("Đã xảy ra lỗi khi xử lý. Vui lòng kiểm tra lại ảnh hoặc kết nối.");
    } finally {
      setIsGenerating(false);
    }
  };

  const updateSetting = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => {
    if (selectedMapIndex === null || !generatedMaps[selectedMapIndex]) return;
    const type = generatedMaps[selectedMapIndex].type;
    setAllMapSettings(prev => ({
        ...prev,
        [type]: {
            ...(prev[type] || DEFAULT_SETTINGS),
            [key]: value
        }
    }));
  };

  const resetCurrentSettings = () => {
    if (selectedMapIndex === null || !generatedMaps[selectedMapIndex]) return;
    const type = generatedMaps[selectedMapIndex].type;
    setAllMapSettings(prev => ({
        ...prev,
        [type]: { ...DEFAULT_SETTINGS }
    }));
  };

  const activeSettings = useMemo(() => {
    if (selectedMapIndex === null || !generatedMaps[selectedMapIndex]) return DEFAULT_SETTINGS;
    return allMapSettings[generatedMaps[selectedMapIndex].type] || DEFAULT_SETTINGS;
  }, [selectedMapIndex, generatedMaps, allMapSettings]);

  const getFilterString = (settings: MapSettings, type: string) => {
    const { brightness, contrast, saturation, invertColor, gamma } = settings;
    let filters = [];
    filters.push(`brightness(${1 + brightness / 100})`);
    filters.push(`contrast(${1 + contrast / 100})`);
    if (type === 'diffuse') filters.push(`saturate(${1 + saturation / 100})`);
    if (invertColor) filters.push(`invert(1)`);
    if (gamma !== 1.0) filters.push(`contrast(${gamma})`);
    return filters.join(' ');
  };

  return (
    <>
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <img src={zoomedImage} alt="Zoomed" className="max-h-[90vh] object-contain rounded shadow-2xl" />
            <button onClick={() => setZoomedImage(null)} className="absolute -top-4 -right-4 bg-white text-black p-2 rounded-full shadow-lg hover:bg-gray-200">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-140px)] bg-[#282f3d]">
        <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-1 group">
            <div className="p-1 rounded-full group-hover:bg-slate-700"><ChevronLeftIcon className="w-4 h-4" /></div>
            <span className="font-semibold text-xs uppercase tracking-wider">Quay lại Kho tiện ích</span>
          </button>

          {/* 1. Ảnh đầu vào */}
          <div className="space-y-4">
            <h2 className="font-bold text-white text-sm uppercase tracking-wide">1. Ảnh đầu vào</h2>
            <div 
              className="relative border border-dashed border-gray-600 rounded-lg p-2 flex flex-col items-center justify-center text-center h-44 hover:border-orange-500/50 cursor-pointer bg-[#282f3d]/50 transition-all group overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {inputImage ? (
                <>
                  <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md" />
                  <button onClick={clearImage} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                </>
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  <PhotoIcon className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-[11px] px-4">Tải ảnh vật dụng thực tế để làm texture</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

            <div className="space-y-2">
              <label className={`flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg border transition-all ${isTextureFromObject ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                  <input type="checkbox" checked={isTextureFromObject} onChange={() => { setIsTextureFromObject(true); setIsExtractFromReal(false); }} className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-700" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Tạo texture từ vật thể</span>
                    <span className="text-[9px] text-gray-500 font-normal italic">Phẳng hóa, khử bóng & Seamless</span>
                  </div>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer group p-2.5 rounded-lg border transition-all ${isExtractFromReal ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                  <input type="checkbox" checked={isExtractFromReal} onChange={() => { setIsExtractFromReal(true); setIsTextureFromObject(false); }} className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Trích xuất thực tế</span>
                  </div>
              </label>
            </div>
          </div>

          {/* 2. Chọn map thành phần */}
          <div className="space-y-3 pt-2 border-t border-gray-700/50">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white text-[11px] uppercase tracking-widest">2. Chọn map thành phần</h3>
                  <button onClick={handleSelectAll} className="text-[10px] text-orange-400 font-bold hover:underline">
                      {Object.values(selectedMaps).every(v => v) ? 'Bỏ hết' : 'Tất cả'}
                  </button>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {Object.keys(selectedMaps).map((map) => (
                      <label key={map} className="flex items-center gap-2 cursor-pointer group" title={locale === 'vi' ? 'Tích chọn để thêm vào danh sách render' : 'Check to add to render list'}>
                          <input type="checkbox" checked={(selectedMaps as any)[map]} onChange={() => toggleMap(map as any)} className="w-3.5 h-3.5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700" />
                          <span className="text-[11px] text-gray-300 capitalize">{map} map</span>
                      </label>
                  ))}
              </div>
          </div>

          {/* 3. Mô tả vật liệu */}
          <div className="space-y-2 pt-2 border-t border-gray-700/50">
              <h2 className="font-bold text-white text-[11px] uppercase tracking-widest">3. Mô tả vật liệu</h2>
              <textarea 
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  placeholder="Ví dụ: Da thật màu nâu sậm có vân hạt, Gỗ óc chó bề mặt mờ..."
                  className="w-full h-24 bg-[#364053] border border-gray-600 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
          </div>

          {/* 4. Điều chỉnh */}
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-white text-[11px] uppercase tracking-widest flex items-center gap-2">
                4. Điều chỉnh (Adjustment)
              </h2>
              <button onClick={resetCurrentSettings} className="text-gray-500 hover:text-orange-400 transition-colors">
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#2a303c] rounded-xl p-4 space-y-5 border border-gray-700/50">
              {generatedMaps[selectedMapIndex!]?.type === 'normal' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <label>Độ nổi khối (Normal Depth)</label>
                    <span className="font-mono text-orange-400">{activeSettings.normalDepth.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0.1" max="5.0" step="0.1" value={activeSettings.normalDepth} onChange={(e) => updateSetting('normalDepth', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={activeSettings.invertColor} onChange={(e) => updateSetting('invertColor', e.target.checked)} className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-orange-500" />
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-tight">Đảo ngược màu (Invert Color)</span>
              </label>

              <div className="space-y-4 pt-2 border-t border-gray-700/50">
                {[
                  { label: 'Độ sáng', key: 'brightness', min: -100, max: 100 },
                  { label: 'Tương phản', key: 'contrast', min: -100, max: 100 },
                  { label: 'Bão hòa', key: 'saturation', min: -100, max: 100 },
                ].map((s) => (
                  <div key={s.key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <label>{s.label}</label>
                      <span className="text-white">{(activeSettings as any)[s.key]}</span>
                    </div>
                    <input type="range" min={s.min} max={s.max} value={(activeSettings as any)[s.key]} onChange={(e) => updateSetting(s.key as any, parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Tùy chỉnh map ron (Grout) */}
          {selectedMaps.grout && (
            <div className="space-y-4 pt-4 border-t border-gray-700">
                <h2 className="font-bold text-white text-[11px] uppercase tracking-widest flex items-center gap-2">
                    5. Tùy chỉnh Map Ron (Grout)
                </h2>
                <div className="bg-[#2a303c] rounded-xl p-4 space-y-4 border border-gray-700/50">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                            <label>Kích thước đường ron</label>
                            <span className="text-orange-400 font-mono">{activeSettings.groutSize}px</span>
                        </div>
                        <input type="range" min="1" max="20" value={activeSettings.groutSize} onChange={(e) => updateSetting('groutSize', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                            <label>Độ đậm nét của ron</label>
                            <span className="text-orange-400 font-mono">{activeSettings.groutIntensity}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={activeSettings.groutIntensity} onChange={(e) => updateSetting('groutIntensity', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                    </div>
                </div>
            </div>
          )}

          <div className="mt-auto pt-4">
            <button 
              onClick={handleGenerateMaps} disabled={isGenerating || !inputImage}
              className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold py-3.5 rounded flex items-center justify-center gap-2 transition-all shadow-xl uppercase tracking-widest text-[11px] disabled:bg-gray-600"
            >
              {isGenerating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>ĐANG TRÍCH XUẤT...</span></> : <><SparklesIcon className="w-4 h-4" /><span>BẮT ĐẦU LÀM TEXTURES</span></>}
            </button>
          </div>
        </aside>

        <main className="flex-grow flex flex-col bg-[#202633]">
          <div className="flex border-b border-gray-700 px-6 pt-2 gap-8 flex-shrink-0 bg-[#282f3d]">
            <button onClick={() => setActiveTab('results')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Kết quả</button>
            <button onClick={() => setActiveTab('history')} className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>Lịch sử</button>
          </div>

          <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
              {activeTab === 'results' ? (
                generatedMaps.length > 0 ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between bg-[#2a303c] p-4 rounded-xl border border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><RectangleGroupIcon className="w-6 h-6" /></div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Bộ Maps PBR (Preview)</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Nhấn vào từng hình để kiểm tra chi tiết</p>
                            </div>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-4 py-2 rounded transition-all uppercase tracking-widest shadow-lg">Lưu tất cả (Download All)</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {generatedMaps.map((map, idx) => {
                        const settings = allMapSettings[map.type] || DEFAULT_SETTINGS;
                        const isSelected = selectedMapIndex === idx;
                        return (
                            <div 
                            key={idx} 
                            onClick={() => setSelectedMapIndex(idx)}
                            className={`bg-[#2a303c] rounded-xl border overflow-hidden group shadow-2xl transition-all cursor-pointer ${isSelected ? 'ring-2 ring-orange-500 border-transparent scale-[1.02]' : 'border-gray-700 hover:border-gray-500'}`}
                            >
                            <div className="relative aspect-square bg-black/40 overflow-hidden">
                                <img 
                                src={map.url} 
                                alt={map.type} 
                                className="w-full h-full object-cover transition-all" 
                                style={{ 
                                    filter: getFilterString(settings, map.type),
                                    transform: map.type === 'normal' && settings.invertNormal ? 'scaleY(-1)' : 'none'
                                }}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                <button onClick={(e) => { e.stopPropagation(); setZoomedImage(map.url); }} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white transform hover:scale-110"><MagnifyingGlassPlusIcon className="w-6 h-6" /></button>
                                <a href={map.url} download={`[F9]-${map.type}.png`} onClick={e => e.stopPropagation()} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white transform hover:scale-110"><ArrowDownTrayIcon className="w-6 h-6" /></a>
                                </div>
                                <div className={`absolute top-3 left-3 text-[10px] font-bold text-white px-2 py-1 rounded uppercase tracking-widest shadow-lg border border-white/10 ${isSelected ? 'bg-orange-600' : 'bg-slate-800'}`}>
                                {map.type}
                                </div>
                            </div>
                            </div>
                        );
                        })}
                    </div>
                  </div>
                ) : isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-6 animate-fade-in">
                      <div className="relative w-32 h-32">
                          <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center text-orange-500"><SparklesIcon className="w-12 h-12 animate-pulse" /></div>
                      </div>
                      <h3 className="text-white font-bold text-xl uppercase tracking-widest">Đang bóc tách và phẳng hóa vật liệu...</h3>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"><SparklesIcon className="w-10 h-10 text-gray-600" /></div>
                      <p className="text-sm font-medium text-white">Chưa có kết quả</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-6">
                  {history.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-600 text-sm italic">Lịch sử trống</div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="bg-[#2a303c] p-5 rounded-xl border border-gray-700 space-y-4 shadow-xl group hover:border-orange-500/30">
                        <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                          <div className="flex flex-col">
                            <span className="text-white font-bold text-xs uppercase tracking-wider text-orange-400">{item.mode}: {item.maps.length} maps</span>
                            <span className="text-[10px] text-gray-500 font-mono">{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
                          <div className="flex-shrink-0 w-32 h-32 rounded-lg border border-orange-500/30 overflow-hidden bg-black/40 relative shadow-lg">
                            <img src={item.inputUrl} className="w-full h-full object-cover opacity-60" alt="Input" />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase bg-black/40 backdrop-blur-[1px]">Gốc</div>
                          </div>
                          {item.maps.map((map, midx) => (
                            <div key={midx} className="flex-shrink-0 w-32 h-32 rounded-lg border border-gray-700 overflow-hidden bg-black/40 relative group/map shadow-lg">
                              <img src={map.url} className="w-full h-full object-cover" alt={map.type} />
                              <div className="absolute top-1 left-1 bg-black/70 text-[8px] px-1.5 py-0.5 rounded text-gray-300 uppercase font-bold border border-white/10">{map.type}</div>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/map:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                <button onClick={() => setZoomedImage(map.url)} className="p-1.5 bg-white/20 rounded-full text-white hover:bg-white/40"><MagnifyingGlassPlusIcon className="w-3.5 h-3.5" /></button>
                                <a href={map.url} download={`${map.type}.png`} className="p-1.5 bg-white/20 rounded-full text-white hover:bg-white/40"><ArrowDownTrayIcon className="w-3.5 h-3.5" /></a>
                              </div>
                            </div>
                          ))}
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

export default ExtractMaterials;