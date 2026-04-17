
import React, { useState, useRef } from 'react';
import { PhotoIcon } from './icons/PhotoIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { useLanguage } from '../hooks/useLanguage';
import { useMode } from '../contexts/ModeContext';
import { apiClient, getImageSizeConfig } from '../lib/api';

interface ChangeMaterialProps {
  onBack: () => void;
}

interface HistoryItem {
  input: string;
  output: string;
  colors: { hex: string; value: string }[];
}

const ChangeMaterial: React.FC<ChangeMaterialProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const { getModelName, isPro, proResolution } = useMode();
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');
  
  // Input Images State
  const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  
  const inputFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Analysis & Generation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Color Palette State - Added 'value' for material description
  const [colors, setColors] = useState([
    { id: 1, label: 'Màu 1. Main Color (Màu chính)', hex: '#F5F5F5', value: 'Sơn trắng sứ' },
    { id: 2, label: 'Màu 2. Secondary Color (Màu phụ)', hex: '#8B4513', value: 'Gỗ tự nhiên' },
    { id: 3, label: 'Màu 3. Accent Color ( Màu nhấn )', hex: '#708090', value: 'Đá ghi xám' },
    { id: 4, label: 'Màu 4. (Trim / Phào chỉ / Viền mái)', hex: '#333333', value: 'Khung nhôm đen' },
    { id: 5, label: 'Màu 5. (Highlight nhỏ / điểm nhấn phụ)', hex: '#DAA520', value: 'Đèn vàng ấm' },
  ]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };

  const analyzeColors = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const base64Data = await blobToBase64(file);

      const prompt = `Phân tích hình ảnh tham chiếu để xác định 5 vật liệu/màu sắc chủ đạo cho các vị trí:
      1. Main (Tường chính)
      2. Secondary (Khối phụ)
      3. Accent (Điểm nhấn)
      4. Trim (Phào chỉ/Viền)
      5. Highlight (Chi tiết nhỏ)

      Với mỗi vị trí, hãy xác định chi tiết 5 thuộc tính sau:
      - hex: Mã màu HEX đại diện.
      - material: Tên vật liệu chính xác (VD: Gỗ Teak, Đá Marble, Sơn...).
      - color: Mô tả màu sắc (VD: Nâu cánh gián, Trắng sứ...).
      - texture: Vân hoặc họa tiết bề mặt (VD: Vân gỗ thẳng, Vân đá loang, Trơn...).
      - finish: Độ nhám hoặc Độ bóng (VD: Bóng gương, Mờ satin, Nhám sần...).
      - reflection: Tính chất phản xạ ánh sáng (VD: Phản xạ cao, Hấp thụ sáng, Bắt sáng nhẹ...).`;

      const response = await apiClient.generateContent({
        model: getModelName('text'),
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              item1: { type: 'OBJECT', properties: { hex: { type: 'STRING' }, material: { type: 'STRING' }, color: { type: 'STRING' }, texture: { type: 'STRING' }, finish: { type: 'STRING' }, reflection: { type: 'STRING' } } },
              item2: { type: 'OBJECT', properties: { hex: { type: 'STRING' }, material: { type: 'STRING' }, color: { type: 'STRING' }, texture: { type: 'STRING' }, finish: { type: 'STRING' }, reflection: { type: 'STRING' } } },
              item3: { type: 'OBJECT', properties: { hex: { type: 'STRING' }, material: { type: 'STRING' }, color: { type: 'STRING' }, texture: { type: 'STRING' }, finish: { type: 'STRING' }, reflection: { type: 'STRING' } } },
              item4: { type: 'OBJECT', properties: { hex: { type: 'STRING' }, material: { type: 'STRING' }, color: { type: 'STRING' }, texture: { type: 'STRING' }, finish: { type: 'STRING' }, reflection: { type: 'STRING' } } },
              item5: { type: 'OBJECT', properties: { hex: { type: 'STRING' }, material: { type: 'STRING' }, color: { type: 'STRING' }, texture: { type: 'STRING' }, finish: { type: 'STRING' }, reflection: { type: 'STRING' } } },
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');

      const formatDesc = (item: any) => {
          if (!item) return '';
          // Format: Tên vật liệu, Màu sắc, Vân / Họa tiết, Độ nhám / Độ bóng, Phản xạ – ánh sáng
          return `${item.material || ''}, ${item.color || ''}, ${item.texture || ''}, ${item.finish || ''}, ${item.reflection || ''}`;
      };

      if (result.item1) {
        setColors(prev => [
          { ...prev[0], hex: result.item1?.hex || prev[0].hex, value: formatDesc(result.item1) || prev[0].value },
          { ...prev[1], hex: result.item2?.hex || prev[1].hex, value: formatDesc(result.item2) || prev[1].value },
          { ...prev[2], hex: result.item3?.hex || prev[2].hex, value: formatDesc(result.item3) || prev[2].value },
          { ...prev[3], hex: result.item4?.hex || prev[3].hex, value: formatDesc(result.item4) || prev[3].value },
          { ...prev[4], hex: result.item5?.hex || prev[4].hex, value: formatDesc(result.item5) || prev[4].value },
        ]);
      }

    } catch (error) {
      console.error("Error analyzing colors:", error);
      alert("Không thể phân tích màu từ ảnh. Vui lòng thử lại.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!inputImage) {
      alert("Vui lòng tải lên ảnh đầu vào.");
      return;
    }

    if (isPro) {
    }

    setIsGenerating(true);
    setActiveTab('results');
    setResultImage(null);

    try {
      const base64Data = await blobToBase64(inputImage.file);

      const prompt = `Bạn là chuyên gia phối màu và vật liệu kiến trúc.
      Ảnh 1 = ảnh công trình (base).  
      Nhiệm vụ: Thay đổi vật liệu và màu sắc của công trình trong ảnh base theo danh sách yêu cầu bên dưới.
      Giữ nguyên 100% hình khối kiến trúc, góc chụp và ánh sáng gốc. Chỉ thay đổi bề mặt vật liệu/màu sắc.

      Danh sách vật liệu/màu sắc mới cần áp dụng:
      • 1. Tường chính (Main): ${colors[0].value} (Tone màu tham khảo: ${colors[0].hex})
      • 2. Khối phụ/Mảng trang trí (Secondary): ${colors[1].value} (Tone màu tham khảo: ${colors[1].hex})
      • 3. Điểm nhấn (Accent): ${colors[2].value} (Tone màu tham khảo: ${colors[2].hex})
      • 4. Phào chỉ/Viền/Khung (Trim): ${colors[3].value} (Tone màu tham khảo: ${colors[3].hex})
      • 5. Chi tiết nhỏ/Highlight: ${colors[4].value} (Tone màu tham khảo: ${colors[4].hex})

      Quy tắc áp dụng:
      - Tường lớn, diện tích chủ đạo -> áp dụng mục 1.
      - Các mảng khối lùi, khối phụ -> áp dụng mục 2.
      - Các chi tiết trang trí nổi bật -> áp dụng mục 3.
      - Khung cửa, diềm mái, phào chỉ -> áp dụng mục 4.
      - Chi tiết nhỏ khác -> áp dụng mục 5.

      Yêu cầu kỹ thuật:
      - Render vật liệu chân thực (PBR): Nếu là "Gỗ" phải có vân gỗ, "Đá" phải có độ nhám/bóng, "Kính" phải trong suốt.
      - Giữ nguyên ánh sáng và bóng đổ của ảnh gốc để công trình trông tự nhiên.
      - Không thay đổi cây cối, bầu trời hay bối cảnh xung quanh.
      
      Trả về 1 ảnh hoàn thiện chất lượng cao.`;

      const response = await apiClient.generateContent({
        model: getModelName('image'),
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: inputImage.file.type } },
            { text: prompt }
          ]
        },
        config: {
          responseModalities: ['IMAGE'],
          ...getImageSizeConfig(isPro, proResolution)
        }
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);

      if (imagePart && imagePart.inlineData) {
        const generatedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        setResultImage(generatedImage);
        setHistory(prev => [{
          input: inputImage.url,
          output: generatedImage,
          colors: colors.map(c => ({ hex: c.hex, value: c.value }))
        }, ...prev]);
      } else {
        alert("Không thể tạo ảnh. Vui lòng thử lại.");
      }

    } catch (error) {
      console.error("Error generating coloring:", error);
      alert("Đã xảy ra lỗi khi tạo phối màu. Vui lòng kiểm tra lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'input' | 'ref') => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'input') {
        setInputImage({ url, file });
        setResultImage(null); // Reset result when new input is uploaded
      } else {
        setRefImage(url);
        analyzeColors(file);
      }
    }
  };

  const clearImage = (type: 'input' | 'ref') => {
    if (type === 'input') {
      if (inputImage) URL.revokeObjectURL(inputImage.url);
      setInputImage(null);
      setResultImage(null);
      if (inputFileInputRef.current) inputFileInputRef.current.value = '';
    } else {
      if (refImage) URL.revokeObjectURL(refImage);
      setRefImage(null);
      if (refFileInputRef.current) refFileInputRef.current.value = '';
    }
  };

  const handleTextChange = (id: number, newValue: string) => {
    setColors(prev => prev.map(c => c.id === id ? { ...c, value: newValue } : c));
  };

  const handlePickerChange = (id: number, newHex: string) => {
    // When picking a color manually, we also update the text value to the hex code
    // to ensure consistency, as the user is explicitly choosing a color.
    setColors(prev => prev.map(c => c.id === id ? { ...c, hex: newHex, value: newHex } : c));
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
                <a href={zoomedImage} download={`[F9render.com]_colored-result-${Date.now()}.png`} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
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
          <h2 className="font-bold text-white text-base">1. Ảnh đầu vào</h2>
          <div 
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-40 hover:border-gray-500 cursor-pointer bg-[#282f3d]/50 transition-colors"
            onClick={() => inputFileInputRef.current?.click()}
          >
            {inputImage ? (
              <>
                <img src={inputImage.url} alt="Input" className="max-h-full max-w-full object-contain rounded-md" />
                <button 
                  onClick={(e) => { e.stopPropagation(); clearImage('input'); }} 
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <PhotoIcon className="w-8 h-8 mb-2" />
                <p className="text-xs">Tải ảnh công trình cần thay đổi vật liệu</p>
              </div>
            )}
          </div>
          <input type="file" ref={inputFileInputRef} onChange={(e) => handleImageUpload(e, 'input')} className="hidden" accept="image/*" />
        </div>

        {/* 2. Reference Image */}
        <div className="space-y-2">
          <h2 className="font-bold text-white text-base">2. Ảnh màu tham chiếu</h2>
          <div 
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-40 hover:border-gray-500 cursor-pointer bg-[#282f3d]/50 transition-colors"
            onClick={() => !isAnalyzing && refFileInputRef.current?.click()}
          >
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-xs text-blue-200 animate-pulse">Đang phân tích màu...</p>
              </div>
            )}
            
            {refImage ? (
              <>
                <img src={refImage} alt="Reference" className="max-h-full max-w-full object-contain rounded-md" />
                <button 
                  onClick={(e) => { e.stopPropagation(); clearImage('ref'); }} 
                  className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-20"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <PhotoIcon className="w-8 h-8 mb-2" />
                <p className="text-xs">Tải ảnh mẫu màu hoặc vật liệu mẫu</p>
              </div>
            )}
          </div>
          <input type="file" ref={refFileInputRef} onChange={(e) => handleImageUpload(e, 'ref')} className="hidden" accept="image/*" />
        </div>

        {/* 3. Color Palette */}
        <div className="space-y-3">
          <h2 className="font-bold text-white text-base">3. Tự chọn mã màu / Vật liệu</h2>
          <div className="space-y-3">
            {colors.map((color) => (
              <div key={color.id} className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">{color.label}</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={color.value} 
                    onChange={(e) => handleTextChange(color.id, e.target.value)}
                    placeholder="Nhập tên vật liệu hoặc mã màu"
                    className="flex-grow bg-[#364053] border border-gray-600 text-gray-300 text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <div className="relative w-10 h-10 rounded border border-gray-600 overflow-hidden flex-shrink-0 cursor-pointer hover:border-white transition-colors" style={{ backgroundColor: color.hex }}>
                    <input 
                      type="color" 
                      value={color.hex}
                      onChange={(e) => handlePickerChange(color.id, e.target.value)}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer p-0 m-0 border-none opacity-0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 mt-auto">
          <button 
            onClick={handleGenerate}
            disabled={!inputImage || isGenerating}
            className="w-full bg-[#4b5563] hover:bg-[#586375] text-white font-bold py-3 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                Đang xử lý...
              </>
            ) : (
              "Bắt đầu phối màu"
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
                        <p className="text-gray-300 animate-pulse font-medium">AI đang phối màu theo yêu cầu...</p>
                    </div>
                ) : resultImage ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-black/20">
                        <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain shadow-2xl" />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full px-4">
                            <button onClick={() => setZoomedImage(resultImage)} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Phóng to">
                                <MagnifyingGlassPlusIcon className="w-6 h-6" />
                            </button>
                            <div className="w-px h-6 bg-white/20"></div>
                            <a href={resultImage} download={`[F9render]_color-mix-${Date.now()}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Tải xuống">
                                <ArrowDownTrayIcon className="w-6 h-6" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <PhotoIcon className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Chưa có kết quả</p>
                        <p className="text-gray-600 text-xs mt-1">Tải ảnh và bấm "Bắt đầu phối màu"</p>
                    </div>
                )}
            </div>
          ) : (
            // History Tab
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {history.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-500">
                        <p>Chưa có lịch sử phối màu</p>
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
                                <div className="flex -space-x-2">
                                    {item.colors.map((c, i) => (
                                        <div key={i} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} title={c.value}></div>
                                    ))}
                                </div>
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

export default ChangeMaterial;
