
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { apiClient, getImageSizeConfig, getImageSize } from './lib/api';
import { useLanguage } from './hooks/useLanguage';
import { useMode } from './contexts/ModeContext';
import { useSnow } from './contexts/SnowContext';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import LanguageSwitcher from './components/LanguageSwitcher';
import { PhotoIcon } from './components/icons/PhotoIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import SmartFilterInput from './components/SmartFilterInput';
import { ArrowDownTrayIcon } from './components/icons/ArrowDownTrayIcon';
import { MagnifyingGlassPlusIcon } from './components/icons/MagnifyingGlassPlusIcon';
import { XMarkIcon } from './components/icons/XMarkIcon';
import { ClockIcon } from './components/icons/ClockIcon';
import MaterialFilter from './components/MaterialFilter';
import Accordion from './components/Accordion';
import ImageEditor from './components/ImageEditor';
import LightingFilter from './components/LightingFilter';
import TimeAndClimateFilter from './components/TimeAndClimateFilter';
import LightToneFilter from './components/LightToneFilter';
import OnlineStatus from './components/OnlineStatus';
import CustomSelect from './components/CustomSelect';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { BoltIcon } from './components/icons/BoltIcon';
import ImageEditMainPage from './ImageEditMainPage';
import Footer from './components/Footer';
import Pagination from './components/Pagination';
import { VideoCameraIcon } from './components/icons/VideoCameraIcon';
import { SingleImageCropModal } from './components/SingleImageCropModal';
import { ArrowTopRightOnSquareIcon } from './components/icons/ArrowTopRightOnSquareIcon';
import FilterDropdown from './components/FilterDropdown';
import OtherUtilsPage from './components/OtherUtilsPage';
// Added: Import persistence utilities
import { saveHistory, HistoryRecord } from './lib/db';
import { useAuth } from './contexts/AuthContext';
import UpgradeModal from './components/UpgradeModal';


interface ImageGenerationPageProps {
    onNavigate: (page: string) => void;
    // Added: restoreData prop to resolve TypeScript error in App.tsx
    restoreData?: HistoryRecord | null;
}

interface HistoryItem {
    input: string;
    reference?: string;
    outputs: string[];
}

const ImageWithDimensions: React.FC<{ src: string; alt?: string; className?: string }> = ({ src, alt, className }) => {
    const [dim, setDim] = useState<{w: number, h: number} | null>(null);
    return (
        <>
            <img 
                src={src} 
                alt={alt} 
                className={className} 
                onLoad={(e) => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} 
            />
            {dim && (
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-orange-400 text-xs font-mono font-bold px-2 py-1 rounded shadow-lg border border-orange-500/30 z-20 pointer-events-none tracking-widest">
                    {dim.w} × {dim.h}
                </div>
            )}
        </>
    );
};

// Helper function to convert data URL to File object
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

const cropImage = (file: File, aspectRatio: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            const imgRatio = img.width / img.height;
            let sWidth = img.width;
            let sHeight = img.height;
            let sx = 0;
            let sy = 0;

            if (imgRatio > aspectRatio) {
                // Image is wider than target, crop width
                sWidth = img.height * aspectRatio;
                sx = (img.width - sWidth) / 2;
            } else {
                // Image is taller than target, crop height
                sHeight = img.width / aspectRatio;
                sy = (img.height - sHeight) / 2;
            }

            canvas.width = sWidth;
            canvas.height = sHeight;

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

            canvas.toBlob((blob) => {
                if (blob) {
                    const newFile = new File([blob], file.name, { type: file.type, lastModified: Date.now() });
                    resolve(newFile);
                } else {
                    reject(new Error('Canvas to Blob failed'));
                }
            }, file.type);
        };
        img.onerror = (e) => reject(e);
        img.src = URL.createObjectURL(file);
    });
};

const ContextLocationViewFilter: React.FC<{ onDescriptionChange: (desc: string) => void }> = ({ onDescriptionChange }) => {
    const { t } = useLanguage();
    const [buildingLocation, setBuildingLocation] = useState('');
    const [viewDirection, setViewDirection] = useState('');
    const [manualDescription, setManualDescription] = useState('');
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

    const buildingLocationSuggestions = useMemo(() => {
        const locationsData = t('imageGenerationPage.sidebar.contextLocationView.buildingLocations');
        if (!locationsData || typeof locationsData !== 'object') return [];
        return Object.values(locationsData).flatMap((group: any) => group.options);
    }, [t]);

    const viewDirectionSuggestions = useMemo(() => {
        const viewsData = t('imageGenerationPage.sidebar.contextLocationView.viewDirections');
        if (!viewsData || typeof viewsData !== 'object') return [];
        return Object.values(viewsData).flatMap((group: any) => group.options);
    }, [t]);

    useEffect(() => {
        if (!buildingLocation && !viewDirection) {
            setManualDescription('');
            return;
        }
        const desc = t('imageGenerationPage.sidebar.contextLocationView.promptTemplate', {
            location: buildingLocation || '...',
            view: viewDirection || '...',
        });
        setManualDescription(desc);
    }, [buildingLocation, viewDirection, t]);

    useEffect(() => {
        onDescriptionChange(manualDescription);
    }, [manualDescription, onDescriptionChange]);

    const toggleAccordion = (accordionName: string) => {
        setOpenAccordion(prev => (prev === accordionName ? null : accordionName));
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.contextLocationView.title')}</label>
            <textarea
                value={manualDescription}
                onChange={e => setManualDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={t('imageGenerationPage.sidebar.contextLocationView.placeholder')}
            />
            <p className="text-xs text-gray-500 mt-1 mb-2">*{t('imageGenerationPage.sidebar.contextLocationView.note')}</p>
            <div className="bg-[#364053] rounded-lg">
                 <Accordion
                    title={t('imageGenerationPage.sidebar.contextLocationView.buildingLocationTitle')}
                    count={buildingLocation ? 1 : 0}
                    isOpen={openAccordion === 'location'}
                    onToggle={() => toggleAccordion('location')}
                    variant="secondary"
                >
                    <SmartFilterInput
                        id="building-location"
                        value={buildingLocation}
                        onChange={setBuildingLocation}
                        placeholder={t('imageGenerationPage.sidebar.contextLocationView.buildingLocationTitle')}
                        suggestions={buildingLocationSuggestions}
                    />
                </Accordion>
                <Accordion
                    title={t('imageGenerationPage.sidebar.contextLocationView.viewDirectionTitle')}
                    count={viewDirection ? 1 : 0}
                    isOpen={openAccordion === 'view'}
                    onToggle={() => toggleAccordion('view')}
                    variant="secondary"
                >
                    <SmartFilterInput
                        id="view-direction"
                        value={viewDirection}
                        onChange={setViewDirection}
                        placeholder={t('imageGenerationPage.sidebar.contextLocationView.viewDirectionTitle')}
                        suggestions={viewDirectionSuggestions}
                    />
                </Accordion>
            </div>
        </div>
    );
};

const AngleSuggestionList: React.FC<{ suggestions: string | null; onSelect: (suggestion: string) => void; }> = ({ suggestions, onSelect }) => {
    if (!suggestions) return null;

    const cleanAndSplit = (text: string) => {
        return text.replace(/^(###|#|\*|-|\d+\.\s*)/, '').trim();
    };

    const sections: { title: string; prompts: string[] }[] = [];
    let currentSection: { title: string; prompts: string[] } | null = null;
    const seenPrompts = new Set<string>();

    suggestions.split('\n').forEach(line => {
        line = line.trim();
        if (!line) return;

        // Skip intro lines or conversational filler
        if (line.match(/^(Dưới đây|Here|Sure|Based|Tuyệt|Great|Chắc chắn|Sau đây|Danh sách)/i)) return;

        if (line.startsWith('###')) {
            if (currentSection) {
                sections.push(currentSection);
            }
            currentSection = { title: cleanAndSplit(line), prompts: [] };
        } else {
            // Identify list items or bold headers that serve as prompts
            const isListItem = /^\d+\.|^\*|^-|^•/.test(line);
            const isBoldItem = /^\*\*.+\*\*/.test(line);

            if (isListItem || isBoldItem) {
                const promptText = cleanAndSplit(line);
                if (promptText && !seenPrompts.has(promptText)) {
                    seenPrompts.add(promptText);
                    if (currentSection) {
                        currentSection.prompts.push(promptText);
                    } else {
                        if (sections.length === 0) sections.push({ title: '', prompts: [] });
                        sections[sections.length - 1].prompts.push(promptText);
                    }
                }
            }
        }
    });

    if (currentSection) sections.push(currentSection);

    // Fallback if no sections were created but text exists (and hasn't been filtered out)
    if (sections.length === 0 && seenPrompts.size > 0) {
         sections.push({ title: '', prompts: Array.from(seenPrompts) });
    }

    return (
        <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                    {section.title && (
                        <h4 className="text-white font-semibold text-base mb-2 flex items-center gap-2">
                            <span className="bg-blue-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded">{sectionIndex + 1}</span>
                            {section.title}
                        </h4>
                    )}
                    <ul className="space-y-1 pl-1">
                        {section.prompts.map((prompt, promptIndex) => (
                            <li key={promptIndex}>
                                <button
                                    onClick={() => onSelect(prompt)}
                                    className="w-full text-left text-sm text-gray-300 p-2 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    {prompt}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

const ImageToVideoUI: React.FC = () => {
    const { t, locale } = useLanguage();
    const { isPro, getModelName, proResolution } = useMode();
    const [videoScriptImages, setVideoScriptImages] = useState<{ id: number; url: string; file: File }[]>([]);
    const nextId = useRef(0);
    const videoScriptInputRef = useRef<HTMLInputElement>(null);
    const MAX_IMAGES = 30;

    const [storyScript, setStoryScript] = useState('');
    const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
    const [isCropping, setIsCropping] = useState(false);
    const [editingImageId, setEditingImageId] = useState<number | null>(null);
    
    const [characterImage, setCharacterImage] = useState<{ url: string; file: File } | null>(null);
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [characterPoseDescription, setCharacterPoseDescription] = useState('');
    const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [selectedContextImageIds, setSelectedContextImageIds] = useState<number[]>([]);
    const characterFileInputRef = useRef<HTMLInputElement>(null);

    interface MotionPrompt {
        image_title: string;
        script_position: string;
        video_prompt: string;
        isGeneratingVideo?: boolean;
        videoUri?: string;
        videoError?: string;
    }
    const [motionPrompts, setMotionPrompts] = useState<MotionPrompt[]>([]);
    const [isGeneratingMotionPrompts, setIsGeneratingMotionPrompts] = useState(false);
    const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);

    const [videoResultsPage, setVideoResultsPage] = useState(1);
    const VIDEO_RESULTS_PER_PAGE = 5;

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };
    
    const handleAnalyzeImages = async () => {
        if (videoScriptImages.length === 0 || isAnalyzingScript) return;
    
        setIsAnalyzingScript(true);
        setStoryScript('');
    
        try {
    
            const imageParts = await Promise.all(
                videoScriptImages.map(async (image) => {
                    const base64Data = await blobToBase64(image.file);
                    return {
                        inlineData: {
                            data: base64Data,
                            mimeType: image.file.type,
                        },
                    };
                })
            );
    
            const textPart = {
                text: t('imageGenerationPage.toVideo.analysisPrompt'),
            };
            
            const allParts = [...imageParts, textPart];

            const schema = {
                type: 'OBJECT',
                properties: {
                    script: { 
                        type: 'STRING',
                        description: "The video script content based on the ordered images."
                    },
                    imageOrder: {
                        type: 'ARRAY',
                        description: "An array of integers representing the new sorted order of images, starting from index 0.",
                        items: { type: 'INTEGER' }
                    }
                },
                required: ['script', 'imageOrder']
            };
    
            const response = await apiClient.generateContent({
                model: getModelName('text'), 
                contents: { parts: allParts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            });
    
            const result = JSON.parse(response.text);

            if (result.script) {
                setStoryScript(result.script);
            }
    
            if (result.imageOrder && Array.isArray(result.imageOrder) && result.imageOrder.length === videoScriptImages.length) {
                const newOrder: number[] = result.imageOrder;
                const expectedIndices = Array.from({ length: videoScriptImages.length }, (_, i) => i);
                const receivedIndicesSorted = [...newOrder].sort((a, b) => a - b);

                if (JSON.stringify(expectedIndices) === JSON.stringify(receivedIndicesSorted)) {
                     const reorderedImages = newOrder.map(index => videoScriptImages[index]);
                     setVideoScriptImages(reorderedImages);
                } else {
                    console.warn("AI returned an invalid image order. Not reordering images.", newOrder);
                    setStoryScript(prev => prev + "\n\n(Lưu ý: AI đã trả về thứ tự ảnh không hợp lệ, ảnh chưa được sắp xếp lại.)");
                }
            } else {
                 console.warn("AI response did not contain a valid imageOrder array. Not reordering images.");
            }
    
        } catch (error) {
            console.error("Error analyzing images for video script:", error);
            setStoryScript(t('imageGenerationPage.toVideo.analysisError'));
        } finally {
            setIsAnalyzingScript(false);
        }
    };

    const handleCreateMotionPrompts = async () => {
        if (!storyScript || videoScriptImages.length === 0 || isGeneratingMotionPrompts) return;

        // Force check API key if Pro mode        }
    
        setIsGeneratingMotionPrompts(true);
        setMotionPrompts([]);
        setVideoResultsPage(1);
    
        try {
            
            // Build multimodal input: Interleave labels and images so AI knows which is which
            const contentParts: any[] = [];
            
            for (let i = 0; i < videoScriptImages.length; i++) {
                const img = videoScriptImages[i];
                const b64 = await blobToBase64(img.file);
                // Context label for the image
                contentParts.push({ text: `[Image Index ${i}]` });
                contentParts.push({ inlineData: { data: b64, mimeType: img.file.type } });
            }

            const langInstruction = locale === 'vi' ? 'Tiếng Việt' : 'English';

            // Detailed System Instruction for Veo/Video Generation
            const systemPrompt = `Bạn là chuyên gia kỹ thuật Video AI (Visual Director) sử dụng mô hình Google Veo.
Nhiệm vụ: Viết prompt tạo video chi tiết cho TỪNG bức ảnh được cung cấp ở trên, dựa theo dòng chảy kịch bản tổng thể: "${storyScript}".

YÊU CẦU KỸ THUẬT BẮT BUỘC CHO TỪNG PROMPT (tương ứng mỗi ảnh):
1. **Mô tả Hình ảnh (Visuals)**: Mô tả cực kỳ chi tiết nội dung chính xác nhìn thấy trong ảnh (ánh sáng, vật liệu, bố cục). TUYỆT ĐỐI KHÔNG thêm chi tiết không có trong ảnh gốc (chống ảo giác/hallucination).
2. **Chuyển động Camera (Camera Movement)**: Chỉ định rõ kỹ thuật điện ảnh (Pan Left/Right, Tilt Up/Down, Zoom In/Out, Dolly, Truck, Static, Orbit) phù hợp nhất để kể chuyện cho cảnh đó.
3. **Diễn biến (Motion & Action)**: Mô tả sự thay đổi của cảnh vật, ánh sáng, hoặc hành động nhân vật diễn ra trong khoảng 8 giây. Đảm bảo tính liên kết logic với ảnh trước và sau nó trong chuỗi kịch bản.
4. **Ngôn ngữ**: Kết quả trả về (video_prompt) phải viết hoàn toàn bằng ${langInstruction}.

Output format: Trả về một JSON Array, mỗi phần tử là một object:
{
  "image_index": number (chỉ số ảnh 0, 1, 2...),
  "image_title": string (Tiêu đề ngắn gọn cho cảnh),
  "script_position": string (Giải thích ngắn gọn vai trò của cảnh này trong kịch bản tổng),
  "video_prompt": string (Prompt kỹ thuật chi tiết dùng để generate video, bao gồm mô tả visual + camera + 8s motion)
}`;

            contentParts.push({ text: systemPrompt });
    
            const schema = {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        image_index: { type: 'INTEGER' },
                        image_title: { type: 'STRING' },
                        script_position: { type: 'STRING' },
                        video_prompt: { type: 'STRING' },
                    },
                    required: ['image_title', 'script_position', 'video_prompt'],
                },
            };
    
            // Use Gemini 3 Pro Image Preview
            // If in Free mode, attempt to use the best available free model that handles mixed inputs well.
            const modelName = getModelName('text');

            const isImageModel = modelName.includes('image');

            const response = await apiClient.generateContent({
                model: modelName, 
                contents: { parts: contentParts },
                config: isImageModel ? {
                    maxOutputTokens: 8192,
                } : {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    maxOutputTokens: 8192, // Allow long detailed prompts
                },
            });
    
            const result = JSON.parse(response.text);
            if (Array.isArray(result)) {
                setMotionPrompts(result.map((item: any) => ({
                    image_title: item.image_title || `Scene ${item.image_index}`,
                    script_position: item.script_position,
                    video_prompt: item.video_prompt
                })));
            } else {
                 console.error("AI did not return a valid array for motion prompts.");
            }
    
        } catch (error) {
            console.error("Error generating motion prompts:", error);
            alert("Có lỗi xảy ra khi tạo prompt chuyển động. Vui lòng thử lại.");
        } finally {
            setIsGeneratingMotionPrompts(false);
        }
    };

    const handleGenerateVideo = async (index: number) => {

        setMotionPrompts(prev => prev.map((p, i) => i === index ? { ...p, isGeneratingVideo: true, videoError: undefined, videoUri: undefined } : p));

        try {
            const imageItem = videoScriptImages[index]; 
            if (!imageItem) {
                throw new Error("Image not found for this prompt.");
            }

            const img = new Image();
            const imgLoadPromise = new Promise<{width: number, height: number}>((resolve, reject) => {
                img.onload = () => resolve({width: img.width, height: img.height});
                img.onerror = reject;
                img.src = imageItem.url;
            });
            
            const {width, height} = await imgLoadPromise;
            const targetAspectRatio = width >= height ? '16:9' : '9:16';

            const promptItem = motionPrompts[index];
            const base64Data = await blobToBase64(imageItem.file);

            // TODO: Video generation is not yet migrated to the backend proxy.
            // This feature requires a dedicated /api/generate-videos endpoint.
            throw new Error('Video generation is not yet available through the backend proxy. This feature will be enabled in a future update.');

            /* Dead code — video proxy not yet implemented
            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
            
            if (videoUri) {
                const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
                if (!videoResponse.ok) {
                    throw new Error(`Failed to download video content: ${videoResponse.status} ${videoResponse.statusText}`);
                }
                const videoBlob = await videoResponse.blob();
                const videoLocalUrl = URL.createObjectURL(videoBlob);

                setMotionPrompts(prev => prev.map((p, i) => i === index ? { ...p, isGeneratingVideo: false, videoUri: videoLocalUrl } : p));
            } else {
                throw new Error("No video URI returned.");
            }
            */

        } catch (error: any) {
            console.error("Error generating video:", error);
            let errorMessage = error.message || "Failed to generate video. Please try again.";
            
            if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("404")) {
                errorMessage = "Lỗi: Không tìm thấy mô hình Veo (404). Vui lòng đảm bảo bạn đã chọn API Key từ dự án có tính phí (Paid Project).";
            } else if (errorMessage.includes("400")) {
                 errorMessage = "Lỗi yêu cầu (400). Vui lòng kiểm tra lại ảnh đầu vào hoặc prompt.";
            }

            setMotionPrompts(prev => prev.map((p, i) => i === index ? { ...p, isGeneratingVideo: false, videoError: errorMessage } : p));
        }
    };

    const handleCopyPrompt = (prompt: string, index: number) => {
        navigator.clipboard.writeText(prompt);
        setCopiedPromptIndex(index);
        setTimeout(() => setCopiedPromptIndex(null), 2000);
    };

    const handleVideoScriptImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        const remainingSlots = MAX_IMAGES - videoScriptImages.length;

        if (remainingSlots <= 0) {
            alert(t('imageGenerationPage.toVideo.limitReached'));
            return;
        }

        const filesToUpload = newFiles.slice(0, remainingSlots);
        const newImages = filesToUpload.map((file: File) => ({
            id: nextId.current++,
            url: URL.createObjectURL(file),
            file: file
        }));

        setVideoScriptImages(prevImages => [...prevImages, ...newImages]);
        
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleRemoveVideoScriptImage = (idToRemove: number) => {
        setVideoScriptImages(prevImages => {
            const imageToRemove = prevImages.find(img => img.id === idToRemove);
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.url);
            }
            return prevImages.filter(image => image.id !== idToRemove);
        });
        setSelectedContextImageIds(prev => prev.filter(id => id !== idToRemove));
    };

    const handleCropImages = async (aspectRatio: number) => {
        if (videoScriptImages.length === 0) return;
        setIsCropping(true);
        try {
            const croppedImages = await Promise.all(videoScriptImages.map(async (imgItem) => {
                const croppedFile = await cropImage(imgItem.file, aspectRatio);
                URL.revokeObjectURL(imgItem.url);
                return {
                    ...imgItem,
                    url: URL.createObjectURL(croppedFile),
                    file: croppedFile
                };
            }));
            setVideoScriptImages(croppedImages);
        } catch (error) {
            console.error("Error cropping images:", error);
            alert("Failed to crop images. Please try again.");
        } finally {
            setIsCropping(false);
        }
    };

    const handleSaveCroppedImage = (croppedFile: File) => {
        if (editingImageId === null) return;

        setVideoScriptImages(prevImages => prevImages.map(img => {
            if (img.id === editingImageId) {
                URL.revokeObjectURL(img.url);
                return {
                    ...img,
                    file: croppedFile,
                    url: URL.createObjectURL(croppedFile)
                };
            }
            return img;
        }));
        setEditingImageId(null);
    };

    const handleCharacterImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (characterImage) URL.revokeObjectURL(characterImage.url);
            const url = URL.createObjectURL(file);
            setCharacterImage({ url, file });
        }
    };

    const handleGenerateCharacter = async () => {
        if (!characterPrompt) return;

        if (isPro) {
        }

        setIsGeneratingCharacter(true);
        try {
            
            let prompt = characterPrompt;
            if (isPro) {
                prompt += proResolution === '4k' ? " Output resolution 4K, highly detailed." : proResolution === '1k' ? " Output resolution 1K." : " Output resolution 2K, high quality.";
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
                const file = dataURLtoFile(url, 'generated-character.png');
                
                if (characterImage) URL.revokeObjectURL(characterImage.url);
                setCharacterImage({ url, file });
            } else {
                throw new Error("API returned no image data.");
            }
        } catch (error: any) {
            console.error("Error generating character:", error);
            let errorMsg = "Failed to generate character.";
            if (error.message?.includes("permission denied") || error.message?.includes("403") || error.message?.includes("404") || error.message?.includes("Requested entity was not found")) {
                errorMsg = "Lỗi quyền truy cập: Vui lòng chọn API Key từ dự án có tính phí (Paid Project) để sử dụng mô hình tạo ảnh cao cấp.";
            }
            alert(errorMsg);
        } finally {
            setIsGeneratingCharacter(false);
        }
    };

    const toggleContextImageSelection = (id: number) => {
        setSelectedContextImageIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleCharacterPoseDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCharacterPoseDescription(e.target.value);
    };

    const handleMergeCharacter = async () => {
        if (!characterImage || selectedContextImageIds.length === 0 || !characterPoseDescription) {
            alert("Vui lòng chọn ảnh nhân vật, ít nhất một ảnh bối cảnh và nhập mô tả hành động.");
            return;
        }

        setIsMerging(true);
        try {
            const characterBase64 = await blobToBase64(characterImage.file);

            for (const contextId of selectedContextImageIds) {
                const contextImage = videoScriptImages.find(img => img.id === contextId);
                if (!contextImage) continue;

                const contextBase64 = await blobToBase64(contextImage.file);

                let mergePrompt = `You are an expert in photorealistic contextual image generation.
Task: Regenerate the scene depicted in the 'Background Image', integrating the character from the 'Character Image' into it.
Instructions:
1. **Contextual Integration:** The character must be physically present within the 3D space of the room/environment (not just a flat overlay).
2. **Pose & Action:** The character MUST be performing the following action: "${characterPoseDescription}". Adjust the character's pose to interact naturally with the environment (e.g., if the description says 'sitting', they must be seated on appropriate furniture in the scene; if 'standing', feet must be planted on the floor).
3. **Visual Consistency:** Maintain the character's visual identity (face, hair, outfit style) from the 'Character Image' as closely as possible, but adapt the lighting, shadows, and perspective to match the 'Background Image' perfectly.
4. **Output:** A single, high-quality, photorealistic image.`;

                if (isPro) {
                    mergePrompt += proResolution === '4k' ? " Output resolution 4K, highly detailed." : proResolution === '1k' ? " Output resolution 1K." : " Output resolution 2K, high quality.";
                }

                const parts = [
                    { inlineData: { data: contextBase64, mimeType: contextImage.file.type } }, 
                    { inlineData: { data: characterBase64, mimeType: characterImage.file.type } }, 
                    { text: mergePrompt }
                ];

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
                    const resultBase64 = imagePart.inlineData.data;
                    const mimeType = imagePart.inlineData.mimeType;
                    const resultUrl = `data:${mimeType};base64,${resultBase64}`;
                    const resultFile = dataURLtoFile(resultUrl, `merged-character-${Date.now()}.png`);

                    const newId = nextId.current++;
                    setVideoScriptImages(prev => [...prev, {
                        id: newId,
                        url: URL.createObjectURL(resultFile),
                        file: resultFile
                    }]);
                }
            }
        } catch (error) {
            console.error("Error merging character:", error);
            alert("Failed to merge character into images. Please try again.");
        } finally {
            setIsMerging(false);
        }
    };
    
    useEffect(() => {
        return () => {
            videoScriptImages.forEach(image => URL.revokeObjectURL(image.url));
            if (characterImage) URL.revokeObjectURL(characterImage.url);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const triggerFileInput = () => {
        videoScriptInputRef.current?.click();
    };

    const editingImage = videoScriptImages.find(img => img.id === editingImageId);

    const totalVideoPages = Math.ceil(motionPrompts.length / VIDEO_RESULTS_PER_PAGE);
    const visibleMotionPrompts = motionPrompts.slice(
        (videoResultsPage - 1) * VIDEO_RESULTS_PER_PAGE,
        videoResultsPage * VIDEO_RESULTS_PER_PAGE
    );

    return (
        <div className="flex-grow flex flex-col lg:flex-row min-h-0">
            <aside className="w-full lg:w-[384px] flex-shrink-0 bg-[#202633] p-6 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-gray-700 custom-scrollbar overflow-y-auto">
                <div className="space-y-4">
                    <h2 className="font-semibold text-white text-lg">1. {t('imageGenerationPage.toVideo.uploadTitle')}</h2>
                     <input 
                        type="file" 
                        ref={videoScriptInputRef} 
                        onChange={handleVideoScriptImageUpload} 
                        multiple 
                        accept="image/*" 
                        className="hidden"
                    />
                    
                    {videoScriptImages.length === 0 ? (
                        <div 
                            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-gray-500 cursor-pointer"
                            onClick={triggerFileInput}
                        >
                            <div className="flex flex-col items-center justify-center text-gray-500">
                                <PhotoIcon className="w-12 h-12 mb-2" />
                                <p className="text-sm">{t('imageGenerationPage.toVideo.uploadPlaceholder')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800 p-3 rounded-lg max-h-96 overflow-y-auto custom-scrollbar">
                             <div className="grid grid-cols-3 gap-2">
                                {videoScriptImages.map((image) => (
                                    <div 
                                        key={image.id} 
                                        className="relative group aspect-square cursor-pointer border border-transparent hover:border-orange-500 rounded-md overflow-hidden"
                                        onClick={() => setEditingImageId(image.id)}
                                        title="Click để chỉnh sửa / crop ảnh"
                                    >
                                        <img src={image.url} alt={`upload-preview-${image.id}`} className="w-full h-full object-cover rounded-md" />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemoveVideoScriptImage(image.id); }}
                                            title={t('imageGenerationPage.toVideo.removeImageTooltip')}
                                            className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-sm text-center text-gray-400">
                            {t('imageGenerationPage.toVideo.imageLimit', { count: videoScriptImages.length })}
                        </p>
                        {videoScriptImages.length > 0 && videoScriptImages.length < MAX_IMAGES ? (
                             <button onClick={triggerFileInput} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
                                {t('imageGenerationPage.toVideo.addMoreBtn')}
                            </button>
                        ) : videoScriptImages.length === 0 ? (
                            <button onClick={triggerFileInput} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2.5 rounded-lg transition-colors">
                                {t('imageGenerationPage.toVideo.uploadBtn')}
                            </button>
                        ) : null}

                        {videoScriptImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <button 
                                    onClick={() => handleCropImages(9/16)}
                                    disabled={isCropping}
                                    className="bg-green-800 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 shadow-md border border-green-600"
                                >
                                    {isCropping ? 'Đang xử lý...' : 'Crop 9:16'}
                                </button>
                                <button 
                                    onClick={() => handleCropImages(16/9)}
                                    disabled={isCropping}
                                    className="bg-green-800 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 shadow-md border border-green-600"
                                >
                                    {isCropping ? 'Đang xử lý...' : 'Crop 16:9'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-700">
                    <h2 className="font-semibold text-white text-lg">Thêm nhân vật ( Add characters) </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <div 
                                className="relative border-2 border-dashed border-gray-600 rounded-lg p-2 flex flex-col items-center justify-center text-center h-32 hover:border-gray-500 cursor-pointer"
                                onClick={() => characterFileInputRef.current?.click()}
                            >
                                {characterImage ? (
                                    <>
                                        <img src={characterImage.url} alt="Character preview" className="max-h-full max-w-full object-contain rounded-md" />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if(characterImage) URL.revokeObjectURL(characterImage.url); setCharacterImage(null); if(characterFileInputRef.current) characterFileInputRef.current.value=''; }} 
                                            className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 hover:bg-red-500"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <PhotoIcon className="w-6 h-6 mb-1" />
                                        <p className="text-xs">Kéo thả, dán, hoặc nhấp để tải lên ( Drag and drop, paste, or click to upload. ) </p>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={characterFileInputRef} onChange={handleCharacterImageUpload} className="hidden" accept="image/*" />
                            <button onClick={() => characterFileInputRef.current?.click()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
                                Tải ảnh nhân vật
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <textarea
                                value={characterPrompt}
                                onChange={(e) => setCharacterPrompt(e.target.value)}
                                className="w-full h-32 bg-slate-800 border border-slate-600 text-white rounded-lg p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                                placeholder="Prompt nhân vật bạn muốn tạo...( Prompt the character you want to create...)"
                            />
                            <button 
                                onClick={handleGenerateCharacter}
                                disabled={isGeneratingCharacter || !characterPrompt}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                                {isGeneratingCharacter ? 'Đang tạo...' : 'Tự tạo nhân vật'}
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-yellow-500 italic">* Chú ý: Nên tách nền nhân vật và rõ mặt , trang phục để AI nhận tốt nhất (The background of the character should be separated, and their face and clothing should be clearly visible for the best AI recognition. )</p>

                    {(characterImage) && videoScriptImages.length > 0 && (
                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-semibold text-white">Chọn ảnh để thêm nhân vật</label>
                            <div className="bg-slate-800 p-2 rounded-lg max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                                {videoScriptImages.map((image) => (
                                    <div key={image.id} className="flex items-center gap-3 p-1 hover:bg-slate-700 rounded transition-colors">
                                        <input 
                                            type="checkbox" 
                                            id={`ctx-img-${image.id}`}
                                            checked={selectedContextImageIds.includes(image.id)}
                                            onChange={() => toggleContextImageSelection(image.id)}
                                            className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-700"
                                        />
                                        <img src={image.url} alt={`Thumb ${image.id}`} className="w-10 h-10 object-cover rounded bg-black" />
                                        <label htmlFor={`ctx-img-${image.id}`} className="text-sm text-gray-300 cursor-pointer flex-grow">Ảnh {image.id + 1}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(characterImage) && (
                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-semibold text-white">Mô tả hành động/tư thế (Prompt)</label>
                            <textarea
                                value={characterPoseDescription}
                                onChange={handleCharacterPoseDescriptionChange}
                                className="w-full h-24 bg-slate-800 border border-slate-600 text-white rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Ví dụ: Cô ấy đang ngồi thư giãn trên ghế sofa màu kem, hướng mắt nhìn ra cửa sổ..."
                            />
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleMergeCharacter}
                    disabled={isMerging || !characterImage || selectedContextImageIds.length === 0 || !characterPoseDescription}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg text-lg transition-colors shadow-md mt-4 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isMerging ? 'Đang tạo nhân vật...' : 'Ghép nhân vật vào ảnh (Adding characters to photos)'}
                </button>
                
                <div className="space-y-4">
                    <button 
                        onClick={handleAnalyzeImages}
                        className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={videoScriptImages.length === 0 || isAnalyzingScript}
                    >
                        {isAnalyzingScript ? t('imageGenerationPage.toVideo.analyzingScript') : t('imageGenerationPage.toVideo.analyzeBtn')}
                    </button>
                </div>

                <div className="space-y-4 flex-grow flex flex-col">
                    <h2 className="font-semibold text-white text-lg">{t('imageGenerationPage.toVideo.storyFlowTitle')}</h2>
                    <div 
                         className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 flex-grow whitespace-pre-wrap overflow-y-auto max-h-[300px] custom-scrollbar"
                    >
                         {isAnalyzingScript ? (
                             <div className="flex items-center justify-center h-full text-gray-400 italic">
                                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 Đang phân tích và tạo kịch bản...
                             </div>
                         ) : storyScript ? (
                             storyScript
                         ) : (
                             <span className="text-gray-500">{t('imageGenerationPage.toVideo.storyFlowPlaceholder')}</span>
                         )}
                    </div>
                </div>

                <button 
                    onClick={handleCreateMotionPrompts}
                    disabled={!storyScript || isGeneratingMotionPrompts}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-lg transition-colors mt-auto disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {isGeneratingMotionPrompts ? t('imageGenerationPage.toVideo.generatingMotionPrompts') : t('imageGenerationPage.toVideo.createMotionPromptBtn')}
                </button>
            </aside>

            {/* Right Main Panel */}
            <main className="flex-grow p-4 lg:p-6 flex flex-col bg-[#282f3d]">
                <div className="flex border-b border-gray-700 flex-shrink-0">
                    <button className="px-4 py-2 text-sm font-medium text-white border-b-2 border-orange-500">Kết quả</button>
                    <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white">Lịch sử</button>
                </div>
                <div className="flex-grow bg-[#282f3d] rounded-b-lg flex flex-col pt-4 min-h-0">
                    {isGeneratingMotionPrompts ? (
                        <div className="flex-grow flex items-center justify-center">
                            <div className="flex flex-col items-center text-gray-400">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400"></div>
                                <p className="mt-4">{t('imageGenerationPage.toVideo.generatingMotionPrompts')}</p>
                            </div>
                        </div>
                    ) : visibleMotionPrompts.length > 0 ? (
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-4">
                                {visibleMotionPrompts.map((prompt, index) => {
                                    const originalIndex = (videoResultsPage - 1) * VIDEO_RESULTS_PER_PAGE + index;
                                    return (
                                        <div key={originalIndex} className="bg-[#202633] p-4 rounded-lg border border-gray-700 space-y-3 animate-fade-in">
                                            <h3 className="text-lg font-bold text-orange-400">{prompt.image_title}</h3>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-300 mb-1">{t('imageGenerationPage.toVideo.motionResultItemPosition')}</p>
                                                <p className="text-sm text-gray-400 italic bg-slate-800 p-2 rounded-md">{prompt.script_position}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-300 mb-1">{t('imageGenerationPage.toVideo.motionResultItemPrompt')}</p>
                                                <div className="relative bg-slate-800 p-2 rounded-md flex gap-3">
                                                    <div className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden border border-gray-600 bg-black">
                                                        {videoScriptImages[originalIndex] && (
                                                            <img 
                                                                src={videoScriptImages[originalIndex].url} 
                                                                alt={prompt.image_title} 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-sm text-cyan-300 font-mono whitespace-pre-wrap pr-20 pt-1">
                                                            {prompt.video_prompt}
                                                        </p>
                                                    </div>

                                                    <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                                                        <button 
                                                            onClick={() => handleCopyPrompt(prompt.video_prompt, originalIndex)}
                                                            className={`px-3 py-1 text-xs rounded-md transition-colors h-8 flex items-center justify-center ${copiedPromptIndex === originalIndex ? 'bg-green-600 text-white' : 'bg-slate-600 hover:bg-slate-500 text-gray-200'}`}
                                                        >
                                                            {copiedPromptIndex === originalIndex ? t('imageGenerationPage.toVideo.copiedPromptBtn') : t('imageGenerationPage.toVideo.copyPromptBtn')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleGenerateVideo(originalIndex)}
                                                            title="Tạo Video từ Prompt này"
                                                            disabled={prompt.isGeneratingVideo}
                                                            className={`p-2 h-8 w-full flex items-center justify-center rounded-md transition-colors ${prompt.isGeneratingVideo ? 'bg-orange-800 text-gray-400 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-500'}`}
                                                        >
                                                            {prompt.isGeneratingVideo ? (
                                                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                            ) : (
                                                                <VideoCameraIcon className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {prompt.isGeneratingVideo && (
                                                <div className="bg-black/30 p-4 rounded-lg flex flex-col items-center justify-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mb-2"></div>
                                                    <p className="text-sm text-gray-400">Đang tạo video ({isPro ? 'Pro' : 'Free'})... Vui lòng đợi.</p>
                                                </div>
                                            )}
                                            
                                            {prompt.videoError && (
                                                <div className="bg-red-900/20 border border-red-800 p-3 rounded-lg text-sm text-red-300">
                                                    {prompt.videoError}
                                                </div>
                                            )}

                                            {prompt.videoUri && (
                                                <div className="mt-2 flex justify-center">
                                                    <div className="w-full max-w-2xl mt-2">
                                                        <p className="text-sm font-semibold text-gray-300 mb-1">Video kết quả:</p>
                                                        <div className="bg-black rounded-lg overflow-hidden shadow-lg">
                                                            <video 
                                                                src={prompt.videoUri} 
                                                                controls 
                                                                className="w-full h-auto object-contain max-h-[500px]"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4">
                                <Pagination
                                    currentPage={videoResultsPage}
                                    totalPages={totalVideoPages}
                                    onPageChange={setVideoResultsPage}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-center">
                            <p className="text-gray-500">Kết quả tạo prompt chuyển động sẽ được hiển thị ở đây.</p>
                        </div>
                    )}
                </div>
            </main>

            {editingImage && (
                <SingleImageCropModal
                    imageUrl={editingImage.url}
                    onClose={() => setEditingImageId(null)}
                    onApply={handleSaveCroppedImage}
                />
            )}
        </div>
    );
};


const ImageGenerationPage: React.FC<ImageGenerationPageProps> = ({ onNavigate, restoreData }) => {
    const { t, locale } = useLanguage();
    const { getModelName, isPro, mode, toggleMode, proResolution } = useMode();
    const { isSnowing, toggleSnow } = useSnow();
    const [activeAction, setActiveAction] = useState('exterior');
    const { isFreePlan } = useAuth();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState('');
    const [activeTab, setActiveTab] = useState('results');
    const [imageType, setImageType] = useState('default');

    const [originalInputImage, setOriginalInputImage] = useState<{ url: string; file: File } | null>(null);
    const [activeInputFile, setActiveInputFile] = useState<File | null>(null);
    const [displayInputImage, setDisplayInputImage] = useState<string | null>(null);
    const [isTransforming, setIsTransforming] = useState(false);
    const [transformError, setTransformError] = useState<string | null>(null);
    
    // Exterior filters state
    const [outputImageType, setOutputImageType] = useState('');
    const [constructionType, setConstructionType] = useState('');
    const [designStyle, setDesignStyle] = useState('');
    const [locationContext, setLocationContext] = useState('');
    const [appliedMaterials, setAppliedMaterials] = useState<string[]>([]);
    const [environmentalCharacteristics, setEnvironmentalCharacteristics] = useState<string[]>([]);
    const [distantContext, setDistantContext] = useState('');
    const [season, setSeason] = useState('');
    const [timeOfDay, setTimeOfDay] = useState('');
    const [weatherCondition, setWeatherCondition] = useState('');
    const [toneAndMood, setToneAndMood] = useState('');
    const [cameraAngle, setCameraAngle] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState('auto');

    // Interior filters state
    const [roomType, setRoomType] = useState('');
    const [interiorDesignStyle, setInteriorDesignStyle] = useState('');
    const [mainColorTone, setMainColorTone] = useState('');
    const [cameraAngleAndComposition, setCameraAngleAndComposition] = useState('');
    const [materialDescription, setMaterialDescription] = useState('');
    const [contextLocationViewDescription, setContextLocationViewDescription] = useState('');
    const [lightingSystemDescription, setLightingSystemDescription] = useState('');
    const [lightToneDescription, setLightToneDescription] = useState('');
    const [timeAndClimateDescription, setTimeAndClimateDescription] = useState('');
    const [renderQualityStyle, setRenderQualityStyle] = useState('');
    
    // New Angle states
    const [newAngleDescription, setNewAngleDescription] = useState('');
    const [angleSuggestionsList, setAngleSuggestionsList] = useState<string | null>(null);
    const [isSuggestingAnglesList, setIsSuggestingAnglesList] = useState(false);
    const [suggestionListTitle, setSuggestionListTitle] = useState('');
    const [exteriorAngle, setExteriorAngle] = useState('');
    const [interiorAngle, setInteriorAngle] = useState('');
    const [newAngleHistory, setNewAngleHistory] = useState<HistoryItem[]>([]);
    const [newAngleActiveTab, setNewAngleActiveTab] = useState<'results' | 'history'>('results');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [referenceImage, setReferenceImage] = useState<{ url: string; file: File } | null>(null);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);
    const [filterReferenceImage, setFilterReferenceImage] = useState<{ url: string; file: File } | null>(null);
    const filterReferenceFileInputRef = useRef<HTMLInputElement>(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisType, setAnalysisType] = useState<'style' | 'filter' | null>(null);
    const [styleDescription, setStyleDescription] = useState('');
    const [styleAnalysis, setStyleAnalysis] = useState<object | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSuggestingMaterials, setIsSuggestingMaterials] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [isEnvironmentSuggestionModalOpen, setIsEnvironmentSuggestionModalOpen] = useState(false);
    const [isOutputSuggestionModalOpen, setIsOutputSuggestionModalOpen] = useState(false);
    const [isColorPaletteSuggestionModalOpen, setIsColorPaletteSuggestionModalOpen] = useState(false);
    const [isCameraAngleSuggestionModalOpen, setIsCameraAngleSuggestionModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [description, setDescription] = useState('');
    
    // 2D Sketchup page states
    const [sketchupImage, setSketchupImage] = useState<{ url: string; file: File } | null>(null);
    const sketchupFileInputRef = useRef<HTMLInputElement>(null);
    const [sketchupActiveTab, setSketchupActiveTab] = useState('results');
    const [drawingType, setDrawingType] = useState('Mặt bằng');
    const [detailLevel, setDetailLevel] = useState('Chi tiết');
    const [lineStyle, setLineStyle] = useState('Nét mực');
    const [additionalRequest, setAdditionalRequest] = useState('');
    const [sketchupIsLoading, setSketchupIsLoading] = useState(false);
    const [isAnalyzingSketchup, setIsAnalyzingSketchup] = useState(false);
    const [sketchupResult, setSketchupResult] = useState<string | null>(null);
    const [sketchupHistory, setSketchupHistory] = useState<{ input: string; output: string }[]>([]);
    const [numberOfImages, setNumberOfImages] = useState(1);
    
    const ITEMS_PER_PAGE = 10;

    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    const paginatedHistory = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return history.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [history, currentPage]);

    // Added: Restoration logic for session data from history
    useEffect(() => {
        if (restoreData && restoreData.page === 'image-generation') {
            if (restoreData.inputImage) {
                fetch(restoreData.inputImage)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], "restored_input.png", { type: blob.type });
                        setOriginalInputImage({ url: restoreData.inputImage, file });
                        setActiveInputFile(file);
                        setDisplayInputImage(restoreData.inputImage);
                    });
            }
            if (restoreData.outputImages && restoreData.outputImages.length > 0) {
                setGeneratedImages(restoreData.outputImages);
            }
            if (restoreData.config) {
                const c = restoreData.config;
                if (c.activeAction) setActiveAction(c.activeAction);
                if (c.outputImageType) setOutputImageType(c.outputImageType);
                if (c.constructionType) setConstructionType(c.constructionType);
                if (c.designStyle) setDesignStyle(c.designStyle);
                if (c.locationContext) setLocationContext(c.locationContext);
                if (c.appliedMaterials) setAppliedMaterials(c.appliedMaterials);
                if (c.environmentalCharacteristics) setEnvironmentalCharacteristics(c.environmentalCharacteristics);
                if (c.distantContext) setDistantContext(c.distantContext);
                if (c.season) setSeason(c.season);
                if (c.timeOfDay) setTimeOfDay(c.timeOfDay);
                if (c.weatherCondition) setWeatherCondition(c.weatherCondition);
                if (c.toneAndMood) setToneAndMood(c.toneAndMood);
                if (c.cameraAngle) setCameraAngle(c.cameraAngle);
                if (c.selectedTemplate) setSelectedTemplate(c.selectedTemplate);
                if (c.selectedAspectRatio) setSelectedAspectRatio(c.selectedAspectRatio);
                if (c.roomType) setRoomType(c.roomType);
                if (c.interiorDesignStyle) setInteriorDesignStyle(c.interiorDesignStyle);
                if (c.mainColorTone) setMainColorTone(c.mainColorTone);
                if (c.cameraAngleAndComposition) setCameraAngleAndComposition(c.cameraAngleAndComposition);
                if (c.materialDescription) setMaterialDescription(c.materialDescription);
                if (c.contextLocationViewDescription) setContextLocationViewDescription(c.contextLocationViewDescription);
                if (c.lightingSystemDescription) setLightingSystemDescription(c.lightingSystemDescription);
                if (c.lightToneDescription) setLightToneDescription(c.lightToneDescription);
                if (c.timeAndClimateDescription) setTimeAndClimateDescription(c.timeAndClimateDescription);
                if (c.renderQualityStyle) setRenderQualityStyle(c.renderQualityStyle);
                if (c.numberOfImages) setNumberOfImages(c.numberOfImages);
            }
            setActiveTab('results');
        }
    }, [restoreData]);

    const outputImageTypes = useMemo(() => (t('imageGenerationPage.sidebar.outputImageTypes') || []), [t]);
    const constructionTypes = t('imageGenerationPage.sidebar.constructionTypes') || [];
    const designStyles = t('designStyles') || [];
    const locationContexts = t('imageGenerationPage.sidebar.locationContexts') || [];
    const appliedMaterialsList = t('imageGenerationPage.sidebar.appliedMaterials') || [];
    const environmentalCharacteristicsList = t('imageGenerationPage.sidebar.environmentalCharacteristics') || [];
    const distantContexts = t('imageGenerationPage.sidebar.distantContexts') || [];
    const seasonSuggestions = t('imageGenerationPage.sidebar.seasonSuggestions') || [];
    const timeOfDaySuggestions = t('imageGenerationPage.sidebar.timeOfDaySuggestions') || [];
    const weatherConditions = t('imageGenerationPage.sidebar.weatherConditions') || [];
    const toneAndMoodSuggestions = t('imageGenerationPage.sidebar.toneAndMoodSuggestions') || [];
    const cameraAngleSuggestions = t('imageGenerationPage.sidebar.cameraAngleSuggestions') || [];
    
    const roomTypes = t('imageGenerationPage.sidebar.roomTypes') || [];
    const interiorDesignStyles = t('imageGenerationPage.sidebar.interiorDesignStyles') || [];
    const mainColorTones = t('imageGenerationPage.sidebar.mainColorTones') || [];
    const cameraAngleAndCompositionSuggestions = t('imageGenerationPage.sidebar.cameraAngleAndCompositionSuggestions') || [];
    const renderQualityStyles = t('imageGenerationPage.sidebar.renderQualityStyles') || [];

    const templateOptions = useMemo(() => (t('imageGenerationPage.sidebar.templateDescriptionOptions') || []), [t]);
    const templatePrompts = useMemo(() => (t('imageGenerationPage.sidebar.templateDescriptionPrompts') || []), [t]);

    const situationData = t('imageGenerationPage.suggestionModal.situationTable.rows') || [];
    const combinationData = t('imageGenerationPage.suggestionModal.combinationTable.rows') || [];
    const goldenRulesData = t('imageGenerationPage.suggestionModal.goldenRules.table.rows') || [];
    const situationHeaders = t('imageGenerationPage.suggestionModal.situationTable.headers') || {};
    const combinationHeaders = t('imageGenerationPage.suggestionModal.combinationTable.headers') || {};
    const goldenRulesHeaders = t('imageGenerationPage.suggestionModal.goldenRules.table.headers') || {};
    const environmentSuggestions = t('imageGenerationPage.suggestionModal.environmentSuggestions');
    const outputSuggestions = t('imageGenerationPage.outputImageSuggestionModal');
    
    const exteriorAngleSuggestions = useMemo(() => (t('imageGenerationPage.sidebar.exteriorAngleSuggestions') || []), [t]);
    const interiorAngleSuggestions = useMemo(() => (t('imageGenerationPage.sidebar.interiorAngleSuggestions') || []), [t]);

    const actionButtons = [
        { id: 'exterior', key: 'imageGenerationPage.actionButtons.exterior' },
        { id: 'interior', key: 'imageGenerationPage.actionButtons.interior' },
        { id: 'newAngle', key: 'imageGenerationPage.actionButtons.newAngle' },
        { id: 'zoom', key: 'imageGenerationPage.actionButtons.zoom' },
        { id: 'edit', key: 'imageGenerationPage.actionButtons.edit' },
        { id: 'sharpen', key: 'imageGenerationPage.actionButtons.sharpen' },
        { id: 'toVideo', key: 'imageGenerationPage.actionButtons.toVideo' },
        { id: 'utils', key: 'imageGenerationPage.actionButtons.utils' },
    ];
    const mainActionButtons = actionButtons.slice(0, 2);
    const subActionButtons = actionButtons.slice(2);

    const comingSoonFeatures = [];

    const handleTemplateChange = (template: string) => {
        setSelectedTemplate(template);
        if (template) {
            const templateIndex = templateOptions.indexOf(template);
            if (templateIndex !== -1 && templatePrompts[templateIndex]) {
                setDescription(templatePrompts[templateIndex]);
            }
        }
    };

    const handleExteriorAngleChange = (val: string) => {
        setExteriorAngle(val);
        setInteriorAngle('');
        if (val) {
             setNewAngleDescription(val);
        }
    };

    const handleInteriorAngleChange = (val: string) => {
        setInteriorAngle(val);
        setExteriorAngle('');
        if (val) {
             setNewAngleDescription(val);
        }
    };

    const finalPrompt = useMemo(() => {
        if (activeAction === 'exterior') {
            const promptParts = [];

            if (outputImageType) {
                let part1 = outputImageType;
                if (constructionType) {
                    if (designStyle) {
                        part1 += t('imageGenerationPage.new_prompts.construction_with_style', { constructionType, designStyle });
                    } else {
                        part1 += t('imageGenerationPage.new_prompts.construction_only', { constructionType });
                    }
                }
                part1 += '.';
                promptParts.push(part1);
            }

            if (locationContext) promptParts.push(t('imageGenerationPage.new_prompts.location', { locationContext }));
            if (appliedMaterials && appliedMaterials.length > 0) promptParts.push(t('imageGenerationPage.new_prompts.materials', { materials: appliedMaterials.join(', ') }));
            if (environmentalCharacteristics && environmentalCharacteristics.length > 0) promptParts.push(t('imageGenerationPage.new_prompts.environment', { environmentalCharacteristics: environmentalCharacteristics.join(', ') }));
            if (distantContext) promptParts.push(t('imageGenerationPage.new_prompts.distant_context', { distantContext }));
            if (season) {
                if (timeOfDay && weatherCondition) promptParts.push(t('imageGenerationPage.new_prompts.time_full', { season, timeOfDay, weatherCondition }));
                else if (weatherCondition) promptParts.push(t('imageGenerationPage.new_prompts.time_season_weather', { season, weatherCondition }));
            }
            if (outputImageType) {
                const selectedIndex = Array.isArray(outputImageTypes) ? outputImageTypes.indexOf(outputImageType) : -1;
                if (selectedIndex === 1 || selectedIndex === 2) promptParts.push(t('imageGenerationPage.new_prompts.lighting_hyper'));
                else promptParts.push(t('imageGenerationPage.new_prompts.lighting_realistic'));
            }
            if (toneAndMood) promptParts.push(t('imageGenerationPage.new_prompts.mood', { toneAndMood }));
            if (cameraAngle) promptParts.push(t('imageGenerationPage.new_prompts.camera', { cameraAngle }));
            
            return promptParts.join('\n\n');
        } else if (activeAction === 'interior') {
            if (!roomType && !interiorDesignStyle && !mainColorTone && !materialDescription && !contextLocationViewDescription && !lightingSystemDescription && !timeAndClimateDescription && !lightToneDescription && !cameraAngleAndComposition && !renderQualityStyle && !outputImageType) {
                return '';
            }
            const finalRoomType = roomType || t('imageGenerationPage.prompts.defaultRoomType');
            const finalInteriorStyle = interiorDesignStyle || t('imageGenerationPage.prompts.defaultInteriorStyle');
            
            let basePromptStart: string;
            if (outputImageType) {
                basePromptStart = outputImageType.replace('công trình', 'nội thất');
            } else {
                basePromptStart = 'Một bức ảnh thực tế'; // Default fallback
            }
        
            let prompt = `${basePromptStart} của một ${finalRoomType}, theo phong cách ${finalInteriorStyle}. Kết quả phải là một bức ảnh trông như được chụp bằng máy ảnh DSLR chuyên nghiệp, chất lượng cao, HDR, sắc nét, không nhiễu và không phải là ảnh CGI giả.`;
            
            if (mainColorTone) prompt += " " + t('imageGenerationPage.prompts.interior_tone_clause', { mainColorTone: mainColorTone.split('.')[0] });
            if (contextLocationViewDescription) prompt += `\n${contextLocationViewDescription}`;
            if (materialDescription) prompt += `\n\n${materialDescription}`;
            if (lightingSystemDescription) prompt += `\n\n${lightingSystemDescription}`;
            if (lightToneDescription) prompt += `\n\n${lightToneDescription}`;
            if (timeAndClimateDescription) prompt += `\n\n${timeAndClimateDescription}`;
            if (cameraAngleAndComposition) prompt += `\n\n${t('imageGenerationPage.prompts.camera_angle_composition_clause', { angle: cameraAngleAndComposition })}`;
            if (renderQualityStyle) prompt += `\n\nRender style: ${renderQualityStyle}.`;
    
            return prompt;
        }
        return '';
    }, [
        constructionType, designStyle, locationContext, appliedMaterials, environmentalCharacteristics, 
        distantContext, season, timeOfDay, weatherCondition, toneAndMood, cameraAngle, t, activeAction, 
        roomType, interiorDesignStyle, mainColorTone, materialDescription, contextLocationViewDescription, 
        lightingSystemDescription, lightToneDescription, timeAndClimateDescription, cameraAngleAndComposition, 
        renderQualityStyle, outputImageType, outputImageTypes
    ]);

    useEffect(() => {
        if (!selectedTemplate) {
            setDescription(finalPrompt);
        }
    }, [finalPrompt, selectedTemplate]);


    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleSuggestAnglesList = async (type: 'beautiful' | 'zoom' | 'interior') => {
        if (!activeInputFile || isSuggestingAnglesList) return;

        // If Pro, force key check        }

        setIsSuggestingAnglesList(true);
        setAngleSuggestionsList(null);
        setSuggestionListTitle(
            type === 'beautiful'
                ? t('imageGenerationPage.actionButtons.suggestBeautifulAngle')
                : type === 'zoom' 
                    ? t('imageGenerationPage.actionButtons.suggestZoomAngle')
                    : t('imageGenerationPage.actionButtons.suggestBeautifulInteriorAngle')
        );

        try {
            const inputBase64 = await blobToBase64(activeInputFile);
            
           let prompt = '';
            const isVietnamese = locale === 'vi';

            if (type === 'beautiful') {
                if (isVietnamese) {
                    prompt = `Phân tích kỹ hình ảnh không gian được tải lên.
NHIỆM VỤ CỦA BẠN:
- KHÔNG tạo hình ảnh.
- Chỉ sinh ra 20 PROMPT mô tả góc chụp hoàn chỉnh, sẵn sàng dùng để tạo ảnh.
YÊU CẦU BẮT BUỘC (KHÓA CỨNG):
- Không thay đổi bố cục kiến trúc, hình dạng không gian, vị trí tường, trần, sàn, cửa.
- Không di chuyển, thêm, bớt hay thiết kế lại bất kỳ đồ nội thất hay vật dụng nào.
- Không thay đổi vật liệu, màu sắc, kết cấu, ánh sáng, phong cách thiết kế.
- Giữ nguyên tỷ lệ, kích thước và quan hệ không gian như ảnh gốc.
- Chỉ được thay đổi góc máy, vị trí máy ảnh, độ cao máy, tiêu cự và khung hình.
YÊU CẦU CHO MỖI PROMPT:
- Mỗi prompt là MỘT ĐOẠN MÔ TẢ HOÀN CHỈNH, độc lập.
- Viết đủ chi tiết để có thể dùng trực tiếp cho AI tạo ảnh.
- Tập trung mô tả góc chụp, hướng nhìn, bố cục, cảm giác không gian.
- Sử dụng ngôn ngữ chụp ảnh – render kiến trúc chuyên nghiệp.
- Không tham chiếu như “như trên”, “giống ảnh trước”.
- Không thêm chi tiết không có trong ảnh gốc.
ĐỊNH DẠNG TRẢ VỀ:
- Danh sách đánh số từ 1 đến 30.
- Mỗi số là một prompt đầy đủ, Bắt đầu mỗi Prompt là chữ Góc chụp.
- Ngôn ngữ: Tiếng Việt.                  
 Định dạng Markdown, chia thành 6 nhóm:
### I. 3 góc toàn cảnh (Wide Shots)
### II. 10 góc trung cảnh (Medium Shots)
### III. 5 góc nghệ thuật (Artistic Shots)
### IV. 4 góc ngước nhìn từ dưới lên
### V. 5 cận cảnh nghệ thuật
### VI. 3 góc drone (Cao & bên hông).`;
                } else {
                    prompt = `Carefully analyze the uploaded image of the space.
YOUR TASK:
- DO NOT generate any images.
- ONLY generate 20 complete camera-angle prompts, ready to be used for image generation.
MANDATORY REQUIREMENTS (STRICT LOCK):
- Do NOT change the architectural layout, spatial form, or the positions of walls, ceilings, floors, or openings.
- Do NOT move, add, remove, or redesign any furniture or objects.
- Do NOT change materials, colors, textures, lighting, or design style.
- Preserve the original scale, proportions, and spatial relationships exactly as shown in the reference image.
- ONLY camera angle, camera position, camera height, focal length, and framing are allowed to change.
REQUIREMENTS FOR EACH PROMPT:
- Each prompt must be ONE complete, standalone descriptive paragraph.
- Each prompt must be detailed enough to be used directly for image generation.
- Focus on camera angle, viewing direction, composition, and spatial perception.
- Use professional architectural photography and visualization language.
- Do NOT reference other prompts (no phrases such as “same as above” or “similar to the previous image”).
- Do NOT introduce any elements that are not visible in the original image.
OUTPUT FORMAT:
- A numbered list from 1 to 25.
- Each number contains one full prompt, and each prompt must begin with the phrase “Camera angle”.
- Language: English.
MARKDOWN STRUCTURE — GROUPED INTO SECTIONS:
### I. 3 Wide Shots (Establishing Views)
### II. 10 Medium Shots
### III. 5 Artistic Shots
### IV. 4 Low-Angle Upward Shots
### V. 3 Drone Shots (High & Side Perspectives).`;
                }
            } else if (type === 'zoom') {
                if (isVietnamese) {
                    prompt = `Phân tích kỹ hình ảnh không gian được tải lên.
NHIỆM VỤ CỦA BẠN:
- KHÔNG tạo hình ảnh.
- Chỉ sinh ra 25 PROMPT mô tả góc chụp hoàn chỉnh, sẵn sàng dùng để tạo ảnh.
YÊU CẦU BẮT BUỘC (KHÓA CỨNG):
- Không thay đổi bố cục kiến trúc, hình dạng không gian, vị trí tường, trần, sàn, cửa.
- Không di chuyển, thêm, bớt hay thiết kế lại bất kỳ đồ nội thất hay vật dụng nào.
- Không thay đổi vật liệu, màu sắc, kết cấu, ánh sáng, phong cách thiết kế.
- Giữ nguyên tỷ lệ, kích thước và quan hệ không gian như ảnh gốc.
- Chỉ được thay đổi góc máy, vị trí máy ảnh, độ cao máy, tiêu cự và khung hình.
YÊU CẦU CHO MỖI PROMPT:
- Mỗi prompt là MỘT ĐOẠN MÔ TẢ HOÀN CHỈNH, độc lập.
- Viết đủ chi tiết để có thể dùng trực tiếp cho AI tạo ảnh.
- Tập trung mô tả góc chụp, hướng nhìn, bố cục, cảm giác không gian.
- Sử dụng ngôn ngữ chụp ảnh – render kiến trúc chuyên nghiệp.
- Không tham chiếu như “như trên”, “giống ảnh trước”.
- Không thêm chi tiết không có trong ảnh gốc.                   
Hãy gợi ý 25 góc chụp cận cảnh (Close-up) để làm nổi bật vật liệu và chi tiết.
YÊU CẦU QUAN TRỌNG:
1. NGÔN NGỮ TRẢ LỜI: TIẾNG VIỆT 100%.
2.Tạo ra các prompt hoàn chỉnh, sẵn sàng để sử dụng cho một mô hình AI tạo ảnh, đầu mỗi prompt sẽ bắt đầu từ chữ Góc chụp.
3.Mỗi prompt phải là một câu mô tả góc chụp chi tiết,đúng vị trí, tập trung vào một chi tiết cụ thể như vật liệu, kết cấu,các góc của công trình, hoặc một yếu tố kiến trúc độc đáo có trong ảnh .
4. Không thêm chi tiết không có trong ảnh gốc.
5.Không mô tả chi tiết gây nhầm lẫn, bắt buộc chính xác 100% trong hình gốc.
6. Định dạng đầu ra: Một danh sách đánh số từ 1 đến 25. `;
                } else {
                    prompt = `Carefully analyze the uploaded spatial image.
YOUR TASK:
DO NOT generate any images.
Only generate 25 complete prompts describing camera angles, ready to be used to generate images.
MANDATORY REQUIREMENTS (HARD LOCK):
Do NOT change the architectural layout, spatial configuration, or the shape of the space.
Do NOT change the position of walls, ceilings, floors, or doors.
Do NOT move, add, remove, or redesign any furniture or objects.
Do NOT change materials, colors, textures, lighting, or the design style.
Maintain the exact proportions, dimensions, and spatial relationships as in the original image.
ONLY camera angle, camera position, camera height, focal length, and framing are allowed to change.
REQUIREMENTS FOR EACH PROMPT:
Each prompt must be ONE complete, standalone descriptive paragraph.
Write with sufficient detail so it can be used directly for AI image generation.
Focus on camera angle, viewing direction, composition, and spatial perception.
Use professional architectural photography and rendering language.
Do NOT reference phrases such as “as above” or “similar to the previous image.”
Do NOT add any details that do not exist in the original image.
TASK:Propose 25 close-up camera angles (Close-up shots) to highlight materials and architectural details.
IMPORTANT REQUIREMENTS:OUTPUT LANGUAGE: 100% ENGLISH.
Generate complete prompts ready for use in an AI image-generation model;
each prompt must begin with the phrase “Góc chụp”.
Each prompt must be a single detailed sentence, accurately describing a camera angle, focusing on one specific detail such as materials, textures, architectural edges, corners, or a distinctive architectural element visible in the image.
Do NOT add any details that do not exist in the original image.
Do NOT describe any details that may cause confusion; absolute accuracy with the original image is mandatory.
Output format: A numbered list from 1 to 25.`;
                }
            } else { // 'interior'
                if (isVietnamese) {
                    prompt = `Phân tích kỹ hình ảnh không gian được tải lên.
NHIỆM VỤ CỦA BẠN:
- KHÔNG tạo hình ảnh.
- Chỉ sinh ra 15 PROMPT mô tả góc chụp hoàn chỉnh, sẵn sàng dùng để tạo ảnh.
YÊU CẦU BẮT BUỘC (KHÓA CỨNG):
- Không thay đổi bố cục kiến trúc, hình dạng không gian, vị trí tường, trần, sàn, cửa.
- Không di chuyển, thêm, bớt hay thiết kế lại bất kỳ đồ nội thất hay vật dụng nào.
- Không thay đổi vật liệu, màu sắc, kết cấu, ánh sáng, phong cách thiết kế.
- Giữ nguyên tỷ lệ, kích thước và quan hệ không gian như ảnh gốc.
- Chỉ được thay đổi góc máy, vị trí máy ảnh, độ cao máy, tiêu cự và khung hình.
YÊU CẦU CHO MỖI PROMPT:
- Mỗi prompt là MỘT ĐOẠN MÔ TẢ HOÀN CHỈNH, độc lập.
- Viết đủ chi tiết để có thể dùng trực tiếp cho AI tạo ảnh.
- Tập trung mô tả góc chụp, hướng nhìn, bố cục, cảm giác không gian.
- Sử dụng ngôn ngữ chụp ảnh – render kiến trúc chuyên nghiệp.
- Không tham chiếu như “như trên”, “giống ảnh trước”.
- Không thêm chi tiết không có trong ảnh gốc.
ĐỊNH DẠNG TRẢ VỀ:
- Danh sách đánh số từ 1 đến 15.
- Mỗi số là một prompt đầy đủ.
- Ngôn ngữ: Tiếng Việt.
CÁC KIỂU GÓC CẦN PHÂN BỔ TRONG 15 PROMPT:
- Góc toàn cảnh (wide)
- Góc trung cảnh (medium)
- Góc chéo – góc phòng (corner view)
- Góc thấp (low angle)
- Góc ngang tầm mắt người dùng
- Góc nhìn ngược / đối diện không gian
- Góc nhấn vật liệu – chi tiết
- Góc nhấn ánh sáng
- Góc đối xứng – hero shot
- Góc tạo chiều sâu – nhiều lớp không gian.`;
                } else {
                    prompt = `Carefully analyze the uploaded image of the space.
YOUR TASK:
- DO NOT generate any images.
- ONLY generate 15 complete camera-angle prompts, ready to be used for image generation.
MANDATORY REQUIREMENTS (STRICT LOCK):
- Do NOT change the architectural layout, spatial form, or the positions of walls, ceilings, floors, or openings.
- Do NOT move, add, remove, or redesign any furniture or objects.
- Do NOT change materials, colors, textures, lighting, or design style.
- Preserve the original scale, proportions, and spatial relationships exactly as shown in the reference image.
- ONLY camera angle, camera position, camera height, focal length, and framing are allowed to change.
REQUIREMENTS FOR EACH PROMPT:
- Each prompt must be ONE complete, standalone descriptive paragraph.
- Each prompt must be fully usable on its own for image generation.
- Focus on camera position, viewing direction, composition, and spatial perception.
- Use professional architectural photography and visualization language.
- Do NOT reference other prompts (no phrases like “same as above” or “similar to previous view”).
- Do NOT introduce any elements that are not visible in the original image.
OUTPUT FORMAT:
- Return a numbered list from 1 to 15.
- Each number contains one full prompt.
- Language: Professional English.
CAMERA SHOT TYPES TO BE DISTRIBUTED ACROSS THE 15 PROMPTS:
- Wide establishing shots
- Medium functional views
- Diagonal or corner perspective shots
- Low-angle shots
- Eye-level human perspective shots
- Reverse or opposite-facing views of the space
- Material and detail-focused shots
- Lighting-focused compositions
- Symmetrical hero shots
- Depth-driven compositions with layered spatial elements.`;
                }
            }

            const response = await apiClient.generateContent({
                model: getModelName('text'),
                contents: {
                    parts: [
                        { inlineData: { data: inputBase64, mimeType: activeInputFile.type } },
                        { text: prompt }
                    ]
                },
            });

            const fullText = response.text || '';
            setAngleSuggestionsList(fullText);
        } catch (e) {
            console.error("Error suggesting angles list:", e);
            setAngleSuggestionsList(t("imageGenerationPage.prompts.suggestAngleError"));
        } finally {
            setIsSuggestingAnglesList(false);
        }
    };

    const handleAiSuggestEnvironment = async () => {
        if (!constructionType || !designStyle || !locationContext) {
            return;
        }

        setIsSuggesting(true);
        try {
            
            const prompt = t('imageGenerationPage.prompts.aiEnvironmentSuggestionPrompt', {
                constructionType: constructionType,
                designStyle: designStyle,
                locationContext: locationContext,
            });

            const schema = {
                type: 'ARRAY',
                items: { type: 'STRING' },
            };

            const response = await apiClient.generateContent({
                model: getModelName('text'), // Dynamic model
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            const result = JSON.parse(response.text);
            
            if (Array.isArray(result) && result.length > 0) {
                setEnvironmentalCharacteristics(result.slice(0, 10));
            } else {
                console.warn("AI did not return a valid array of suggestions.");
            }

        } catch (e) {
            console.error("Error getting AI environment suggestions:", e);
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleAiSuggestMaterials = async () => {
        const fileToAnalyze = originalInputImage?.file || activeInputFile;
        if (!fileToAnalyze) return;

        setIsSuggestingMaterials(true);
        try {
            const inputBase64 = await blobToBase64(fileToAnalyze);
            
            // Use translation key to ensure the response language matches the app language
            const prompt = t('imageGenerationPage.prompts.aiMaterialSuggestionPrompt');

            const schema = {
                type: 'ARRAY',
                items: { type: 'STRING' },
            };

            const response = await apiClient.generateContent({
                model: getModelName('text'), // Dynamic model
                contents: { 
                    parts: [
                        { inlineData: { data: inputBase64, mimeType: fileToAnalyze.type } },
                        { text: prompt }
                    ] 
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            });

            const result = JSON.parse(response.text);
            
            if (Array.isArray(result) && result.length > 0) {
                setAppliedMaterials(result); 
            } else {
                console.warn("AI did not return a valid array of material suggestions.");
            }

        } catch (e) {
            console.error("Error getting AI material suggestions:", e);
        } finally {
            setIsSuggestingMaterials(false);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (originalInputImage) URL.revokeObjectURL(originalInputImage.url);
            const url = URL.createObjectURL(file);
            setOriginalInputImage({ url, file });
            setActiveInputFile(file);
            setDisplayInputImage(url);
            setImageType('default');
            setTransformError(null);
        }
    };

    const handleClearInputImage = () => {
        if (originalInputImage) URL.revokeObjectURL(originalInputImage.url);
        setOriginalInputImage(null);
        setActiveInputFile(null);
        setDisplayInputImage(null);
        setImageType('default');
        setTransformError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const resetCreativeFilters = () => {
        setConstructionType('');
        setDesignStyle('');
        setLocationContext('');
        setAppliedMaterials([]);
        setEnvironmentalCharacteristics([]);
        setDistantContext('');
        setSeason('');
        setTimeOfDay('');
        setWeatherCondition('');
        setToneAndMood('');
        setCameraAngle('');
        setSelectedTemplate('');
        setRoomType('');
        setInteriorDesignStyle('');
        setMainColorTone('');
        setCameraAngleAndComposition('');
        setMaterialDescription('');
        setContextLocationViewDescription('');
        setLightingSystemDescription('');
        setLightToneDescription('');
        setTimeAndClimateDescription('');
        setRenderQualityStyle('');
    };

    const analyzeImageForExteriorFilters = async (file: File) => {
        setIsAnalyzing(true);
        setAnalysisType('filter');
        try {
            const base64Data = await blobToBase64(file);
            const prompt = t('imageGenerationPage.prompts.filterAnalysisPrompt');
            const filterSchema = {
                type: 'OBJECT',
                properties: {
                    constructionType: { type: 'STRING' },
                    designStyle: { type: 'STRING' },
                    locationContext: { type: 'STRING' },
                    appliedMaterials: { type: 'ARRAY', items: { type: 'STRING' } },
                    environmentalCharacteristics: { type: 'ARRAY', items: { type: 'STRING' } },
                    distantContext: { type: 'STRING' },
                    season: { type: 'STRING' },
                    timeOfDay: { type: 'STRING' },
                    weatherCondition: { type: 'STRING' },
                    toneAndMood: { type: 'STRING' },
                    cameraAngle: { type: 'STRING' }
                },
            };
            const response = await apiClient.generateContent({
                model: getModelName('text'), // Dynamic model
                contents: { parts: [{ inlineData: { data: base64Data, mimeType: file.type } }, { text: prompt }] },
                config: { responseMimeType: "application/json", responseSchema: filterSchema }
            });
            const result = JSON.parse(response.text);
            setConstructionType(result.constructionType || '');
            setDesignStyle(result.designStyle || '');
            setLocationContext(result.locationContext || '');
            setAppliedMaterials(result.appliedMaterials || []);
            setEnvironmentalCharacteristics(result.environmentalCharacteristics || []);
            setDistantContext(result.distantContext || '');
            setSeason(result.season || '');
            setTimeOfDay(result.timeOfDay || '');
            setWeatherCondition(result.weatherCondition || '');
            setToneAndMood(result.toneAndMood || '');
            setCameraAngle(result.cameraAngle || '');
        } catch (e) {
            console.error("Error analyzing image for filters:", e);
        } finally {
            setIsAnalyzing(false);
            setAnalysisType(null);
        }
    };
    
    const analyzeImageForInteriorFilters = async (file: File) => {
        setIsAnalyzing(true);
        setAnalysisType('filter');
        try {
            const base64Data = await blobToBase64(file);
            const prompt = t('imageGenerationPage.prompts.interiorFilterAnalysisPrompt');
            const interiorFilterSchema = {
                type: 'OBJECT',
                properties: {
                    roomType: { type: 'STRING' },
                    interiorDesignStyle: { type: 'STRING' },
                    contextLocationViewDescription: { type: 'STRING' },
                    mainColorTone: { type: 'STRING' },
                    materialDescription: { type: 'STRING' },
                    lightingSystemDescription: { type: 'STRING' },
                    lightToneDescription: { type: 'STRING' },
                    timeAndClimateDescription: { type: 'STRING' },
                    cameraAngleAndComposition: { type: 'STRING' },
                },
            };
            const response = await apiClient.generateContent({
                model: getModelName('text'), // Dynamic model
                contents: { parts: [{ inlineData: { data: base64Data, mimeType: file.type } }, { text: prompt }] },
                config: { responseMimeType: "application/json", responseSchema: interiorFilterSchema }
            });
            const result = JSON.parse(response.text);

            if (result.roomType) setRoomType(result.roomType);
            if (result.interiorDesignStyle) setInteriorDesignStyle(result.interiorDesignStyle);
            if (result.contextLocationViewDescription) setContextLocationViewDescription(result.contextLocationViewDescription);
            if (result.mainColorTone) setMainColorTone(result.mainColorTone);
            if (result.materialDescription) setMaterialDescription(result.materialDescription);
            if (result.lightingSystemDescription) setLightingSystemDescription(result.lightingSystemDescription);
            if (result.lightToneDescription) setLightToneDescription(result.lightToneDescription);
            if (result.timeAndClimateDescription) setTimeAndClimateDescription(result.timeAndClimateDescription);
            if (result.cameraAngleAndComposition) setCameraAngleAndComposition(result.cameraAngleAndComposition);

        } catch (e) {
            console.error("Error analyzing image for interior filters:", e);
        } finally {
            setIsAnalyzing(false);
            setAnalysisType(null);
        }
    };

    const analyzeReferenceImage = async (file: File) => {
        setIsAnalyzing(true);
        setAnalysisType('style');
        if (activeAction === 'interior') {
            try {
                const base64Data = await blobToBase64(file);
                const analysisPrompt = t('imageGenerationPage.prompts.styleAnalysisPrompt');
                
                const styleSchema = {
                  type: 'OBJECT',
                  properties: {
                    visualStyle: { type: 'STRING', description: 'A brief description of the overall visual style (e.g., modern, minimalist, rustic).' },
                    lighting: { type: 'STRING', description: 'Description of the lighting characteristics (e.g., bright natural light, warm artificial light, dramatic shadows).' },
                    materials: { type: 'ARRAY', description: 'List of dominant materials observed in the image (e.g., light wood, concrete, brushed metal).', items: { type: 'STRING' } },
                    colorTone: { type: 'STRING', description: 'The overall color palette and tone of the image (e.g., warm and earthy, cool and monochromatic, vibrant and colorful).' }
                  },
                  required: ['visualStyle', 'lighting', 'materials', 'colorTone']
                };

                const response = await apiClient.generateContent({
                    model: getModelName('text'), // Dynamic model
                    contents: { parts: [{ inlineData: { data: base64Data, mimeType: file.type } }, { text: analysisPrompt }] },
                    config: { responseMimeType: "application/json", responseSchema: styleSchema }
                });
                
                const resultJson = JSON.parse(response.text);
                setStyleAnalysis(resultJson);

            } catch (e) {
                console.error("Error analyzing reference image for interior mode:", e);
            } finally {
                setIsAnalyzing(false);
                setAnalysisType(null);
            }
        } else {
            try {
                const base64Data = await blobToBase64(file);
                const analysisPrompt = t('imageGenerationPage.prompts.analysisPrompt');
                const response = await apiClient.generateContent({
                    model: getModelName('text'), // Dynamic model
                    contents: { parts: [{ inlineData: { data: base64Data, mimeType: file.type } }, { text: analysisPrompt }] }
                });
                setStyleDescription(response.text);
            } catch (e) {
                console.error("Error analyzing reference image:", e);
            } finally {
                setIsAnalyzing(false);
                setAnalysisType(null);
            }
        }
    };


    const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (referenceImage) URL.revokeObjectURL(referenceImage.url);
            const url = URL.createObjectURL(file);
            setReferenceImage({ url, file });
            handleClearFilterReferenceImage();
            resetCreativeFilters();
            analyzeReferenceImage(file);
        }
    };

    const handleClearReferenceImage = () => {
        if (referenceImage) URL.revokeObjectURL(referenceImage.url);
        setReferenceImage(null);
        setStyleDescription('');
        setStyleAnalysis(null);
        if (referenceFileInputRef.current) referenceFileInputRef.current.value = "";
    };
    
    const handleFilterReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (filterReferenceImage) URL.revokeObjectURL(filterReferenceImage.url);
            const url = URL.createObjectURL(file);
            setFilterReferenceImage({ url, file });
            handleClearReferenceImage();
            if (activeAction === 'interior') {
                analyzeImageForInteriorFilters(file);
            } else {
                analyzeImageForExteriorFilters(file);
            }
        }
    };

    const handleClearFilterReferenceImage = () => {
        if (filterReferenceImage) URL.revokeObjectURL(filterReferenceImage.url);
        setFilterReferenceImage(null);
        if (filterReferenceFileInputRef.current) filterReferenceFileInputRef.current.value = "";
    };

    const handleGenerate = async () => {
        if (!activeInputFile) return;

        if (isPro) {
        }

        if (activeAction === 'newAngle') {
            setIsLoading(true);
            setGeneratedImages([]);
            setActiveTab('results');
            try {
                const inputBase64 = await blobToBase64(activeInputFile);
                let prompt = newAngleDescription.trim() || "Generate a new, different camera angle of the building in this image. Maintain the same architectural style and environment. The result should be a photorealistic image.";
                
                if (isPro) {
                    prompt += proResolution === '4k' ? " Output resolution 4K, highly detailed." : proResolution === '1k' ? " Output resolution 1K." : " Output resolution 2K, high quality.";
                }

                const response = await apiClient.generateContent({
                    model: getModelName('image'), // Dynamic model
                    contents: {
                        parts: [
                            { inlineData: { data: inputBase64, mimeType: activeInputFile.type } },
                            { text: prompt }
                        ]
                    },
                    config: { 
                        responseModalities: ['IMAGE'],
                        imageConfig: {
                              ...(selectedAspectRatio !== "auto"
        ? { aspectRatio: selectedAspectRatio }
        : {}),
                            ...getImageSize(isPro, proResolution)
                        }
                    },
                });

                const imageParts = response.candidates?.[0]?.content?.parts.filter(part => part.inlineData);
                if (imageParts && imageParts.length > 0) {
                    const resultImages = imageParts.map(part => `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    const finalImages = [resultImages[0]];
                    setGeneratedImages(finalImages);
                    setHistory(prev => [{ input: displayInputImage!, outputs: finalImages }, ...prev]);
                    // Updated for New Angle History
                    setNewAngleHistory(prev => [{ input: displayInputImage!, outputs: finalImages }, ...prev]);
                    setNewAngleActiveTab('results');
                    setCurrentPage(1);
                } else {
                     console.error("Rendering failed: No image generated for newAngle.");
                }
            } catch (e) {
                console.error("Error generating new angle:", e);
            } finally {
                setIsLoading(false);
            }
            return;
        }
    
        setIsLoading(true);
        setGeneratedImages([]);
        setActiveTab('results');
    
        try {
            const inputBase64 = await blobToBase64(activeInputFile);
            
            let prompt = '';
            const commonParts: ({inlineData: {data: string, mimeType: string}} | {text: string})[] = [];
    
            if (activeAction === 'interior' && referenceImage && styleAnalysis) {
                prompt = t('imageGenerationPage.prompts.finalRenderWithStyleJsonPrompt', { 
                    styleJson: JSON.stringify(styleAnalysis, null, 2) 
                });
            } else {
                if (referenceImage && styleDescription) {
                    prompt = t('imageGenerationPage.prompts.finalRenderPrompt', { styleDescription });
                } else if (description.trim()) {
                    prompt = description;
                } else {
                    prompt = t('imageGenerationPage.prompts.defaultRenderPrompt');
                }
            }

            if (isPro) {
                prompt += proResolution === '4k' ? " Output resolution 4K, highly detailed." : proResolution === '1k' ? " Output resolution 1K." : " Output resolution 2K, high quality.";
            }

            commonParts.push({ inlineData: { data: inputBase64, mimeType: activeInputFile.type } });
            commonParts.push({ text: prompt });
            
            const generateOneImage = async (): Promise<string | null> => {
                const response = await apiClient.generateContent({
                    model: getModelName('image'), // Dynamic model
                    contents: { parts: commonParts },
                    config: { 
                        responseModalities: ['IMAGE'],
                        imageConfig: {
                               ...(selectedAspectRatio !== "auto"
        ? { aspectRatio: selectedAspectRatio }
        : {}),
                            ...getImageSize(isPro, proResolution)
                        }
                    },
                });
        
                const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
                if (imagePart && imagePart.inlineData) {
                    return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                }
                return null;
            };

            const generationPromises = Array.from({ length: numberOfImages }, () => generateOneImage());
            const results = await Promise.all(generationPromises);
            const successfulImages = results.filter((img): img is string => img !== null);

            if (successfulImages.length > 0) {
                console.log(`✅ Rendering finished successfully with ${successfulImages.length} images.`);
                setGeneratedImages(successfulImages);
                setHistory(prev => [{ input: displayInputImage!, reference: referenceImage?.url, outputs: successfulImages }, ...prev]);
                
                // Added: Persist generation to IndexedDB history
                const inputBase64Raw = await blobToBase64(activeInputFile);
                saveHistory({
                    id: Math.random().toString(36).substr(2, 9),
                    page: 'image-generation',
                    inputImage: `data:${activeInputFile.type};base64,${inputBase64Raw}`,
                    outputImages: successfulImages,
                    prompt: prompt,
                    timestamp: Date.now(),
                    config: { 
                        activeAction,
                        outputImageType,
                        constructionType,
                        designStyle,
                        locationContext,
                        appliedMaterials,
                        environmentalCharacteristics,
                        distantContext,
                        season,
                        timeOfDay,
                        weatherCondition,
                        toneAndMood,
                        cameraAngle,
                        selectedTemplate,
                        selectedAspectRatio,
                        roomType,
                        interiorDesignStyle,
                        mainColorTone,
                        cameraAngleAndComposition,
                        materialDescription,
                        contextLocationViewDescription,
                        lightingSystemDescription,
                        lightToneDescription,
                        timeAndClimateDescription,
                        renderQualityStyle,
                        numberOfImages
                    }
                });
                setCurrentPage(1);
            } else {
                 console.error("Rendering failed: No image generated.");
            }
        } catch (e) {
            console.error("Error generating image:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOptimizePrompt = async () => {
        if (!description && !originalInputImage) return;

        setIsOptimizing(true);
        try {
            
            let response;
            const targetLanguage = locale === 'vi' ? 'tiếng Việt' : 'tiếng Anh';
            const prefix = locale === 'vi' ? 'Ảnh thực tế của công trình' : 'Realistic photo of the building';

            if (originalInputImage) {
                const inputBase64 = await blobToBase64(originalInputImage.file);
                let promptText = `Bạn là một chuyên gia kiến trúc/nội thất và nhiếp ảnh gia. Hãy phân tích bức ảnh được cung cấp (có thể là ảnh chụp thực tế, bản vẽ phác thảo, hoặc ảnh render 3D thô). Trích xuất các thông tin quan trọng: loại công trình, phong cách thiết kế, hình khối, vật liệu, bối cảnh ,không gian xung quanh, góc camera và điều kiện ánh sáng. Sau đó, đúc kết lại thành một đoạn prompt chi tiết (dưới 200 từ) bằng ${targetLanguage}, tối ưu nhất cho việc tạo ảnh AI kiến trúc/nội thất chất lượng cao. Chỉ trả về đoạn prompt, không có văn bản giới thiệu.\n\nBẮT BUỘC: Đoạn prompt trả về PHẢI bắt đầu bằng cụm từ chính xác là "${prefix}, ".`;
                
                if (description) {
                    promptText += `\n\nNgười dùng cũng có yêu cầu thêm: "${description}". Hãy kết hợp yêu cầu này vào prompt.`;
                }
                
                response = await apiClient.generateContent({
                    model: getModelName('text'), // Dynamic model
                    contents: {
                        parts: [
                            { inlineData: { data: inputBase64, mimeType: originalInputImage.file.type } },
                            { text: promptText }
                        ]
                    }
                });
            } else {
                const optimizationRequest = `Vui lòng tối ưu hóa prompt render kiến trúc sau đây cho một mô hình tạo ảnh thực tế. Giữ nguyên ý định ban đầu. Chỉ trả về prompt đã được tối ưu hóa bằng ${targetLanguage} (dưới 150 từ), không có bất kỳ văn bản giới thiệu nào.\n\nBẮT BUỘC: Đoạn prompt trả về PHẢI bắt đầu bằng cụm từ chính xác là "${prefix}, ".\n\nPrompt cần tối ưu: "${description}"`;
                response = await apiClient.generateContent({
                    model: getModelName('text'), // Dynamic model
                    contents: optimizationRequest,
                });
            }

            const optimizedPrompt = response.text;
            if (optimizedPrompt) {
                setDescription(optimizedPrompt.trim());
            }

        } catch (e) {
            console.error("Error optimizing prompt:", e);
        } finally {
            setIsOptimizing(false);
        }
    };

    // FREE plan: only allow exterior + interior tabs
    const FREE_ALLOWED_TABS = ['exterior', 'interior'];

    const handleActionChange = (action: string) => {
        if (isFreePlan && !FREE_ALLOWED_TABS.includes(action)) {
            setUpgradeMessage('Tính năng này chỉ dành cho tài khoản PRO. Nâng cấp để sử dụng toàn bộ công cụ!');
            setShowUpgradeModal(true);
            return;
        }
        setActiveAction(action);
        if (referenceImage) {
            setStyleAnalysis(null);
            setStyleDescription('');
            analyzeReferenceImage(referenceImage.file);
        }
    };

    const handleAnalyzeSketchupImage = async () => {
        if (!sketchupImage) return;

        setIsAnalyzingSketchup(true);
        try {
            const analysisPrompt = `Bạn là một trợ lý kiến trúc AI chuyên nghiệp. Nhiệm vụ của bạn là phân tích hình ảnh 3D được cung cấp và tạo ra một prompt văn bản chi tiết để tạo một bản vẽ kỹ thuật 2D.

            Người dùng đã chỉ định các yêu cầu sau cho bản vẽ:
            - Loại bản vẽ: ${drawingType}
            - Mức độ chi tiết: ${detailLevel}
            - Phong cách nét vẽ: ${lineStyle}
    
            Dựa trên các yêu cầu này, hãy phân tích hình học 3D, cấu trúc và các yếu tố chính trong hình ảnh. Sau đó, xây dựng một prompt mô tả để hướng dẫn một AI khác tạo ra bản vẽ 2D chính xác. Prompt nên mô tả:
            1. Chủ thể chính và loại hình chiếu của nó (ví dụ: 'Tạo một bản vẽ mặt bằng kiến trúc 2D của tòa nhà...').
            2. Các đặc điểm hình học chính cần bao gồm, theo mức độ chi tiết (ví dụ: tường, cửa ra vào, cửa sổ, cầu thang, bố trí nội thất, kích thước, chú thích).
            3. Phong cách nét vẽ kỹ thuật và nghệ thuật cụ thể sẽ được sử dụng.
            4. Bất kỳ chi tiết quan trọng nào cần tập trung vào hoặc loại trừ.
    
            Đầu ra của bạn phải CHỈ LÀ prompt được tạo ra, bằng tiếng Việt.`;
    
            const inputBase64 = await blobToBase64(sketchupImage.file);
    
            const response = await apiClient.generateContent({
                model: getModelName('text'), // Dynamic model
                contents: {
                    parts: [
                        { inlineData: { data: inputBase64, mimeType: sketchupImage.file.type } },
                        { text: analysisPrompt }
                    ]
                },
            });
    
            const generatedPrompt = response.text;
            setAdditionalRequest(generatedPrompt);
    
        } catch (error) {
            console.error("Error analyzing sketchup image:", error);
            setAdditionalRequest("Lỗi phân tích hình ảnh. Vui lòng thử lại.");
        } finally {
            setIsAnalyzingSketchup(false);
        }
    };

    const handleGenerateSketchupDrawing = async () => {
        if (!sketchupImage) return;
    
        setSketchupIsLoading(true);
        setSketchupResult(null);
        setSketchupActiveTab('results');
    
        try {
    
            let prompt = `Từ hình ảnh 3D này, hãy tạo một bản vẽ kỹ thuật 2D chuyên nghiệp. Loại bản vẽ là: ${drawingType}. Phong cách nét vẽ là: ${lineStyle}. Mức độ chi tiết là: ${detailLevel}. Yêu cầu bổ sung: ${additionalRequest || 'không có'}. Kết quả phải là một bản vẽ sạch sẽ, rõ ràng, tuân thủ nghiêm ngặt các yêu cầu trên.`;
            
            if (isPro) prompt += proResolution === '4k' ? " Output resolution 4K, highly detailed." : proResolution === '1k' ? " Output resolution 1K." : " Output resolution 2K, high quality.";

            const inputBase64 = await blobToBase64(sketchupImage.file);
    
            const response = await apiClient.generateContent({
                model: getModelName('image'), // Dynamic model
                contents: {
                    parts: [
                        { inlineData: { data: inputBase64, mimeType: sketchupImage.file.type } },
                        { text: prompt }
                    ]
                },
                config: { 
                    responseModalities: ['IMAGE'],
                    imageConfig: {
                        aspectRatio: '1:1', // Technical drawings usually 1:1 or 4:3
                        ...getImageSize(isPro, proResolution)
                    }
                },
            });
    
            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    
            if (imagePart && imagePart.inlineData) {
                const resultImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setSketchupResult(resultImage);
                setSketchupHistory(prev => [{ input: sketchupImage.url, output: resultImage }, ...prev]);
            } else {
                console.error("Failed to generate sketchup drawing.");
            }
    
        } catch (error) {
            console.error("Error in handleGenerateSketchupDrawing:", error);
        } finally {
            setSketchupIsLoading(false);
        }
    };

    const transformImage = async (file: File, prompt: string) => {
        setIsTransforming(true);
        setTransformError(null);
        try {
            const inputBase64 = await blobToBase64(file);
            const response = await apiClient.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: inputBase64, mimeType: file.type } },
                        { text: prompt }
                    ]
                },
                config: { responseModalities: ['IMAGE'] }
            });

            const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
            if (imagePart && imagePart.inlineData) {
                const resultBase64 = imagePart.inlineData.data;
                const mimeType = imagePart.inlineData.mimeType;
                const resultUrl = `data:${mimeType};base64,${resultBase64}`;
                const resultFile = dataURLtoFile(resultUrl, `transformed-${Date.now()}.png`);
                
                setActiveInputFile(resultFile);
                setDisplayInputImage(resultUrl);
            } else {
                setTransformError(t('imageGenerationPage.errors.transformFailed'));
            }
        } catch (e) {
            console.error("Error transforming image:", e);
            setTransformError(t('imageGenerationPage.errors.transformError'));
        } finally {
            setIsTransforming(false);
        }
    };

    const handleImageTypeChange = (type: 'default' | 'sketchup' | 'realistic') => {
        setImageType(type);
        
        if (!originalInputImage) return;

        if (type === 'default') {
            setActiveInputFile(originalInputImage.file);
            setDisplayInputImage(originalInputImage.url);
            setTransformError(null);
        } else if (type === 'sketchup') {
            const prompt = "Architectural watercolor concept sketch with ink lines and soft wash tones, retain the original details. ";
            transformImage(originalInputImage.file, prompt);
        } else if (type === 'realistic') {
            const prompt = "Transform this real architectural photo into a detailed pencil sketch drawing, showing precise perspective lines, shading, and architectural proportions. Use fine graphite texture, visible pencil strokes, and subtle hatching for shadows. Keep the original composition, lighting, and camera angle of the photo. The result should look like a professional architectural hand-drawn sketch, clean, elegant, and realistic — no color, no watercolor wash. (architectural pencil sketch, graphite drawing, line art, hand-drawn texture, paper grain)";
            transformImage(originalInputImage.file, prompt);
        }
    };

    const handleAspectRatioChange = (label: string) => {
        const map: Record<string, string> = {
            "Tự động": "auto",
            "Theo ảnh gốc (Source Image)": "source",
             "Vuông (1:1)": "1:1",
             "Dọc (3:4)": "3:4",
            "Ngang (4:3)": "4:3",
            "Dọc (9:16)": "9:16",
            "Ngang (16:9)": "16:9",
            "Ngang (3:2)": "3:2",
            "Dọc (2:3)": "2:3",
            "Dọc (5:7)": "5:7",
             "Ngang (7:5)": "7:5",
             "Siêu rộng (21:9)": "21:9"
        };
        setSelectedAspectRatio(map[label] ?? "auto");
    };

    const currentAspectRatioLabel = useMemo(() => {
        const map: Record<string, string> = {
            "auto": "Tự động",
            "source": "Theo ảnh gốc (Source Image)",
            "1:1": "Vuông (1:1)",
            "3:4": "Dọc (3:4)",
            "4:3": "Ngang (4:3)",
            "9:16": "Dọc (9:16)",
            "16:9": "Ngang (16:9)",
            "3:2": "Ngang (3:2)",
             "2:3": "Dọc (2:3)",
             "5:7": "Dọc (5:7)",
             "7:5": "Ngang (7:5)",
             "21:9": "Siêu rộng (21:9)"
        };
        return map[selectedAspectRatio] ?? "Tự động";
    }, [selectedAspectRatio]);

    const renderNewAnglePage = () => (
        <div className="flex-grow flex flex-col lg:flex-row min-h-0">
             {/* Left Sidebar for New Angle */}
            <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                     <h2 className="font-bold text-white text-lg">1. Ảnh đầu vào</h2>
                     <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-gray-500 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {displayInputImage ? (
                            <>
                                <img src={displayInputImage} alt="Input" className="max-h-full max-w-full object-contain rounded-md" />
                                <button onClick={(e) => { e.stopPropagation(); handleClearInputImage(); }} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"><TrashIcon className="w-4 h-4" /></button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <PhotoIcon className="w-10 h-10 mb-2"/>
                                <p className="text-sm">Tải ảnh công trình cần tạo góc mới ( Upload Image ) </p>
                            </div>
                        )}
                     </div>
                     <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                     
                     {/* Suggestion Buttons */}
                     <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => handleSuggestAnglesList('beautiful')}
                            disabled={!activeInputFile || isSuggestingAnglesList}
                            className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs py-2 px-3 rounded border border-purple-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                         >
                            {isSuggestingAnglesList && suggestionListTitle === t('imageGenerationPage.actionButtons.suggestBeautifulAngle') ? <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent"></div> : <SparklesIcon className="w-3 h-3"/>}
                            {t('imageGenerationPage.actionButtons.suggestBeautifulAngle')}
                         </button>
                         <button 
                             onClick={() => handleSuggestAnglesList('zoom')}
                             disabled={!activeInputFile || isSuggestingAnglesList}
                             className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-xs py-2 px-3 rounded border border-blue-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                         >
                            {isSuggestingAnglesList && suggestionListTitle === t('imageGenerationPage.actionButtons.suggestZoomAngle') ? <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent"></div> : <MagnifyingGlassPlusIcon className="w-3 h-3"/>}
                            {t('imageGenerationPage.actionButtons.suggestZoomAngle')}
                         </button>
                     </div>
                     {/* Additional button row */}
                     <button 
                         onClick={() => handleSuggestAnglesList('interior')}
                         disabled={!activeInputFile || isSuggestingAnglesList}
                         className="w-full bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-xs py-2 px-3 rounded border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2"
                     >
                        {isSuggestingAnglesList && suggestionListTitle === t('imageGenerationPage.actionButtons.suggestBeautifulInteriorAngle') ? <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent"></div> : <MagnifyingGlassPlusIcon className="w-3 h-3"/>}
                        {t('imageGenerationPage.actionButtons.suggestBeautifulInteriorAngle')}
                     </button>
                </div>

                {/* Restored Section 3: Available Angle Templates - MOVED ABOVE DESCRIPTION */}
                <div className="space-y-4">
                    <h2 className="font-bold text-white text-lg">3. {t('imageGenerationPage.sidebar.setupAngleTemplatesTitle')}</h2>
                    
                    <div className="space-y-2">
                        <FilterDropdown
                            label={t('imageGenerationPage.sidebar.exteriorViewTitle')}
                            options={exteriorAngleSuggestions}
                            value={exteriorAngle}
                            onChange={handleExteriorAngleChange}
                            placeholder={t('imageGenerationPage.sidebar.exteriorViewPlaceholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <FilterDropdown
                            label={t('imageGenerationPage.sidebar.interiorViewTitle')}
                            options={interiorAngleSuggestions}
                            value={interiorAngle}
                            onChange={handleInteriorAngleChange}
                            placeholder={t('imageGenerationPage.sidebar.interiorViewPlaceholder')}
                        />
                    </div>
                </div>

                <div className="space-y-4 flex-grow flex flex-col min-h-0">
                    <h2 className="font-bold text-white text-lg">2. Mô tả góc mới ( Prompt ) </h2>
                    
                    {/* Always show textarea */}
                    <textarea
                        value={newAngleDescription}
                        onChange={(e) => setNewAngleDescription(e.target.value)}
                        className={`w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 resize-none focus:ring-2 focus:ring-orange-500 text-sm ${angleSuggestionsList ? 'h-24' : 'h-40'}`}
                        placeholder="Mô tả góc camera mới bạn muốn (Ví dụ: Góc nhìn từ trên cao xuống, bao quát toàn bộ công trình...).Describe the new camera angle you want (e.g., an overhead view, encompassing the entire building...)."
                    />

                    {/* Show List if active, below textarea */}
                    {angleSuggestionsList && (
                         <div className="flex-grow bg-slate-800 rounded-lg border border-slate-700 flex flex-col overflow-hidden mt-2">
                             <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-900/30">
                                 <h3 className="text-orange-400 font-semibold text-sm">{suggestionListTitle}</h3>
                                 <button onClick={() => setAngleSuggestionsList(null)} className="text-gray-400 hover:text-white"><XMarkIcon className="w-4 h-4"/></button>
                             </div>
                             <div className="flex-grow overflow-y-auto custom-scrollbar p-3">
                                <AngleSuggestionList 
                                    suggestions={angleSuggestionsList} 
                                    onSelect={(prompt) => {
                                        setNewAngleDescription(prompt);
                                        // List remains open for further selection
                                    }}
                                />
                             </div>
                         </div>
                    )}
                </div>

                <button 
                    onClick={handleGenerate}
                    disabled={!activeInputFile || isLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-lg text-lg transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Đang tạo góc mới...' : 'Tạo góc mới'}
                </button>
            </aside>

            {/* Right Panel */}
            <main className="flex-grow p-4 lg:p-6 bg-[#282f3d] flex flex-col">
                <div className="flex border-b border-gray-700 flex-shrink-0 mb-4">
                    <button
                        onClick={() => setNewAngleActiveTab('results')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${newAngleActiveTab === 'results' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Kết quả
                    </button>
                    <button
                        onClick={() => setNewAngleActiveTab('history')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${newAngleActiveTab === 'history' ? 'border-orange-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Lịch sử
                    </button>
                </div>

                 <div className="flex-grow bg-[#202633] rounded-lg p-4 h-full flex flex-col min-h-0 overflow-hidden">
                    {newAngleActiveTab === 'results' ? (
                        <div className="flex-grow flex items-center justify-center bg-black/20 rounded-lg overflow-hidden relative">
                             {isLoading ? (
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                                    <p className="text-gray-400">Đang render góc mới...</p>
                                </div>
                            ) : generatedImages.length > 0 ? (
                                <div className="relative group w-full h-full flex items-center justify-center">
                                    <ImageWithDimensions src={generatedImages[0]} alt="Result" className="max-w-full max-h-full object-contain" />
                                    <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImage(generatedImages[0])} className="bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                                        <a href={generatedImages[0]} download="new-angle.png" className="bg-blue-600 p-2 rounded-full text-white hover:bg-blue-500"><ArrowDownTrayIcon className="w-5 h-5"/></a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <p>Chưa có kết quả</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                            {newAngleHistory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <ClockIcon className="w-12 h-12 mb-2 opacity-50" />
                                    <p>Chưa có lịch sử</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {newAngleHistory.map((item, idx) => (
                                        <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-400">#{newAngleHistory.length - idx}</span>
                                                <span className="text-xs text-gray-500">Input vs Output</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 h-40">
                                                {/* Input */}
                                                <div className="relative group rounded overflow-hidden">
                                                    <img src={item.input} className="w-full h-full object-cover opacity-80" alt="Input" />
                                                    <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                                                </div>
                                                {/* Output */}
                                                <div className="relative group rounded overflow-hidden cursor-pointer">
                                                    <img src={item.outputs[0]} className="w-full h-full object-cover" alt="Output" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button onClick={() => setZoomedImage(item.outputs[0])} className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                                            <MagnifyingGlassPlusIcon className="w-4 h-4" />
                                                        </button>
                                                        <a href={item.outputs[0]} download={`new-angle-${idx}.png`} className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            </main>
        </div>
    );

    const render2DSketchupPage = () => (
        <div className="flex-grow flex flex-col lg:flex-row min-h-0">
             <aside className="w-full lg:w-[400px] flex-shrink-0 bg-[#202633] border-r border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                    <h2 className="font-bold text-white text-lg">1. Upload 3D/Sketchup</h2>
                    <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center text-center h-48 hover:border-gray-500 cursor-pointer" onClick={() => sketchupFileInputRef.current?.click()}>
                        {sketchupImage ? (
                            <>
                                <img src={sketchupImage.url} alt="Sketchup Input" className="max-h-full max-w-full object-contain rounded-md" />
                                <button onClick={(e) => { e.stopPropagation(); setSketchupImage(null); if(sketchupFileInputRef.current) sketchupFileInputRef.current.value = ""; }} className="absolute top-2 right-2 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500"><TrashIcon className="w-4 h-4" /></button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <PhotoIcon className="w-10 h-10 mb-2"/>
                                <p className="text-sm">Tải ảnh phối cảnh 3D</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={sketchupFileInputRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSketchupImage({ url: URL.createObjectURL(file), file });
                    }} className="hidden" accept="image/*" />
                </div>

                <div className="space-y-4">
                    <h2 className="font-bold text-white text-lg">2. Cấu hình bản vẽ 2D</h2>
                    
                    <div className="space-y-2">
                        <label className="text-sm text-gray-300">Loại bản vẽ</label>
                        <CustomSelect options={['Mặt bằng', 'Mặt đứng', 'Mặt cắt', 'Chi tiết cấu tạo']} value={drawingType} onChange={setDrawingType} placeholder="Chọn loại bản vẽ" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-300">Mức độ chi tiết</label>
                        <CustomSelect options={['Phác thảo', 'Cơ bản', 'Chi tiết', 'Kỹ thuật thi công']} value={detailLevel} onChange={setDetailLevel} placeholder="Chọn mức độ" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-300">Phong cách nét</label>
                        <CustomSelect options={['Nét chì (Pencil)', 'Nét mực (Ink)', 'Blueprint (Xanh)', 'CAD Line']} value={lineStyle} onChange={setLineStyle} placeholder="Chọn phong cách" />
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                             <label className="text-sm text-gray-300">Yêu cầu bổ sung</label>
                             <button onClick={handleAnalyzeSketchupImage} disabled={!sketchupImage || isAnalyzingSketchup} className="text-xs text-blue-400 hover:text-blue-300 underline disabled:text-gray-500">
                                 {isAnalyzingSketchup ? 'Đang phân tích...' : 'AI Phân tích ảnh'}
                             </button>
                        </div>
                        <textarea
                            value={additionalRequest}
                            onChange={(e) => setAdditionalRequest(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Mô tả thêm về yêu cầu bản vẽ..."
                        />
                    </div>
                </div>

                <button 
                    onClick={handleGenerateSketchupDrawing}
                    disabled={!sketchupImage || sketchupIsLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg text-lg transition-colors shadow-lg mt-auto disabled:bg-gray-600"
                >
                    {sketchupIsLoading ? 'Đang tạo bản vẽ...' : 'Tạo bản vẽ 2D'}
                </button>
             </aside>

             <main className="flex-grow p-4 lg:p-6 bg-[#282f3d] flex flex-col">
                <div className="flex border-b border-gray-700 mb-4">
                    <button onClick={() => setSketchupActiveTab('results')} className={`px-4 py-2 text-sm font-medium border-b-2 ${sketchupActiveTab === 'results' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Kết quả</button>
                    <button onClick={() => setSketchupActiveTab('history')} className={`px-4 py-2 text-sm font-medium border-b-2 ${sketchupActiveTab === 'history' ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>Lịch sử</button>
                </div>
                
                <div className="flex-grow bg-[#202633] rounded-lg p-4 min-h-0 overflow-hidden flex flex-col">
                    {sketchupActiveTab === 'results' ? (
                        <div className="flex-grow flex items-center justify-center relative">
                            {sketchupIsLoading ? (
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                                    <p className="text-gray-400">AI đang chuyển đổi sang 2D...</p>
                                </div>
                            ) : sketchupResult ? (
                                <div className="relative group w-full h-full flex items-center justify-center">
                                    <img src={sketchupResult} alt="2D Result" className="max-w-full max-h-full object-contain" />
                                    <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setZoomedImage(sketchupResult)} className="bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                                        <a href={sketchupResult} download="2d-drawing.png" className="bg-blue-600 p-2 rounded-full text-white hover:bg-blue-500"><ArrowDownTrayIcon className="w-5 h-5"/></a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <p>Chưa có kết quả</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                             <div className="grid grid-cols-2 gap-4">
                                {sketchupHistory.map((item, idx) => (
                                    <div key={idx} className="bg-slate-800 p-2 rounded-lg space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <img src={item.input} className="rounded aspect-square object-cover opacity-60" />
                                            <img src={item.output} className="rounded aspect-square object-cover" />
                                        </div>
                                        <button onClick={() => setZoomedImage(item.output)} className="w-full py-1 bg-slate-700 text-xs text-white rounded hover:bg-slate-600">Xem chi tiết</button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
             </main>
        </div>
    );

    return (
        <>
        {zoomedImage && (
            <ImageEditor
                imgSrc={zoomedImage}
                onClose={() => setZoomedImage(null)}
            />
        )}
        {/* ... Suggestion modals ... */}
        {isSuggestionModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsSuggestionModalOpen(false)}>
                <div className="relative bg-orange-600 text-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setIsSuggestionModalOpen(false)} title={t('autoColoring.closeBtn')} className="absolute top-3 right-3 bg-white/20 text-white p-2 rounded-full hover:bg-white/30 transition-transform hover:scale-110">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold mb-4 text-center">{t('imageGenerationPage.suggestionModal.title')}</h2>
                    <div className="space-y-6 text-sm">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">{t('imageGenerationPage.suggestionModal.situationHeader')}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse border border-orange-500">
                                    <thead className="bg-orange-700/50">
                                        <tr>
                                            <th className="p-2 border border-orange-500">{situationHeaders.situation}</th>
                                            <th className="p-2 border border-orange-500">{situationHeaders.groups}</th>
                                            <th className="p-2 border border-orange-500">{situationHeaders.suggestion}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(situationData) && situationData.map((row, index) => (
                                            <tr key={index} className="bg-orange-600/50">
                                                <td className="p-2 border border-orange-500">{row.situation}</td>
                                                <td className="p-2 border border-orange-500">{row.groups}</td>
                                                <td className="p-2 border border-orange-500">{row.suggestion}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">{t('imageGenerationPage.suggestionModal.combinationHeader')}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse border border-orange-500">
                                    <thead className="bg-orange-700/50">
                                        <tr>
                                            <th className="p-2 border border-orange-500">{combinationHeaders.combo}</th>
                                            <th className="p-2 border border-orange-500">{combinationHeaders.recommended}</th>
                                            <th className="p-2 border border-orange-500">{combinationHeaders.result}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(combinationData) && combinationData.map((row, index) => (
                                             <tr key={index} className="bg-orange-600/50">
                                                <td className="p-2 border border-orange-500">{row.combo}</td>
                                                <td className="p-2 border border-orange-500">{row.recommended}</td>
                                                <td className="p-2 border border-orange-500">{row.result}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                         <div>
                            <h3 className="text-lg font-semibold mb-2">{t('imageGenerationPage.suggestionModal.goldenRules.header')}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse border border-orange-500">
                                    <thead className="bg-orange-700/50">
                                        <tr>
                                            <th className="p-2 border border-orange-500">{goldenRulesHeaders.rule}</th>
                                            <th className="p-2 border border-orange-500">{goldenRulesHeaders.explanation}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(goldenRulesData) && goldenRulesData.map((row, index) => (
                                            <tr key={index} className="bg-orange-600/50">
                                                <td className="p-2 border border-orange-500">{row.rule}</td>
                                                <td className="p-2 border border-orange-500">{row.explanation}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {isEnvironmentSuggestionModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsEnvironmentSuggestionModalOpen(false)}>
                <div className="relative bg-[#282f3d] text-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setIsEnvironmentSuggestionModalOpen(false)} title={t('autoColoring.closeBtn')} className="sticky top-0 right-0 float-right -mr-3 -mt-3 bg-slate-600 text-white p-2 rounded-full hover:bg-slate-500 transition-transform hover:scale-110 z-10">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    {environmentSuggestions && (
                        <>
                            <h2 className="text-xl font-bold mb-1 text-center text-orange-400">{environmentSuggestions.title}</h2>
                            {environmentSuggestions.instruction && (
                                <p className="text-xs text-center text-gray-400 mb-4 italic">{environmentSuggestions.instruction}</p>
                            )}
                            <div className="space-y-4 text-sm">
                                {environmentSuggestions.sections?.map((section: any, secIndex: number) => (
                                    <div key={secIndex}>
                                        <h3 className="text-lg font-semibold mb-2 text-cyan-400">{section.title}</h3>
                                        <div className="space-y-3">
                                            {section.subsections?.map((subsection: any, subIndex: number) => (
                                                <div key={subIndex} className="pl-4">
                                                    <h4 className="font-semibold text-white mb-1">{subsection.title}</h4>
                                                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                                                        {subsection.items?.map((item: string, itemIndex: number) => (
                                                            <li key={itemIndex}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}
        {isOutputSuggestionModalOpen && outputSuggestions && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsOutputSuggestionModalOpen(false)}>
                <div className="relative bg-[#282f3d] text-white p-6 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setIsOutputSuggestionModalOpen(false)} title={t('autoColoring.closeBtn')} className="sticky top-0 right-0 float-right -mr-3 -mt-3 bg-slate-600 text-white p-2 rounded-full hover:bg-slate-500 transition-transform hover:scale-110 z-10">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold mb-2 text-center text-orange-400">{outputSuggestions.title}</h2>
                <h3 className="text-lg font-semibold mb-4 text-center text-cyan-300">{outputSuggestions.subtitle}</h3>
                
                {/* Table */}
                <div className="overflow-x-auto mb-6">
                    <table className="w-full text-left border-collapse border border-slate-700 text-sm">
                    <thead className="bg-slate-800">
                        <tr>
                        {Array.isArray(outputSuggestions.table?.headers) && outputSuggestions.table.headers.map((header: string) => (
                            <th key={header} className="p-3 border border-slate-700 text-gray-200">{header}</th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(outputSuggestions.table?.rows) && outputSuggestions.table.rows.map((row: any, index: number) => (
                        <tr key={index} className="bg-slate-900/50 hover:bg-slate-800/50">
                            <td className="p-3 border border-slate-700 font-semibold text-white">{row.style}</td>
                            <td className="p-3 border border-slate-700 font-mono text-xs text-cyan-300">{row.keywords}</td>
                            <td className="p-3 border border-slate-700 text-gray-300">{row.effect}</td>
                            <td className="p-3 border border-slate-700 text-gray-300">{row.usage}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>

                {/* Examples */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1 text-orange-400">{outputSuggestions.exampleTitle}</h3>
                    <p className="text-cyan-200 italic mb-4">{outputSuggestions.exampleTopic}</p>
                    <div className="space-y-4">
                    {Array.isArray(outputSuggestions.examples) && outputSuggestions.examples.map((ex: any, index: number) => (
                        <div key={index} className="bg-slate-800/50 p-4 rounded-lg">
                        <h4 className="font-bold text-white mb-1">{ex.title}</h4>
                        <p className="text-sm text-gray-300 mb-2">{ex.prompt}</p>
                        <p className="text-sm text-green-400 font-semibold">{ex.result}</p>
                        </div>
                    ))}
                    </div>
                </div>

                {/* Conclusion */}
                <div className="text-center text-gray-400 text-sm whitespace-pre-line">
                    {outputSuggestions.conclusion}
                </div>
                </div>
            </div>
        )}
        {isColorPaletteSuggestionModalOpen && (() => {
            const suggestions = t('imageGenerationPage.colorPaletteSuggestionModal');
            if (!suggestions) return null;
            return (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsColorPaletteSuggestionModalOpen(false)}>
                    <div className="relative bg-[#282f3d] text-white p-6 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsColorPaletteSuggestionModalOpen(false)} title={t('autoColoring.closeBtn')} className="sticky top-0 right-0 float-right -mr-3 -mt-3 bg-slate-600 text-white p-2 rounded-full hover:bg-slate-500 transition-transform hover:scale-110 z-10">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold mb-2 text-center text-orange-400">{suggestions.title}</h2>
                        <p className="text-sm text-center text-gray-400 mb-6 italic">{suggestions.subtitle}</p>
                        
                        <div className="space-y-8">
                            {Array.isArray(suggestions.groups) && suggestions.groups.map((group: any, index: number) => (
                                <div key={index}>
                                    <h3 className="text-xl font-semibold mb-3 text-cyan-400">{group.title}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse border border-slate-700 text-sm">
                                            <thead className="bg-slate-800">
                                                <tr>
                                                    {Array.isArray(group.headers) && group.headers.map((header: string, hIndex: number) => (
                                                        <th key={hIndex} className="p-3 border border-slate-700 text-gray-200">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.isArray(group.rows) && group.rows.map((row: string[], rIndex: number) => (
                                                    <tr key={rIndex} className="bg-slate-900/50 hover:bg-slate-800/50">
                                                        {row.map((cell: string, cIndex: number) => (
                                                            <td key={cIndex} className={`p-3 border border-slate-700 text-gray-300 ${cIndex === 0 ? 'text-center' : ''}`}>{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}

                            {suggestions.formula && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3 text-cyan-400">{suggestions.formula.title}</h3>
                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                        <p className="font-mono text-cyan-300 whitespace-pre-line">{suggestions.formula.template}</p>
                                        <h4 className="font-semibold text-white mt-4">{suggestions.formula.exampleTitle}</h4>
                                        <p className="italic text-gray-300 whitespace-pre-line">{suggestions.formula.exampleText}</p>
                                    </div>
                                </div>
                            )}

                            {suggestions.summary && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3 text-cyan-400">{suggestions.summary.title}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse border border-slate-700 text-sm">
                                            <thead className="bg-slate-800">
                                                <tr>
                                                    {Array.isArray(suggestions.summary.headers) && suggestions.summary.headers.map((header: string, hIndex: number) => (
                                                        <th key={hIndex} className="p-3 border border-slate-700 text-gray-200">{header}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.isArray(suggestions.summary.rows) && suggestions.summary.rows.map((row: string[], rIndex: number) => (
                                                    <tr key={rIndex} className="bg-slate-900/50 hover:bg-slate-800/50">
                                                        {row.map((cell: string, cIndex: number) => (
                                                            <td key={cIndex} className="p-3 border border-slate-700 text-gray-300">{cell}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 bg-slate-800/50 p-4 rounded-lg text-gray-300 whitespace-pre-line">
                                        {suggestions.summary.conclusion}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        })()}
        {isCameraAngleSuggestionModalOpen && (() => {
            const suggestions = t('imageGenerationPage.cameraAngleSuggestionModal');
            if (!suggestions || typeof suggestions !== 'object') return null;

            const renderTable = (tableData: any, className?: string) => (
                <div className={`overflow-x-auto ${className}`}>
                    <table className="w-full text-left border-collapse border border-slate-700 text-sm">
                        <thead className="bg-slate-800">
                            <tr>{tableData.headers?.map((h: string) => <th key={h} className="p-3 border border-slate-700 text-white font-semibold">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {tableData.rows?.map((row: string[], rIndex: number) => (
                                <tr key={rIndex} className="bg-slate-900/50 hover:bg-slate-800/50">
                                    {row.map((cell: string, cIndex: number) => <td key={cIndex} className="p-3 border border-slate-700 text-gray-300">{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

            return (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsCameraAngleSuggestionModalOpen(false)}>
                    <div className="relative bg-[#282f3d] text-white p-6 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setIsCameraAngleSuggestionModalOpen(false)} title={t('autoColoring.closeBtn')} className="sticky top-0 right-0 float-right -mr-3 -mt-3 bg-slate-600 text-white p-2 rounded-full hover:bg-slate-500 transition-transform hover:scale-110 z-10">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-center text-orange-400">{suggestions.title}</h2>
                        
                        <div className="space-y-8">
                            {suggestions.sections?.map((section: any, index: number) => (
                                <div key={index}>
                                    <h3 className="text-xl font-semibold mb-3 text-cyan-400">{section.title}</h3>
                                    {section.content && <p className="text-gray-300 whitespace-pre-line mb-3">{section.content}</p>}
                                    {section.points && <ul className="list-disc list-inside space-y-1 mb-3">{section.points.map((p: string) => <li key={p}>{p}</li>)}</ul>}
                                    {section.example && <div className="bg-slate-800/50 p-4 rounded-lg font-mono text-cyan-300 text-sm whitespace-pre-line">{section.example}</div>}
                                    {section.table && renderTable(section.table)}
                                </div>
                            ))}

                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-center text-orange-400">{suggestions.summaryTitle}</h2>
                                {suggestions.summarySections?.map((section: any, index: number) => (
                                    <div key={index}>
                                        <h3 className="text-xl font-semibold mb-3 text-cyan-400">{section.title}</h3>
                                        {section.description && <p className="text-gray-400 italic mb-4">{section.description}</p>}
                                        {section.table && renderTable(section.table, 'mb-6')}
                                    </div>
                                ))}
                            </div>
                            
                            {suggestions.summary && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3 text-cyan-400">{suggestions.summary.title}</h3>
                                    {renderTable(suggestions.summary.table)}
                                </div>
                            )}

                            {suggestions.howToUse && (
                                <div>
                                    <h3 className="text-xl font-semibold mb-3 text-cyan-400">{suggestions.howToUse.title}</h3>
                                    {suggestions.howToUse.steps.map((step: any, index: number) => (
                                        <div key={index} className="mb-4">
                                            <h4 className="font-semibold text-white">{step.title}</h4>
                                            {step.content && <p className="text-gray-300 whitespace-pre-line">{step.content}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {suggestions.conclusion && (
                             <div className="mt-8 bg-slate-800/50 p-4 rounded-lg text-gray-300 whitespace-pre-line">{suggestions.conclusion}</div>
                        )}
                        {suggestions.finalNote && <p className="mt-8 text-center text-sm text-gray-400 italic">{suggestions.finalNote}</p>}
                    </div>
                </div>
            );
        })()}
        <div className="bg-[#282f3d] min-h-screen flex flex-col font-sans text-gray-300">
            <header className="bg-[#286453] text-center py-6 text-white shadow-md flex-shrink-0 relative">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-wider animate-glow">3DMILI.ORG - APPS AUTO RENDERING ¯™</h1>
                <p className="text-xs tracking-wide text-gray-300 mt-2 px-4">{t('imageGenerationPage.subtitle')}</p>
                
                <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
                    <button
                      onClick={toggleMode}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                        mode === 'pro' || mode === 'banana2'
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-lg shadow-purple-500/30'
                          : 'bg-slate-800 text-yellow-400 border-yellow-500/30 hover:bg-slate-700'
                      }`}
                      title={mode === 'pro' ? "Đang dùng Nano Banana Pro (4K, Gemini 3.1)" : mode === 'banana2' ? "Đang dùng Banana 2 (Gemini 3.1 Flash Image)" : "Đang dùng Nano Banana (Basic, Gemini 2.5)"}
                    >
                      {mode === 'pro' || mode === 'banana2' ? <SparklesIcon className="w-4 h-4 animate-pulse" /> : <BoltIcon className="w-4 h-4" />}
                      <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                        {mode === 'pro' ? 'Pro Ver 3.0' : mode === 'banana2' ? 'Banana 2' : 'Basic Ver 2.5'}
                      </span>
                    </button>

                    <button
                      onClick={toggleSnow}
                      title={isSnowing ? "Tắt tuyết rơi" : "Bật tuyết rơi"}
                      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center border ${
                        isSnowing 
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-lg leading-none">❄️</span>
                    </button>
                </div>
            </header>

            <div className="flex-grow flex flex-col min-h-0">
                <nav className="bg-[#202633] px-4 sm:px-6 py-2 border-b border-t border-black/20 flex-shrink-0">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="w-full lg:flex-1 flex justify-start">
                            <button onClick={() => onNavigate('home')} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                                <ChevronLeftIcon className="w-5 h-5" />
                                <span className="font-semibold">Home</span>
                            </button>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex flex-wrap justify-center items-center gap-2">
                                {mainActionButtons.map(btn => (
                                    <button key={btn.id} onClick={() => handleActionChange(btn.id)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeAction === btn.id ? 'bg-orange-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                                        {t(btn.key)}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                                {subActionButtons.map(btn => {
                                    const isLocked = isFreePlan && !FREE_ALLOWED_TABS.includes(btn.id);
                                    return (
                                        <button key={btn.id} onClick={() => handleActionChange(btn.id)} className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeAction === btn.id ? 'bg-orange-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} ${isLocked ? 'opacity-60' : ''}`}>
                                            {t(btn.key)}
                                            {isLocked && <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white px-1 rounded-full font-bold">PRO</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="w-full lg:flex-1 flex justify-center lg:justify-end items-center gap-4">
                            <OnlineStatus />
                            <LanguageSwitcher />
                        </div>
                    </div>
                </nav>
                
                 {activeAction === 'edit' ? (
                    <ImageEditMainPage />
                ) : activeAction === 'toVideo' ? (
                    <ImageToVideoUI />
                ) : activeAction === 'sharpen' ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-[#282f3d]">
                        <div className="bg-[#202633] p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-gray-700 animate-fade-in">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <SparklesIcon className="w-full h-full text-blue-400 animate-pulse" />
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2 font-architecture">AI Image Upscaler</h2>
                            <h3 className="text-xl text-orange-400 font-semibold mb-4">Tăng nét ảnh</h3>
                            <p className="text-gray-300 mb-8 text-sm leading-relaxed">
                                Công cụ chuyên dụng giúp làm rõ ảnh, tăng độ phân giải và khử nhiễu tốt nhất được cung cấp bởi đối tác của chúng tôi.
                                <br/>
                                Bấm vào nút bên dưới để truy cập công cụ xử lý.
                            </p>
                            <a
                                href="https://aifaceswap.io/ai-image-upscaler/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/50"
                            >
                                <span>Truy cập Công cụ Tăng nét</span>
                                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                ) : activeAction === 'utils' ? (
                    <OtherUtilsPage />
                ) : comingSoonFeatures.includes(activeAction) ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-[#282f3d]">
                        <ClockIcon className="w-24 h-24 text-orange-400/50 mb-6" />
                        <h2 className="text-4xl font-bold text-white mb-2 font-architecture tracking-wider animate-glow">
                            {t('imageGenerationPage.comingSoon.title')}
                        </h2>
                        <p className="text-gray-400 max-w-md">
                            {t('imageGenerationPage.comingSoon.description', {
                                featureName: t(actionButtons.find(b => b.id === activeAction)?.key || '')
                            })}
                        </p>
                    </div>
                ) : activeAction === 'newAngle' ? (
                    renderNewAnglePage()
                ) : activeAction === 'zoom' ? (
                    render2DSketchupPage()
                ) : (
                    <div className="flex-grow flex flex-col lg:flex-row min-h-0">
                        {/* Left Sidebar */}
                        <aside className="w-full lg:w-[525px] flex-shrink-0 bg-[#202633] flex flex-col border-b lg:border-b-0 lg:border-r border-gray-700">
                            <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                                <div className="space-y-4">
                                
                                    {/* Input Image Section */}
                                    <div className="space-y-3">
                                        <h2 className="font-bold text-white">1. {t('imageGenerationPage.sidebar.inputImageTitle')}</h2>
                                        <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-2 flex flex-col items-center justify-center text-center h-40 hover:border-gray-500">
                                            {isTransforming && (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                                                    <p className="mt-3 text-sm text-gray-300">{t('imageGenerationPage.sidebar.transforming')}</p>
                                                </div>
                                            )}
                                            {displayInputImage ? (
                                                <>
                                                    <img src={displayInputImage} alt="Input preview" className="max-h-full max-w-full object-contain rounded-md" />
                                                    <button onClick={handleClearInputImage} title={t('imageGenerationPage.sidebar.clearImageBtn')} className="absolute top-1 right-1 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-20">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div onClick={() => fileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                    <PhotoIcon className="w-8 h-8 text-gray-500 mb-2" />
                                                    <p className="text-sm text-gray-400">{t('imageGenerationPage.sidebar.uploadPlaceholder')}</p>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition-colors">
                                            {t('imageGenerationPage.sidebar.uploadBtn')}
                                        </button>
                                        {transformError && <p className="text-sm text-red-400 text-center">{transformError}</p>}
                                        <div className="flex justify-between items-center text-sm pt-2">
                                            {(['default', 'sketchup', 'realistic'] as const).map((type) => {
                                                const colors = { default: 'bg-yellow-400', sketchup: 'bg-blue-400', realistic: 'bg-green-400' };
                                                return (
                                                    <label key={type} className={`flex items-center space-x-2 ${originalInputImage ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center flex-shrink-0">
                                                            {imageType === type && <div className={`w-2 h-2 rounded-full ${colors[type]}`}></div>}
                                                        </div>
                                                        <input type="radio" name="imageType" value={type} checked={imageType === type} onChange={() => handleImageTypeChange(type)} className="hidden" disabled={!originalInputImage} />
                                                        <span className={`text-gray-300 ${!originalInputImage ? 'opacity-50' : ''}`}>{t(`imageGenerationPage.sidebar.imageTypes.${type}`)}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-white mt-2">
                                            {t('imageGenerationPage.sidebar.inputImageNote')}
                                        </p>
                                    </div>

                                    {/* Reference Image Section */}
                                    <div className="space-y-3">
                                        <h2 className="font-bold text-white">2. {t('imageGenerationPage.sidebar.referenceImageTitle')}</h2>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Left: Apply Now (Style Transfer) */}
                                            <div className="flex flex-col gap-2">
                                                <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-2 flex flex-col items-center justify-center text-center h-32 hover:border-gray-500">
                                                    {isAnalyzing && analysisType === 'style' && (
                                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                                                            <p className="mt-3 text-sm text-gray-300">{t('imageGenerationPage.sidebar.analyzing')}</p>
                                                        </div>
                                                    )}
                                                    {referenceImage ? (
                                                        <>
                                                            <img src={referenceImage.url} alt="Reference preview" className="max-h-full max-w-full object-contain rounded-md" />
                                                            <button onClick={handleClearReferenceImage} title={t('imageGenerationPage.sidebar.clearImageBtn')} className="absolute top-1 right-1 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-20">
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div onClick={() => referenceFileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                            <PhotoIcon className="w-8 h-8 text-gray-500 mb-2" />
                                                            <p className="text-sm text-gray-400">{t('imageGenerationPage.sidebar.referenceUploadPlaceholder')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <input type="file" ref={referenceFileInputRef} onChange={handleReferenceImageUpload} className="hidden" accept="image/*" />
                                                <button onClick={() => referenceFileInputRef.current?.click()} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition-colors">
                                                    {t('imageGenerationPage.sidebar.referenceUploadBtn')}
                                                </button>
                                            </div>

                                            {/* Right: Apply to Filter */}
                                            <div className="flex flex-col gap-2">
                                                <div className="relative border-2 border-dashed border-gray-600 rounded-lg p-2 flex flex-col items-center justify-center text-center h-32 hover:border-gray-500">
                                                    {isAnalyzing && analysisType === 'filter' && (
                                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 rounded-lg">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
                                                            <p className="mt-3 text-sm text-gray-300">{t('imageGenerationPage.sidebar.analyzing')}</p>
                                                        </div>
                                                    )}
                                                    {filterReferenceImage ? (
                                                        <>
                                                            <img src={filterReferenceImage.url} alt="Filter Reference preview" className="max-h-full max-w-full object-contain rounded-md" />
                                                            <button onClick={handleClearFilterReferenceImage} title={t('imageGenerationPage.sidebar.clearImageBtn')} className="absolute top-1 right-1 p-1.5 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-20">
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div onClick={() => filterReferenceFileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                                            <PhotoIcon className="w-8 h-8 text-gray-500 mb-2" />
                                                            <p className="text-sm text-gray-400">{t('imageGenerationPage.sidebar.referenceUploadPlaceholder')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <input type="file" ref={filterReferenceFileInputRef} onChange={handleFilterReferenceImageUpload} className="hidden" accept="image/*" />
                                                <button onClick={() => filterReferenceFileInputRef.current?.click()} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 rounded-lg transition-colors">
                                                    {t('imageGenerationPage.sidebar.referenceFilterBtn')}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-white mt-2">{t('imageGenerationPage.sidebar.referenceImageNote')}</p>
                                    </div>
                                    
                                    {/* Creative Filter Section */}
                                    <fieldset disabled={!!referenceImage || (isAnalyzing && analysisType === 'filter')} className="space-y-3 disabled:opacity-50">
                                        <h2 className="font-bold text-white">3. {t('imageGenerationPage.sidebar.creativeFilterTitle')}</h2>
                                        {activeAction === 'exterior' ? (
                                            <>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label htmlFor="output-image-type" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.outputImageTitle')}</label>
                                                        <div className="flex items-center gap-2">
                                                            <button type="button" onClick={() => setIsOutputSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.usageSuggestionBtn')}
                                                            </button>
                                                            <span className="text-red-500 text-xs font-semibold">{t('imageGenerationPage.sidebar.requiredLabel')}</span>
                                                        </div>
                                                    </div>
                                                    <SmartFilterInput
                                                        id="output-image-type"
                                                        value={outputImageType}
                                                        onChange={setOutputImageType}
                                                        placeholder={t('imageGenerationPage.sidebar.outputImageTypePlaceholder')}
                                                        suggestions={Array.isArray(outputImageTypes) ? outputImageTypes : []}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-baseline justify-between">
                                                        <label htmlFor="construction-type" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.constructionTypeLabel')}</label>
                                                        <span className="text-red-500 text-xs font-semibold">{t('imageGenerationPage.sidebar.requiredLabel')}</span>
                                                    </div>
                                                    <SmartFilterInput id="construction-type" value={constructionType} onChange={setConstructionType} placeholder={t('imageGenerationPage.sidebar.constructionTypePlaceholder')} suggestions={Array.isArray(constructionTypes) ? constructionTypes : []} />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-baseline justify-between">
                                                        <label htmlFor="design-style" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.designStyleLabel')}</label>
                                                        {isFreePlan ? (
                                                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">🔒 PRO</span>
                                                        ) : (
                                                            <span className="text-red-500 text-xs font-semibold">{t('imageGenerationPage.sidebar.requiredLabel')}</span>
                                                        )}
                                                    </div>
                                                    {isFreePlan ? (
                                                        <div
                                                            onClick={() => { setUpgradeMessage('Phong cách thiết kế là tính năng PRO. Nâng cấp để tùy chỉnh phong cách!'); setShowUpgradeModal(true); }}
                                                            className="w-full px-3 py-2.5 bg-gray-700/50 border border-amber-500/30 rounded-lg text-gray-500 text-sm cursor-pointer flex items-center justify-between"
                                                        >
                                                            <span>🔒 Nâng cấp PRO để dùng</span>
                                                        </div>
                                                    ) : (
                                                        <SmartFilterInput id="design-style" value={designStyle} onChange={setDesignStyle} placeholder={t('imageGenerationPage.sidebar.designStylePlaceholder')} suggestions={Array.isArray(designStyles) ? designStyles : []} />
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-baseline justify-between">
                                                        <label htmlFor="location-context" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.locationContextLabel')}</label>
                                                        <span className="text-red-500 text-xs font-semibold">{t('imageGenerationPage.sidebar.requiredLabel')}</span>
                                                    </div>
                                                    <SmartFilterInput 
                                                        id="location-context" 
                                                        value={locationContext} 
                                                        onChange={setLocationContext} 
                                                        placeholder={t('imageGenerationPage.sidebar.locationContextPlaceholder')} 
                                                        suggestions={Array.isArray(locationContexts) ? locationContexts : []} 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-baseline gap-2">
                                                            <label htmlFor="applied-materials" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.appliedMaterialsLabel')}</label>
                                                            <span className="text-red-500 text-xs font-semibold">{t('imageGenerationPage.sidebar.requiredLabel')}</span>
                                                        </div>
                                                        <button onClick={() => setIsSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.usageSuggestionBtn')}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-grow">
                                                            <SmartFilterInput
                                                                 id="applied-materials"
                                                                multiSelect
                                                                value={appliedMaterials}
                                                                onChange={setAppliedMaterials}
                                                                placeholder={t('imageGenerationPage.sidebar.appliedMaterialsPlaceholder')}
                                                                suggestions={Array.isArray(appliedMaterialsList) ? appliedMaterialsList : []}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleAiSuggestMaterials}
                                                            disabled={isSuggestingMaterials || !originalInputImage}
                                                            className="flex-shrink-0 bg-[#3b312a] hover:bg-[#4c3f36] text-[#e0c59a] font-bold px-3 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed min-h-[44px]"
                                                        >
                                                            <SparklesIcon className="w-4 h-4" />
                                                            <span>{isSuggestingMaterials ? t('imageGenerationPage.sidebar.aiSuggesting') : t('imageGenerationPage.sidebar.aiSuggestionBtn')}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label htmlFor="environmental-characteristics" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.environmentalCharacteristicsLabel')}</label>
                                                        <button onClick={() => setIsEnvironmentSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.usageSuggestionBtn')}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-grow">
                                                            <SmartFilterInput
                                                                id="environmental-characteristics"
                                                                multiSelect
                                                                value={environmentalCharacteristics}
                                                                onChange={setEnvironmentalCharacteristics}
                                                                placeholder={t('imageGenerationPage.sidebar.environmentalCharacteristicsPlaceholder')}
                                                                suggestions={Array.isArray(environmentalCharacteristicsList) ? environmentalCharacteristicsList : []}
                                                            />
                                                        </div>
                                                         <button
                                                            type="button"
                                                            onClick={handleAiSuggestEnvironment}
                                                            disabled={isSuggesting || !constructionType || !designStyle || !locationContext}
                                                            className="flex-shrink-0 bg-[#3b312a] hover:bg-[#4c3f36] text-[#e0c59a] font-bold px-3 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed min-h-[44px]"
                                                        >
                                                            <SparklesIcon className="w-4 h-4" />
                                                            <span>{isSuggesting ? t('imageGenerationPage.sidebar.aiSuggesting') : t('imageGenerationPage.sidebar.aiSuggestionBtn')}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                 <div className="space-y-2">
                                                    <label htmlFor="distant-context" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.distantContextLabel')}</label>
                                                    <SmartFilterInput id="distant-context" value={distantContext} onChange={setDistantContext} placeholder={t('imageGenerationPage.sidebar.distantContextPlaceholder')} suggestions={Array.isArray(distantContexts) ? distantContexts : []} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="season" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.seasonLabel')}</label>
                                                    <SmartFilterInput id="season" value={season} onChange={setSeason} placeholder={t('imageGenerationPage.sidebar.seasonPlaceholder')} suggestions={Array.isArray(seasonSuggestions) ? seasonSuggestions : []} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="time-of-day" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.timeOfDayLabel')}</label>
                                                    <SmartFilterInput id="time-of-day" value={timeOfDay} onChange={setTimeOfDay} placeholder={t('imageGenerationPage.sidebar.timeOfDayPlaceholder')} suggestions={Array.isArray(timeOfDaySuggestions) ? timeOfDaySuggestions : []} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="weather-condition" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.weatherConditionLabel')}</label>
                                                    <SmartFilterInput id="weather-condition" value={weatherCondition} onChange={setWeatherCondition} placeholder={t('imageGenerationPage.sidebar.weatherConditionPlaceholder')} suggestions={Array.isArray(weatherConditions) ? weatherConditions : []} />
                                                </div>
                                                <div className="space-y-2">
                                                     <div className="flex items-center justify-between">
                                                        <label htmlFor="tone-and-mood" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.toneAndMoodLabel')}</label>
                                                        <button onClick={() => setIsColorPaletteSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.usageSuggestionBtn')}
                                                        </button>
                                                    </div>
                                                    <SmartFilterInput id="tone-and-mood" value={toneAndMood} onChange={setToneAndMood} placeholder={t('imageGenerationPage.sidebar.toneAndMoodPlaceholder')} suggestions={Array.isArray(toneAndMoodSuggestions) ? toneAndMoodSuggestions : []} />
                                                </div>
                                                <div className="space-y-2">
                                                     <div className="flex items-center justify-between">
                                                        <label htmlFor="camera-angle" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.cameraAngleLabel')}</label>
                                                        <button onClick={() => setIsCameraAngleSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.usageSuggestionBtn')}
                                                        </button>
                                                    </div>
                                                    <SmartFilterInput id="camera-angle" value={cameraAngle} onChange={setCameraAngle} placeholder={t('imageGenerationPage.sidebar.cameraAnglePlaceholder')} suggestions={Array.isArray(cameraAngleSuggestions) ? cameraAngleSuggestions : []} />
                                                </div>
                                            </>
                                        ) : ( // Interior Mode
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label htmlFor="output-image-type-interior" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.outputImageTitle')}</label>
                                                        <div className="flex items-center gap-2">
                                                            <button type="button" onClick={() => setIsOutputSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.usageSuggestionBtn')}
                                                            </button>
                                                            <span className="text-red-500 text-xs font-semibold">{t('imageGenerationPage.sidebar.requiredLabel')}</span>
                                                        </div>
                                                    </div>
                                                    <SmartFilterInput
                                                        id="output-image-type-interior"
                                                        value={outputImageType}
                                                        onChange={setOutputImageType}
                                                        placeholder={t('imageGenerationPage.sidebar.outputImageTypePlaceholder')}
                                                        suggestions={Array.isArray(outputImageTypes) ? outputImageTypes : []}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="room-type" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.roomTypeLabel')}</label>
                                                    <SmartFilterInput
                                                        id="room-type"
                                                        value={roomType}
                                                        onChange={setRoomType}
                                                        placeholder={t('imageGenerationPage.sidebar.roomTypePlaceholder')}
                                                        suggestions={Array.isArray(roomTypes) ? roomTypes : []}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="interior-design-style" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.interiorDesignStyleLabel')}</label>
                                                    <SmartFilterInput
                                                        id="interior-design-style"
                                                        value={interiorDesignStyle}
                                                        onChange={setInteriorDesignStyle}
                                                        placeholder={t('imageGenerationPage.sidebar.interiorDesignStylePlaceholder')}
                                                        suggestions={Array.isArray(interiorDesignStyles) ? interiorDesignStyles : []}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label htmlFor="main-color-tone" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.mainColorToneLabel')}</label>
                                                        <button type="button" onClick={() => setIsColorPaletteSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.aiSuggestionBtn')}
                                                        </button>
                                                    </div>
                                                    <SmartFilterInput
                                                        id="main-color-tone"
                                                        value={mainColorTone}
                                                        onChange={setMainColorTone}
                                                        placeholder={t('imageGenerationPage.sidebar.mainColorTonePlaceholder')}
                                                        suggestions={Array.isArray(mainColorTones) ? mainColorTones : []}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <label htmlFor="camera-angle-composition" className="text-sm font-semibold text-white">{t('imageGenerationPage.sidebar.cameraAngleAndCompositionLabel')}</label>
                                                        <button type="button" onClick={() => setIsCameraAngleSuggestionModalOpen(true)} className="text-sm text-orange-400 hover:text-orange-300 font-semibold underline">
                                                            {t('imageGenerationPage.sidebar.aiSuggestionBtn')}
                                                        </button>
                                                    </div>
                                                    <SmartFilterInput
                                                        id="camera-angle-composition"
                                                        value={cameraAngleAndComposition}
                                                        onChange={setCameraAngleAndComposition}
                                                        placeholder={t('imageGenerationPage.sidebar.cameraAngleAndCompositionPlaceholder')}
                                                        suggestions={Array.isArray(cameraAngleAndCompositionSuggestions) ? cameraAngleAndCompositionSuggestions : []}
                                                    />
                                                </div>
                                                <MaterialFilter onDescriptionChange={setMaterialDescription} activeInputFile={activeInputFile} />
                                                <ContextLocationViewFilter onDescriptionChange={setContextLocationViewDescription} />
                                                <LightingFilter onDescriptionChange={setLightingSystemDescription} activeInputFile={activeInputFile} />
                                                <LightToneFilter onDescriptionChange={setLightToneDescription} />
                                                <TimeAndClimateFilter onDescriptionChange={setTimeAndClimateDescription} />
                                                <CustomSelect label={t('imageGenerationPage.sidebar.renderQualityStyleLabel')} options={Array.isArray(renderQualityStyles) ? renderQualityStyles : []} value={renderQualityStyle} onChange={setRenderQualityStyle} placeholder={t('imageGenerationPage.sidebar.renderQualityStylePlaceholder')} />
                                            </div>
                                        )}
                                    </fieldset>

                                    {/* Prompt Section */}
                                    <div className="space-y-2">
                                        <div className="flex items-baseline justify-between">
                                            <label htmlFor="description" className="font-bold text-white">4. {t('imageGenerationPage.sidebar.descriptionLabel')}</label>
                                            <span className="text-red-500 text-xs font-semibold">{t('imageGenerationPage.sidebar.readCarefullyLabel')}</span>
                                        </div>
                                        <textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => {
                                                setDescription(e.target.value);
                                                setSelectedTemplate('');
                                            }}
                                            rows={8}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            placeholder={t('imageGenerationPage.sidebar.descriptionPlaceholder')}
                                        ></textarea>
                                         <button
                                            onClick={handleOptimizePrompt}
                                            disabled={isOptimizing || (!description && !originalInputImage)}
                                            className="w-full bg-[#3b312a] hover:bg-[#4c3f36] text-[#e0c59a] font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed"
                                        >
                                            {isOptimizing ? t('imageGenerationPage.sidebar.optimizingPrompt') : t('imageGenerationPage.sidebar.optimizePromptBtn')}
                                        </button>
                                    </div>

                                    {activeAction === 'exterior' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="font-bold text-white">{t('imageGenerationPage.sidebar.templateDescriptionTitle')}</label>
                                                <span className="text-red-400 text-xs italic">{t('imageGenerationPage.sidebar.templateDescriptionHint')}</span>
                                            </div>
                                            <CustomSelect
                                                value={selectedTemplate}
                                                onChange={handleTemplateChange}
                                                placeholder={t('imageGenerationPage.sidebar.templateDescriptionPlaceholder')}
                                                options={templateOptions}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <h2 className="font-bold text-white text-base">6. Tỉ lệ khung hình</h2>
                                        <CustomSelect 
                                            options={["Tự động","Theo ảnh gốc (Source Image)","Vuông (1:1)","Ngang (4:3)","Dọc (3:4)","Ngang (3:2)","Dọc (2:3)","Ngang (7:5)","Dọc (5:7)","Ngang (16:9)","Dọc (9:16)","Siêu rộng (21:9)"]}
                                            value={currentAspectRatioLabel}
                                            onChange={handleAspectRatioChange}
                                            placeholder="Tự động"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="font-bold text-white">{t('imageGenerationPage.sidebar.numberOfResultsLabel')}</label>
                                        <div className="flex items-center justify-between bg-slate-800 rounded-lg">
                                            <button 
                                                onClick={() => setNumberOfImages(n => Math.max(1, n - 1))}
                                                disabled={numberOfImages <= 1}
                                                className="px-5 py-2 text-2xl font-bold text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
                                                aria-label="Decrease image count"
                                            >
                                                -
                                            </button>
                                            <span className="text-xl font-bold text-white" aria-live="polite">{numberOfImages}</span>
                                            <button 
                                                onClick={() => setNumberOfImages(n => Math.min(4, n + 1))}
                                                disabled={numberOfImages >= 4}
                                                className="px-5 py-2 text-2xl font-bold text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
                                                aria-label="Increase image count"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-shrink-0 p-4 bg-[#202633] border-t border-gray-700 z-10">
                                <button onClick={handleGenerate} disabled={!activeInputFile || isLoading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    {isLoading ? t('imageGenerationPage.sidebar.generating') : t('imageGenerationPage.sidebar.generateBtn')}
                                </button>
                            </div>
                        </aside>

                        {/* Right Main Panel */}
                        <main className="flex-grow p-4 flex flex-col bg-[#282f3d]">
                            <div className="flex border-b border-gray-700 flex-shrink-0">
                                <button onClick={() => setActiveTab('results')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'results' ? 'text-white border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}>{t('imageGenerationPage.main.resultsTab')}</button>
                                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'history' ? 'text-white border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}>{t('imageGenerationPage.main.historyTab')}</button>
                            </div>
                             <div className="flex-grow bg-[#202633] rounded-b-lg mt-[-1px] min-h-0">
                                {activeTab === 'results' ? (
                                    <div className="h-full relative">
                                        {isLoading && generatedImages.length === 0 ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10 rounded-lg">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                                                <p className="text-white font-medium animate-pulse">{t('imageGenerationPage.sidebar.generating')}</p>
                                            </div>
                                        ) : null}
                                        
                                        {generatedImages.length > 0 ? (
                                            <div className={`h-full grid ${generatedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4 overflow-y-auto custom-scrollbar p-2`}>
                                                {generatedImages.map((img, idx) => (
                                                    <div key={idx} className="relative group bg-black/20 rounded-lg overflow-hidden flex items-center justify-center border border-gray-700">
                                                        <ImageWithDimensions src={img} alt={`Result ${idx}`} className="max-w-full max-h-full object-contain" />
                                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-2 rounded-full">
                                                            <button onClick={() => setZoomedImage(img)} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title={t('imageGenerationPage.actionButtons.zoom')}>
                                                                <MagnifyingGlassPlusIcon className="w-5 h-5" />
                                                            </button>
                                                            <a href={img} download={`generated-${Date.now()}-${idx}.png`} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title={t('autoColoring.downloadBtn')}>
                                                                <ArrowDownTrayIcon className="w-5 h-5" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : !isLoading && (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                                <PhotoIcon className="w-16 h-16 mb-4 opacity-20" />
                                               <p>Chưa có lịch sử</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col">
                                        {history.length === 0 ? (
                                            <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                                                <ClockIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                <p>{t('imageGenerationPage.main.noHistory')}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {paginatedHistory.map((item, index) => (
                                                            <div key={index} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                                                                <div className="relative aspect-square rounded-lg overflow-hidden mb-2 group">
                                                                    <img src={item.outputs[0]} alt="History" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                        <button onClick={() => setZoomedImage(item.outputs[0])} className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30">
                                                                            <MagnifyingGlassPlusIcon className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center text-xs text-gray-400">
                                                                    <span className="truncate max-w-[100px]">{item.input ? 'Image Input' : 'Text Input'}</span>
                                                                    <span>#{history.length - ((currentPage - 1) * ITEMS_PER_PAGE + index)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Pagination 
                                                    currentPage={currentPage}
                                                    totalPages={totalPages}
                                                    onPageChange={setCurrentPage}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                             </div>
                        </main>
                    </div>
                )}
            </div>
            <Footer />
        </div>
        <UpgradeModal 
            isOpen={showUpgradeModal} 
            onClose={() => setShowUpgradeModal(false)}
            message={upgradeMessage}
        />
        </>
    );
};

export default ImageGenerationPage;
