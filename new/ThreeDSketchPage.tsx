
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { SparklesPlaceholderIcon } from './components/icons/SparklesPlaceholderIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import { ArrowDownTrayIcon } from './components/icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './components/icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './components/icons/XMarkIcon';
import { ExclamationTriangleIcon } from './components/icons/ExclamationTriangleIcon';
import { ClockIcon } from './components/icons/ClockIcon';
import { PencilIcon } from './components/icons/PencilIcon';
import { ArrowPathIcon } from './components/icons/ArrowPathIcon';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useLanguage } from './hooks/useLanguage';
import { useMode } from './contexts/ModeContext';
import FilterDropdown from './components/FilterDropdown';
import Footer from './components/Footer';
import Pagination from './components/Pagination';
// Added: Import persistence utilities
import { saveHistory, HistoryRecord } from './lib/db';

interface ThreeDSketchPageProps {
    onNavigate: (page: string) => void;
    // Added: restoreData prop to resolve TypeScript error in App.tsx
    restoreData?: HistoryRecord | null;
}

interface HistoryItem {
    input: string;
    output: string;
}

const ThreeDSketchPage: React.FC<ThreeDSketchPageProps> = ({ onNavigate, restoreData }) => {
    const { t } = useLanguage();
    const { getModelName, isPro, proResolution } = useMode();
    const [inputImage, setInputImage] = useState<{ url: string; file: File } | null>(null);
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [outputStyle, setOutputStyle] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8; // Reduced for grid layout

    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return history.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [history, currentPage]);

    const outputDrawingOptions = useMemo(() => (Array.isArray(t('3dSketch.outputDrawingOptions')) ? t('3dSketch.outputDrawingOptions') : []), [t]);

    useEffect(() => {
        if (outputDrawingOptions.length > 0 && !outputStyle) {
            setOutputStyle(outputDrawingOptions[0]);
        }
    }, [outputDrawingOptions, outputStyle]);

    // Added: Restoration logic for session data from history
    useEffect(() => {
        if (restoreData && restoreData.page === '3d-sketch') {
            if (restoreData.inputImage) {
                fetch(restoreData.inputImage)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], "restored_input.png", { type: blob.type });
                        setInputImage({ url: restoreData.inputImage, file });
                    });
            }
            if (restoreData.outputImages && restoreData.outputImages.length > 0) {
                setOutputImage(restoreData.outputImages[0]);
            }
            if (restoreData.config && restoreData.config.outputStyle) {
                setOutputStyle(restoreData.config.outputStyle);
            }
        }
    }, [restoreData]);

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
            setOutputImage(null); // Clear previous output
        }
    };
    
    const handleGenerate = async () => {
        if (!inputImage) return;

        if (isPro) {
            if ((window as any).aistudio) {
                try {
                    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                    if (!hasKey) {
                        const success = await (window as any).aistudio.openSelectKey();
                        if (!success) return; 
                    }
                } catch(e) {
                    console.error("Failed to check/select API Key", e);
                }
            }
        }
    
        setError(null);
        setIsLoading(true);
        setOutputImage(null);
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const inputBase64 = await blobToBase64(inputImage.file);
            
            const getPrompt = () => {
                const selectedIndex = outputDrawingOptions.indexOf(outputStyle);
                switch (selectedIndex) {
                    case 0: return t('3dSketch.sketchPromptPencil');
                    case 1: return t('3dSketch.sketchPromptPencil2');
                    case 2: return t('3dSketch.sketchPromptWatercolor');
                    case 3: return t('3dSketch.sketchPromptVanGogh');
                    case 4: return t('3dSketch.sketchPromptd5');
                    default: return t('3dSketch.sketchPromptPencil');
                }
            };
    
            const parts = [
                { inlineData: { data: inputBase64, mimeType: inputImage.file.type } },
                { text: getPrompt() }
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
    
            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    
            if (imagePart && imagePart.inlineData) {
                const resultImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setOutputImage(resultImage);
                setHistory(prev => [{ input: inputImage.url, output: resultImage }, ...prev]);

                // Added: Persist generation to IndexedDB history
                const inputBase64Full = `data:${inputImage.file.type};base64,${inputBase64}`;
                saveHistory({
                    id: Math.random().toString(36).substr(2, 9),
                    page: '3d-sketch',
                    inputImage: inputBase64Full,
                    outputImages: [resultImage],
                    prompt: getPrompt(),
                    timestamp: Date.now(),
                    config: { outputStyle }
                });
            } else {
                setError(t('3dSketch.noImageGeneratedError'));
            }
        } catch (e) {
            setError(t('3dSketch.generationErrorMessage'));
            console.error("Error generating sketch:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const clearImage = () => {
        if (inputImage) {
            URL.revokeObjectURL(inputImage.url);
        }
        setInputImage(null);
        setOutputImage(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <>
        {zoomedImage && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
                <div className="relative max-w-[95vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <img src={zoomedImage} alt="Zoomed view" className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10" />
                    <div className="absolute -top-12 right-0 flex items-center gap-3">
                        <a href={zoomedImage} download={`[F9render.com]_sketch-${Date.now()}.png`} title={t('3dSketch.downloadBtn')} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                            <ArrowDownTrayIcon className="w-6 h-6" />
                        </a>
                        <button onClick={() => setZoomedImage(null)} title={t('autoColoring.closeBtn')} className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-all hover:scale-110">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col relative overflow-x-hidden selection:bg-pink-500 selection:text-white">
            
            {/* Ambient Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-900/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none"></div>

            <header className="sticky top-0 z-40 bg-[#0f172a]/80 backdrop-blur-lg border-b border-white/5">
                <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                    <button onClick={() => onNavigate('home')} className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-sm uppercase tracking-wider">Home</span>
                    </button>
                    <LanguageSwitcher />
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center px-4 py-8 relative z-10">
                
                {/* Title Section */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center justify-center p-3 mb-4 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 rounded-2xl border border-white/10 shadow-xl">
                        <PencilIcon className="w-8 h-8 text-pink-400" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-purple-200 font-architecture drop-shadow-lg">
                        {t('3dSketch.title')}
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
                        {t('3dSketch.subtitle')}
                    </p>
                </div>

                {/* Main Workspace */}
                <div className="w-full max-w-6xl mx-auto">
                    
                    {/* Control Bar */}
                    <div className="bg-[#1e293b]/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-center gap-4 shadow-2xl relative z-30">
                        <div className="flex-grow w-full md:w-auto">
                            <FilterDropdown
                                label={t('3dSketch.outputDrawingLabel')}
                                options={outputDrawingOptions}
                                value={outputStyle}
                                onChange={setOutputStyle}
                                placeholder={t('3dSketch.outputDrawingLabel')}
                            />
                        </div>
                        <button 
                            onClick={handleGenerate} 
                            disabled={!inputImage || isLoading} 
                            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>{t('3dSketch.generatingMessage')}</span>
                                </>
                            ) : (
                                <>
                                    <SparklesPlaceholderIcon className="w-5 h-5" />
                                    <span>{t('3dSketch.generateBtn')}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex flex-col lg:flex-row gap-6 lg:h-[600px]">
                        
                        {/* Input Area */}
                        <div className="flex-1 flex flex-col bg-[#1e293b]/40 backdrop-blur-sm border border-white/5 rounded-2xl p-4 shadow-lg group hover:border-pink-500/30 transition-colors">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    {t('3dSketch.inputTitle')}
                                </h3>
                                {inputImage && (
                                    <button onClick={clearImage} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-lg transition-colors">
                                        <TrashIcon className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex-grow relative rounded-xl overflow-hidden bg-[#0f172a]/50 border-2 border-dashed border-gray-700 hover:border-pink-500/50 transition-all cursor-pointer" onClick={triggerFileInput}>
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                {inputImage ? (
                                    <img src={inputImage.url} alt="Input" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-pink-400 transition-colors">
                                        <div className="p-4 rounded-full bg-white/5 mb-3 group-hover:bg-pink-500/10 transition-colors">
                                            <SparklesPlaceholderIcon className="w-12 h-12" />
                                        </div>
                                        <p className="text-sm font-medium">Click to upload 3D Model</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Connector (Desktop) */}
                        <div className="hidden lg:flex flex-col justify-center items-center text-gray-600">
                            <ArrowPathIcon className={`w-8 h-8 transform rotate-90 lg:rotate-0 ${isLoading ? 'animate-spin text-pink-500' : ''}`} />
                        </div>

                        {/* Output Area */}
                        <div className="flex-1 flex flex-col bg-[#1e293b]/40 backdrop-blur-sm border border-white/5 rounded-2xl p-4 shadow-lg group hover:border-purple-500/30 transition-colors">
                            <div className="flex justify-between items-center mb-3 px-1">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    {t('3dSketch.outputTitle')}
                                </h3>
                                {outputImage && (
                                    <a href={outputImage} download="sketch_output.png" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-lg transition-colors">
                                        <ArrowDownTrayIcon className="w-3 h-3" /> Save
                                    </a>
                                )}
                            </div>

                            <div className="flex-grow relative rounded-xl overflow-hidden bg-[#0f172a]/50 border border-gray-700 flex items-center justify-center">
                                {isLoading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 rounded-full border-4 border-purple-500/30"></div>
                                            <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 animate-spin"></div>
                                        </div>
                                        <p className="text-sm text-purple-300 animate-pulse">{t('3dSketch.generatingMessage')}</p>
                                    </div>
                                ) : outputImage ? (
                                    <div className="relative w-full h-full group/image">
                                        <img src={outputImage} alt="Output" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                            <button onClick={() => setZoomedImage(outputImage)} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                                                <MagnifyingGlassPlusIcon className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-gray-600 flex flex-col items-center">
                                        <PencilIcon className="w-12 h-12 mb-2 opacity-20" />
                                        <p className="text-sm font-medium opacity-50">Artwork will appear here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Gallery */}
                {history.length > 0 && (
                    <div className="w-full max-w-6xl mx-auto mt-16 border-t border-white/10 pt-10">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 font-architecture">
                            <ClockIcon className="w-6 h-6 text-pink-500" />
                            {t('3dSketch.historyTitle')}
                        </h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {paginatedHistory.map((item, index) => (
                                <div key={index} className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-pink-500/50 transition-all bg-[#1e293b]">
                                    <img src={item.output} alt="History" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={() => setZoomedImage(item.output)} className="p-2 bg-white/20 backdrop-blur-md rounded-lg hover:bg-white/40 text-white">
                                                <MagnifyingGlassPlusIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(history.length / ITEMS_PER_PAGE)}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}

                {error && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500/50 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md z-50 animate-fade-in">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                        <div>
                            <p className="font-bold text-sm">{t('3dSketch.generationErrorTitle')}</p>
                            <p className="text-xs text-red-200">{error}</p>
                        </div>
                        <button onClick={() => setError(null)} className="ml-4 hover:bg-white/10 p-1 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
                    </div>
                )}

            </main>
            <Footer />
        </div>
        </>
    );
};

export default ThreeDSketchPage;
