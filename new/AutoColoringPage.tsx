
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { LightbulbIcon } from './components/icons/LightbulbIcon';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { PhotoIcon } from './components/icons/PhotoIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import { ArrowDownTrayIcon } from './components/icons/ArrowDownTrayIcon';
import { ClockIcon } from './components/icons/ClockIcon';
import { MagnifyingGlassPlusIcon } from './components/icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './components/icons/XMarkIcon';

import CustomSelect from './components/CustomSelect';

import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from './hooks/useLanguage';
import { useMode } from './contexts/ModeContext';
import Footer from './components/Footer';

import { saveHistory, HistoryRecord } from './lib/db';

interface AutoColoringPageProps {
    onNavigate: (page: string) => void;
    restoreData?: HistoryRecord | null;
}

interface HistoryItem {
    input: string;
    outputs: string[];
}

const AutoColoringPage: React.FC<AutoColoringPageProps> = ({ onNavigate, restoreData }) => {
    const { t } = useLanguage();
    const { getModelName, isPro, proResolution } = useMode();
    const [activeTab, setActiveTab] = useState('results');
    
    // State for filters and inputs
    const [designStyle, setDesignStyle] = useState('');
    const [outputDrawing, setOutputDrawing] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');
    const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; file: File } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);

    // State for results and session history
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [sessionHistory, setSessionHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Preset templates for 2D mode
    const preset2D = useMemo(() => [
        { label: "F9-01 Room Zoning (Mặt bằng phân màu theo phòng)", prompt: "Đổ màu mặt bằng theo từng phòng, màu phẳng, không texture, không bóng đổ,các nét như bản vẽ autocad." },
        { label: "F9-01 Basic Coloring( Mặt bằng phân màu theo vật liệu cơ bản)", prompt: "Từ ảnh mặt bằng/bản vẽ 2D tôi tải lên,hãy phân tích và vẽ lại thành một hình ảnh mặt bằng 2D render màu (top view floor plan) theo đúng bố cục gốc. Phong cách mặt bằng kiến trúc hiện đại, sạch, sắc nét, chuyên nghiệp như bản vẽ trình bày: tường nét đậm rõ ràng,các phòng không liệt kê nền sàn gạch sáng màu, khu phòng ngủ , phòng khách sàn gỗ ấm, wc sàn gạch đậm màu. Bố trí nội thất dạng icon 2D hiện đại đúng vị trí như đã phân tích. Giữ lại tên phòng/ký hiệu/kích thước nếu có trong ảnh gốc. Hình ảnh xuất ra độ phân giải cao, siêu sắc nét, màu sắc hài hòa, đổ bóng rất nhẹ để tạo chiều sâu nhưng vẫn đúng chuẩn 2D top-down floor plan, không phối cảnh 3D." },
        { label: "F9-02 Material Mapping (Mặt bằng phân màu theo vật liệu)", prompt: "Đổ màu mặt bằng theo vật liệu thực tế: gỗ, gạch, đá, thảm, kính, sân vườn,các nét như bản vẽ autocad." },
        { label: "F9-03 Graphic Flat (Mặt bằng đồ họa phẳng)", prompt: "Đổ màu mặt bằng phong cách đồ họa phẳng, màu pastel nhẹ, không bóng đổ, viền mảnh,các nét như bản vẽ autocad." },
        { label: "F9-04 Light & Shadow (Mặt bằng diễn họa có bóng đổ)", prompt: "Đổ màu mặt bằng có bóng đổ theo ánh sáng, tạo chiều sâu cho tường và không gian,các nét như bản vẽ autocad." },
        { label: "F9-05 Artistic Sketch ( Mặt bằng diễn họa phong cách vẽ tay)", prompt: "Đổ màu mặt bằng theo phong cách màu nước loang nhẹ, kiểu vẽ tay, cảm giác nghệ thuật,các nét như bản vẽ autocad." },
        { label: "F9-06 Minimal Zen (Mặt bằng tối giản phong cách Nhật – Bắc Âu)", prompt: "Đổ màu mặt bằng tông trắng – be – xám nhạt, điểm nhẹ màu gỗ hoặc xanh lá, tối giản,các nét như bản vẽ autocad." },
        { label: "F9-07 Grayscale Focus ( Mặt bằng đơn sắc nhấn khu vực)", prompt: "Đổ màu mặt bằng nền xám, chỉ làm nổi bật các khu vực chính hoặc vùng nhấn,các nét như bản vẽ autocad." },
        { label: "F9-08 Functional Diagram (Mặt bằng phân khu chức năng)", prompt: "Đổ màu mặt bằng theo phân khu chức năng: ngủ, dịch vụ, giao thông, kỹ thuật,các nét như bản vẽ autocad." },
        { label: "F9-09 Landscape Layer(Mặt bằng cảnh quan)", prompt: "Đổ màu mặt bằng cảnh quan với lớp cỏ, cây bụi, đường dạo, mặt nước và kiến trúc,các nét như bản vẽ autocad." },
        { label: "F9-10 Hybrid Presentation (Mặt bằng kỹ thuật – trình bày tổng hợp)", prompt: "Đổ màu mặt bằng kết hợp line kỹ thuật với màu diễn họa, vừa chi tiết vừa trình bày đẹp,các nét như bản vẽ autocad." }
    ], []);

    const designStyles = useMemo(() => (Array.isArray(t('designStyles')) ? t('designStyles') : []), [t]);
    const outputDrawingOptions = useMemo(() => (Array.isArray(t('outputDrawingOptions')) ? t('outputDrawingOptions') : []), [t]);

    const totalPages = Math.ceil(sessionHistory.length / ITEMS_PER_PAGE);
    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sessionHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sessionHistory, currentPage]);

    // Restore logic
    useEffect(() => {
        if (restoreData && restoreData.page === 'auto-coloring') {
            setDescription(restoreData.prompt);
            setGeneratedImages(restoreData.outputImages);
            if (restoreData.inputImage) {
                // Tạo blob từ base64
                fetch(restoreData.inputImage)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], "restored_input.png", { type: blob.type });
                        setInputImage({ url: restoreData.inputImage, file });
                    });
            }
            if (restoreData.config) {
                if (restoreData.config.designStyle) setDesignStyle(restoreData.config.designStyle);
                if (restoreData.config.outputDrawing) setOutputDrawing(restoreData.config.outputDrawing);
                if (restoreData.config.selectedPreset) setSelectedPreset(restoreData.config.selectedPreset);
            }
            setActiveTab('results');
        }
    }, [restoreData]);

    useEffect(() => {
        if (outputDrawingOptions.length > 1 && !outputDrawing && !restoreData) setOutputDrawing(outputDrawingOptions[1]);
    }, [outputDrawingOptions, outputDrawing, restoreData]);
    
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const analyzeReferenceImage = async (file: File) => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const base64Data = await blobToBase64(file);
            const response = await ai.models.generateContent({
                model: getModelName('text'),
                contents: {
                    parts: [
                        { inlineData: { data: base64Data, mimeType: file.type } },
                        { text: t('autoColoring.analysisPrompt') }
                    ]
                }
            });
            const styleDescription = response.text;
            setDescription(`${t('autoColoring.final3DPromptPrefix')}\n\n${styleDescription}`);
        } catch (e) {
            console.error("Error analyzing:", e);
            setError(t('autoColoring.analysisError'));
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Auto-fill prompt logic
    useEffect(() => {
        if (selectedPreset || restoreData) return;
        const is2DColoring = outputDrawing === outputDrawingOptions[1];
        const is3DMode = outputDrawing === outputDrawingOptions[2];
        if (is2DColoring) {
            setDescription(t('autoColoring.coloringPrompt2D'));
        } else if (is3DMode && !referenceImage && !isAnalyzing) {
            setDescription(t('autoColoring.coloringPrompt3D', { designStyle: designStyle || '...' }));
        }
    }, [outputDrawing, designStyle, t, outputDrawingOptions, referenceImage, isAnalyzing, selectedPreset, restoreData]);

    const handleGenerate = async (overridePrompt?: string) => {
        if (!inputImage) return;
        const finalPromptToUse = overridePrompt || description;

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        setActiveTab('results');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const inputBase64Raw = await blobToBase64(inputImage.file);
            const inputBase64Full = `data:${inputImage.file.type};base64,${inputBase64Raw}`;

            const response = await ai.models.generateContent({
                model: getModelName('image'),
                contents: { 
                    parts: [
                        { inlineData: { data: inputBase64Raw, mimeType: inputImage.file.type } },
                        { text: finalPromptToUse }
                    ] 
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                    ...(isPro ? { imageConfig: { imageSize: proResolution === '4k' ? '4K' : '2K' } } : {})
                },
            });
            
            const imageParts = response.candidates?.[0]?.content?.parts.filter(part => part.inlineData);

            if (imageParts && imageParts.length > 0) {
                const resultImages = imageParts.map(part => `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                const finalImg = resultImages[0];
                setGeneratedImages([finalImg]);
                setSessionHistory(prev => [{ input: inputImage.url, outputs: [finalImg] }, ...prev]);

                // LƯU VÀO INDEXEDDB
                saveHistory({
                    id: Math.random().toString(36).substr(2, 9),
                    page: 'auto-coloring',
                    inputImage: inputBase64Full,
                    outputImages: [finalImg],
                    prompt: finalPromptToUse,
                    timestamp: Date.now(),
                    config: { designStyle, outputDrawing, selectedPreset }
                });

            } else {
                setError(t('autoColoring.noImageGeneratedError'));
            }
        } catch (e) {
            setError(t('autoColoring.generationErrorMessage'));
            console.error("Error generating image:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePresetChange = (label: string) => {
        const found = preset2D.find(p => p.label === label);
        if (found) {
            setSelectedPreset(label);
            if (inputImage) handleGenerate(found.prompt);
        } else {
            setSelectedPreset('');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'input' | 'reference') => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (type === 'input') {
                setInputImage({ url, file });
            } else {
                setReferenceImage({ url, file });
                analyzeReferenceImage(file);
            }
        }
    };

    const clearImage = (type: 'input' | 'reference') => {
        if (type === 'input') {
            if (inputImage) URL.revokeObjectURL(inputImage.url);
            setInputImage(null);
        } else {
            if (referenceImage) URL.revokeObjectURL(referenceImage.url);
            setReferenceImage(null);
        }
    };

    return (
        <>
        {zoomedImage && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <img src={zoomedImage} alt="Zoomed view" className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-lg" />
                    <div className="absolute -top-4 -right-4 flex items-center gap-3">
                        <a href={zoomedImage} download={`F9-result-${Date.now()}.png`} className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-500 transition-transform hover:scale-110">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </a>
                        <button onClick={() => setZoomedImage(null)} className="bg-white text-black p-2.5 rounded-full shadow-lg hover:bg-gray-200 transition-transform hover:scale-110">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )}
        <div className="min-h-screen bg-[#202633] text-white flex flex-col font-sans">
            <header className="bg-[#282f3d] shadow-md p-4 flex justify-between items-center flex-shrink-0 z-10">
                <button onClick={() => onNavigate('home')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span className="font-semibold hidden sm:inline">Home</span>
                </button>
                <div className="flex items-center gap-2">
                    <LightbulbIcon className="w-6 h-6 text-yellow-400" />
                    <h1 className="text-lg font-bold">{t('autoColoring.title')}</h1>
                </div>
                <LanguageSwitcher />
            </header>
            <main className="flex-grow flex flex-col md:flex-row min-h-0">
                <aside className="w-full md:w-96 bg-[#282f3d] p-6 flex-shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">{t('autoColoring.uploadLabel')}</label>
                        <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-40 hover:border-gray-500 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {inputImage ? (
                                <>
                                    <img src={inputImage.url} alt="Input preview" className="max-h-full max-w-full object-contain rounded-md" />
                                    <button onClick={(e) => { e.stopPropagation(); clearImage('input'); }} className="absolute top-1 right-1 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-10"> <TrashIcon className="w-4 h-4" /></button>
                                </>
                            ) : (<><PhotoIcon className="w-8 h-8 text-gray-500 mb-2" /><p className="text-xs text-gray-400">{t('autoColoring.uploadPlaceholder')}</p></>)}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'input')} className="hidden" accept="image/*" />
                    </div>

                    {outputDrawing === outputDrawingOptions[2] && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">{t('autoColoring.referenceUploadLabel')}</label>
                            <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-40 hover:border-gray-500 cursor-pointer" onClick={() => referenceFileInputRef.current?.click()}>
                                {isAnalyzing ? (<><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div><p className="mt-2 text-xs">{t('autoColoring.analyzingMessage')}</p></>)
                                : referenceImage ? (<><img src={referenceImage.url} alt="Reference preview" className="max-h-full max-w-full object-contain rounded-md" /><button onClick={(e) => { e.stopPropagation(); clearImage('reference'); }} className="absolute top-1 right-1 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-10"><TrashIcon className="w-4 h-4" /></button></>)
                                : (<><PhotoIcon className="w-8 h-8 text-gray-500 mb-2" /><p className="text-xs text-gray-400">{t('autoColoring.uploadPlaceholder')}</p></>)}
                            </div>
                            <input type="file" ref={referenceFileInputRef} onChange={(e) => handleImageUpload(e, 'reference')} className="hidden" accept="image/*" />
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">{t('autoColoring.outputDrawingLabel')}</label>
                        <div className="flex bg-[#364053] p-1 rounded-lg border border-gray-700">
                            <button onClick={() => setOutputDrawing(outputDrawingOptions[1])} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${outputDrawing === outputDrawingOptions[1] ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>2D</button>
                            <button onClick={() => setOutputDrawing(outputDrawingOptions[2])} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${outputDrawing === outputDrawingOptions[2] ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>3D</button>
                        </div>
                    </div>

                    {outputDrawing === outputDrawingOptions[1] && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Mô tả theo mẫu có sẵn</label>
                            <CustomSelect options={preset2D.map(p => p.label)} value={selectedPreset} onChange={handlePresetChange} placeholder="Chọn 1 mô tả gợi ý có sẵn" />
                        </div>
                    )}
                    
                    {outputDrawing === outputDrawingOptions[2] && !referenceImage && (
                        <CustomSelect label={t('autoColoring.styleLabel')} options={designStyles} value={designStyle} onChange={setDesignStyle} placeholder={t('autoColoring.stylePlaceholder')} />
                    )}

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-semibold">{t('autoColoring.descriptionLabel')}</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('autoColoring.descriptionPlaceholder')}></textarea>
                    </div>

                    <button onClick={() => handleGenerate()} disabled={!inputImage || isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-lg transition-colors disabled:bg-gray-500 mt-auto">
                        {isLoading ? t('autoColoring.generatingMessage') : t('autoColoring.generateBtn')}
                    </button>
                </aside>

                <section className="flex-grow flex flex-col p-6 min-h-0">
                    <div className="flex border-b border-gray-700 flex-shrink-0">
                        <button onClick={() => setActiveTab('results')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'results' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>{t('autoColoring.resultsTab')}</button>
                        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'history' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>{t('autoColoring.historyTab')}</button>
                    </div>
                    
                    <div className="flex-grow bg-[#202633] rounded-b-lg min-h-0 flex flex-col">
                         {activeTab === 'results' && (
                            <div className={`h-full p-4 flex items-center justify-center`}>
                                {isLoading ? (<div className="flex flex-col items-center text-gray-400"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div><p className="mt-4">{t('autoColoring.generatingMessage')}</p></div>)
                                : generatedImages.length > 0 ? (
                                    <div className="relative group bg-black/20 rounded-lg overflow-hidden flex items-center justify-center max-w-xl w-full aspect-square shadow-2xl border border-white/10">
                                        <img src={generatedImages[0]} alt="Generated result" className="max-w-full max-h-full object-contain" />
                                        <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setZoomedImage(generatedImages[0])} className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600"><MagnifyingGlassPlusIcon className="w-5 h-5" /></button>
                                            <a href={generatedImages[0]} download={`F9-result.png`} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-500"><ArrowDownTrayIcon className="w-5 h-5" /></a>
                                        </div>
                                    </div>
                                ) : (<div className="text-center text-gray-500"><LightbulbIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" /><h3 className="text-lg font-semibold">{t('autoColoring.resultsPlaceholderTitle')}</h3><p className="text-sm">{t('autoColoring.resultsPlaceholderSubtitle')}</p></div>)}
                            </div>
                        )}
                        {activeTab === 'history' && (
                            <div className="h-full flex flex-col p-4">
                                {sessionHistory.length === 0 ? (<div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500"><ClockIcon className="w-16 h-16 mb-4" /><h3 className="text-lg">{t('autoColoring.historyEmptyTitle')}</h3></div>)
                                : (<div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="grid grid-cols-1 gap-6">
                                            {paginatedHistory.map((item, index) => (
                                                <div key={index} className="bg-slate-800 p-4 rounded-lg">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="relative group aspect-square bg-black/20 rounded-md overflow-hidden">
                                                            <img src={item.outputs[0]} alt="Session Output" className="w-full h-full object-cover" />
                                                            <button onClick={() => setZoomedImage(item.outputs[0])} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><MagnifyingGlassPlusIcon className="w-8 h-8"/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
        </>
    );
};

export default AutoColoringPage;
