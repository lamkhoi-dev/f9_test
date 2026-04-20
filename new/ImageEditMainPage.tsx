
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLanguage } from './hooks/useLanguage';
import { useMode } from './contexts/ModeContext';
import { ArrowUpTrayIcon } from './components/icons/ArrowUpTrayIcon';
import { ClipboardIcon } from './components/icons/ClipboardIcon';
import { PlusIcon } from './components/icons/PlusIcon';
import { EraserIcon } from './components/icons/EraserIcon';
import { UndoIcon } from './components/icons/UndoIcon';
import { RedoIcon } from './components/icons/RedoIcon';
import ImageEditSlider from './components/ImageEditSlider';
import { PencilIcon } from './components/icons/PencilIcon';
import { XMarkIcon } from './components/icons/XMarkIcon';
import { ArrowsPointingOutIcon } from './components/icons/ArrowsPointingOutIcon';
import { TrashIcon } from './components/icons/TrashIcon';
import { GoogleGenAI, Modality } from '@google/genai';
import { MagnifyingGlassPlusIcon } from './components/icons/MagnifyingGlassPlusIcon';
import { ArrowDownTrayIcon } from './components/icons/ArrowDownTrayIcon';
import { ArrowPathIcon as RefreshIcon } from './components/icons/ArrowPathIcon';
import { FullScreenCompare } from './components/FullScreenCompare';
import { ChevronDownIcon } from './components/icons/ChevronDownIcon';
import { SelectionIcon } from './components/icons/SelectionIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { ArrowsPointingInIcon } from './components/icons/ArrowsPointingInIcon';


type Box = { x: number; y: number; width: number; height: number };
type Interaction = { type: 'draw' | 'move' | 'resize'; handle: string; startX: number; startY: number; startBox: Box };
type Transform = { scale: number; x: number; y: number };

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
};

const ImageEditMainPage: React.FC = () => {
    const { t } = useLanguage();
    const { getModelName, isPro } = useMode();
    const [mainImage, setMainImage] = useState<string | null>(null);
    const mainFileInputRef = useRef<HTMLInputElement>(null);
    const [activeTool, setActiveTool] = useState<'pencil' | 'box' | 'eraser' | ''>('');
    
    const [maskColor, setMaskColor] = useState('#ff1493');
    const [brushSize, setBrushSize] = useState(40);
    const [blurAmount, setBlurAmount] = useState(50);
    const [combineArea, setCombineArea] = useState<'box' | 'mask'>('box');
    const [expandAmount, setExpandAmount] = useState(15);
    const [featherAmount, setFeatherAmount] = useState(16);

    const [suggestion, setSuggestion] = useState('');
    const [intermediateResult, setIntermediateResult] = useState<string | null>(null);
    const [fullGeneratedImage, setFullGeneratedImage] = useState<string | null>(null);
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isMaskDrawn, setIsMaskDrawn] = useState(false);
    const [zoomedIntermediateImage, setZoomedIntermediateImage] = useState<string | null>(null);
    const [zoomedFinalImage, setZoomedFinalImage] = useState<string | null>(null);
    const [isFullScreenCompare, setIsFullScreenCompare] = useState(false);
    
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);

    const [box, setBox] = useState<Box | null>(null);
    const [interaction, setInteraction] = useState<Interaction | null>(null);
    
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [referenceImages, setReferenceImages] = useState<{ url: string; file: File }[]>([]);
    const [isReferenceSectionOpen, setIsReferenceSectionOpen] = useState(false);
    const referenceFileInputRef = useRef<HTMLInputElement>(null);
    
    // Fullscreen state
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [preFullScreenState, setPreFullScreenState] = useState<{ history: string[], historyIndex: number, box: Box | null } | null>(null);
    const [imageAspectRatio, setImageAspectRatio] = useState<string | null>(null);
    
    // Stable state for dimensions to prevent sync issues between Canvas Ref and Render Cycle
    const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);

    const fitToScreen = useCallback(() => {
        const container = imageContainerRef.current;
        // Use state dimensions if available, otherwise fallback to canvas ref, otherwise 0
        const width = imageDimensions?.width || maskCanvasRef.current?.width || 0;
        const height = imageDimensions?.height || maskCanvasRef.current?.height || 0;

        if (!container || width === 0 || height === 0) {
            setTransform({ scale: 1, x: 0, y: 0 });
            return;
        }
    
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
    
        const imgRatio = width / height;
        const containerRatio = containerWidth / containerHeight;
    
        let scale: number;
        // Logic: fit entire image within container with some padding (e.g. 0.95 factor)
        if (imgRatio > containerRatio) {
            scale = (containerWidth / width) * 0.95;
        } else {
            scale = (containerHeight / height) * 0.95;
        }
    
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        const x = (containerWidth - scaledWidth) / 2;
        const y = (containerHeight - scaledHeight) / 2;
    
        setTransform({ scale, x, y });
    }, [imageDimensions]);

    const openFullScreenEditor = () => {
        setPreFullScreenState({ history: [...history], historyIndex, box });
        setIsFullScreen(true);
    };

    const closeFullScreenEditor = (applyChanges: boolean) => {
        if (!applyChanges && preFullScreenState) {
            setHistory(preFullScreenState.history);
            setHistoryIndex(preFullScreenState.historyIndex);
            restoreHistory(preFullScreenState.historyIndex, preFullScreenState.history);
            setBox(preFullScreenState.box);
        }
        setIsFullScreen(false);
        setPreFullScreenState(null);
    };
    
    useEffect(() => {
        if (isFullScreen) {
            // Small timeout to ensure DOM is ready/resized
            setTimeout(fitToScreen, 50);
        } else {
            setTransform({ scale: 1, x: 0, y: 0 });
        }
    }, [isFullScreen, fitToScreen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullScreen) {
                closeFullScreenEditor(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen, preFullScreenState]);

    const getMousePos = useCallback((evt: React.MouseEvent | MouseEvent) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
    
        const rect = canvas.getBoundingClientRect();
        
        const clientX = evt.clientX;
        const clientY = evt.clientY;
    
        const mouseXOnCanvas = clientX - rect.left;
        const mouseYOnCanvas = clientY - rect.top;
    
        const nativeWidth = canvas.width;
        const nativeHeight = canvas.height;
        const renderedWidth = rect.width;
        const renderedHeight = rect.height;

        const scaleX = nativeWidth / renderedWidth;
        const scaleY = nativeHeight / renderedHeight;
    
        const x = mouseXOnCanvas * scaleX;
        const y = mouseYOnCanvas * scaleY;
        
        return { x, y };
    }, []);

    const saveHistory = useCallback(() => {
        if (!maskCanvasRef.current) return;
        const canvas = maskCanvasRef.current;
        const dataUrl = canvas.toDataURL();
        const newHistory = history.slice(0, historyIndex + 1);
        if (newHistory.length > 0 && newHistory[newHistory.length - 1] === dataUrl) return;
        newHistory.push(dataUrl);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const restoreHistory = useCallback((index: number, hist: string[] = history) => {
        if (!maskCanvasRef.current || !hist[index]) return;
        const canvas = maskCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const isEmpty = !imageData.data.some(channel => channel !== 0);
            setIsMaskDrawn(!isEmpty);
        };
        img.src = hist[index];
    }, [history]);
    
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            restoreHistory(newIndex);
        }
    };
    
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            restoreHistory(newIndex);
        }
    };

    const clearCanvas = useCallback((save: boolean = false) => {
        const canvas = maskCanvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        setIsMaskDrawn(false);
        if (save) {
            saveHistory();
        }
    }, [saveHistory]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMainImage(reader.result as string);
                setIntermediateResult(null);
                setFullGeneratedImage(null);
                setFinalImage(null);
                setBox(null);
                setReferenceImages(currentImages => {
                    currentImages.forEach(img => URL.revokeObjectURL(img.url));
                    return [];
                });
            };
            reader.readAsDataURL(file);
        }
    };
    
    useEffect(() => {
        const canvas = maskCanvasRef.current;
        if (!canvas || !mainImage) {
            setImageAspectRatio(null);
            setImageDimensions(null);
            if(canvas) {
                const context = canvas.getContext('2d');
                context?.clearRect(0, 0, canvas.width, canvas.height);
            }
            setHistory([]);
            setHistoryIndex(-1);
            setIsMaskDrawn(false);
            return;
        }

        const image = new Image();
        image.src = mainImage;

        image.onload = () => {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            
            // Set dimensions state for stable referencing
            setImageDimensions({
                width: image.naturalWidth,
                height: image.naturalHeight
            });
            setImageAspectRatio(`${image.naturalWidth} / ${image.naturalHeight}`);

            const blankState = canvas.toDataURL();
            setHistory([blankState]);
            setHistoryIndex(0);
            setIsMaskDrawn(false);
        };
    }, [mainImage]);


    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const file = event.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMainImage(reader.result as string);
                setIntermediateResult(null);
                setFullGeneratedImage(null);
                setFinalImage(null);
                setBox(null);
                setReferenceImages(currentImages => {
                    currentImages.forEach(img => URL.revokeObjectURL(img.url));
                    return [];
                });
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };


    const startDrawing = (e: React.MouseEvent) => {
        if ((activeTool !== 'pencil' && activeTool !== 'eraser') || !maskCanvasRef.current) return;
        setIsDrawing(true);
        const pos = getMousePos(e);
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
            if (activeTool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !maskCanvasRef.current) return;
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
            const pos = getMousePos(e);
            ctx.lineTo(pos.x, pos.y);
            const rgb = hexToRgb(maskColor);
            if(rgb) {
                ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAmount / 100})`;
            }
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            setIsMaskDrawn(true);
        }
    };

    const stopDrawing = () => {
        if (!isDrawing || !maskCanvasRef.current) return;
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
            ctx.closePath();
            ctx.globalCompositeOperation = 'source-over';
        }
        setIsDrawing(false);
        saveHistory();
    };

    const handleToolChange = (tool: 'pencil' | 'box' | 'eraser') => {
        setActiveTool(prev => {
            const newTool = prev === tool ? '' : tool;
            if (newTool === 'pencil' || newTool === 'eraser') {
                setBox(null);
            } else if (newTool === 'box') {
                clearCanvas(true);
            }
            return newTool;
        });
    };
    
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleDetailZoom = async () => {
        if (!mainImage) return;
    
        const displayMaskCanvas = maskCanvasRef.current;
        if (!displayMaskCanvas) return;
    
        let cropBox: Box | null = null;
        
        if (box && box.width > 0 && box.height > 0) {
            cropBox = box;
        } else if (isMaskDrawn) {
            const maskCtx = displayMaskCanvas.getContext('2d', { willReadFrequently: true });
            if (!maskCtx) return;
            
            const maskData = maskCtx.getImageData(0, 0, displayMaskCanvas.width, displayMaskCanvas.height).data;
            let minX = displayMaskCanvas.width, minY = displayMaskCanvas.height, maxX = -1, maxY = -1;
            for (let y = 0; y < displayMaskCanvas.height; y++) {
                for (let x = 0; x < displayMaskCanvas.width; x++) {
                    if (maskData[(y * displayMaskCanvas.width + x) * 4 + 3] > 0) { // Check alpha channel
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
            if (maxX > -1) {
                cropBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
            }
        }
    
        if (!cropBox || cropBox.width <= 0 || cropBox.height <= 0) {
            alert("Please select an area to zoom using the brush or box tool.");
            return;
        }

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
    
        setIsLoading(true);
        setIntermediateResult(null);
        setFullGeneratedImage(null);
        setFinalImage(null);
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const originalImageEl = new Image();
            originalImageEl.src = mainImage;
            await new Promise(resolve => { originalImageEl.onload = resolve; });
    
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropBox.width;
            cropCanvas.height = cropBox.height;
            const cropCtx = cropCanvas.getContext('2d');
            if (!cropCtx) throw new Error("Could not create crop canvas context.");
    
            cropCtx.drawImage(
                originalImageEl,
                cropBox.x,
                cropBox.y,
                cropBox.width,
                cropBox.height,
                0,
                0,
                cropBox.width,
                cropBox.height
            );
            
            const croppedImageBase64 = cropCanvas.toDataURL('image/png').split(',')[1];
            
            const detailZoomPrompt = t('imageGenerationPage.editPage.detailZoomPrompt_v2', { suggestion: suggestion || 'chất lượng cao, siêu thực' });
            
            const parts = [
                { inlineData: { data: croppedImageBase64, mimeType: 'image/png' } },
                { text: detailZoomPrompt }
            ];
    
            const response = await ai.models.generateContent({
                model: getModelName('image'),
                contents: { parts },
                config: { 
                    responseModalities: [Modality.IMAGE],
                    ...(isPro ? { imageConfig: { imageSize: '4K' } } : {})
                },
            });
    
            const imageResultPart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    
            if (imageResultPart && imageResultPart.inlineData) {
                const resultImageSrc = `data:${imageResultPart.inlineData.mimeType};base64,${imageResultPart.inlineData.data}`;
                setFinalImage(resultImageSrc);
            } else {
                 alert("The AI failed to generate a detail zoom image. Please try again.");
            }
    
        } catch (error) {
            console.error("Error in handleDetailZoom:", error);
            alert(`An error occurred during detail zoom: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };


    const handleGenerate = async () => {
        if (!mainImage) {
            alert("Please upload an image.");
            return;
        }
        
        const displayMaskCanvas = maskCanvasRef.current;
        if (!displayMaskCanvas) return;

        let maskSourceCanvas: HTMLCanvasElement | null = null;
        
        if (box && box.width > 0 && box.height > 0) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = displayMaskCanvas.width;
            tempCanvas.height = displayMaskCanvas.height;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
                const rgb = hexToRgb(maskColor);
                if (rgb) {
                    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAmount / 100})`;
                    ctx.fillRect(box.x, box.y, box.width, box.height);
                    maskSourceCanvas = tempCanvas;
                }
            }
        } else {
            const displayCtx = displayMaskCanvas.getContext('2d', { willReadFrequently: true });
            const maskData = displayCtx?.getImageData(0, 0, displayMaskCanvas.width, displayMaskCanvas.height).data;
            if (maskData?.some(c => c !== 0)) {
                maskSourceCanvas = displayMaskCanvas;
            }
        }
    
        if (!maskSourceCanvas) {
            alert("Please select an area to edit using the brush or box tool.");
            return;
        }
        
        if (!suggestion) {
            alert(t('imageGenerationPage.editPage.suggestionPlaceholder'));
            return;
        }

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
    
        setIsLoading(true);
        setIntermediateResult(null);
        setFullGeneratedImage(null);
        setFinalImage(null);
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const originalImageEl = new Image();
            originalImageEl.src = mainImage;
            await new Promise(resolve => { originalImageEl.onload = resolve; originalImageEl.onerror = resolve; });
    
            const imageWithMaskCanvas = document.createElement('canvas');
            imageWithMaskCanvas.width = originalImageEl.naturalWidth;
            imageWithMaskCanvas.height = originalImageEl.naturalHeight;
            const ctx = imageWithMaskCanvas.getContext('2d');
            if (!ctx) throw new Error("Could not create canvas context.");
    
            ctx.drawImage(originalImageEl, 0, 0);
            ctx.drawImage(maskSourceCanvas, 0, 0, originalImageEl.naturalWidth, originalImageEl.naturalHeight);
            
            const imageWithMaskBase64 = imageWithMaskCanvas.toDataURL('image/png').split(',')[1];
            const mimeType = 'image/png';

            const referenceImageParts = await Promise.all(
                referenceImages.map(async (refImg) => {
                    const base64Data = await blobToBase64(refImg.file);
                    return {
                        inlineData: {
                            data: base64Data,
                            mimeType: refImg.file.type,
                        },
                    };
                })
            );

            let inpaintingPrompt = '';
            if (referenceImages.length > 0) {
                inpaintingPrompt = `You are an expert image editor. The user has provided a main image with a masked area, a text prompt, and ${referenceImages.length} reference image(s). Your task is to inpaint the masked area of the main image.
- Use the user's text prompt for the primary instruction: "${suggestion}".
- Use the reference image(s) for style, content, and/or texture inspiration.
- The result must be a high-quality, realistic image where the inpainted area blends seamlessly and naturally with the unmasked parts of the main image. Modify ONLY the masked region.`;
            } else {
                inpaintingPrompt = `In the provided image, a region is marked with a semi-transparent colored mask. Your task is to perform inpainting on this masked area. The user wants to achieve the following: "${suggestion}". Modify only the masked region and ensure the result blends seamlessly and naturally with the surrounding, unmasked parts of the image.`;
            }
            
            const imagePart = { inlineData: { data: imageWithMaskBase64, mimeType: mimeType } };
            const textPart = { text: inpaintingPrompt };
            const allParts = [imagePart, textPart, ...referenceImageParts];
    
            const response = await ai.models.generateContent({
                model: getModelName('image'),
                contents: { parts: allParts },
                config: { 
                    responseModalities: [Modality.IMAGE],
                    ...(isPro ? { imageConfig: { imageSize: '4K' } } : {})
                },
            });
    
            const imageResultPart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    
            if (imageResultPart && imageResultPart.inlineData) {
                const resultImageSrc = `data:${imageResultPart.inlineData.mimeType};base64,${imageResultPart.inlineData.data}`;
                
                setFullGeneratedImage(resultImageSrc);
                setFinalImage(resultImageSrc);
                
                const maskCanvasForCrop = maskSourceCanvas;
                const maskCtxForCrop = maskCanvasForCrop.getContext('2d', { willReadFrequently: true });
                if (!maskCtxForCrop) throw new Error('Could not get context for crop mask');
                
                const maskCheckData = maskCtxForCrop.getImageData(0, 0, maskCanvasForCrop.width, maskCanvasForCrop.height).data;
                let maskMinX = maskCanvasForCrop.width, maskMinY = maskCanvasForCrop.height, maskMaxX = -1, maskMaxY = -1;
                for (let y = 0; y < maskCanvasForCrop.height; y++) {
                    for (let x = 0; x < maskCanvasForCrop.width; x++) {
                        if (maskCheckData[(y * maskCanvasForCrop.width + x) * 4 + 3] > 0) {
                            maskMinX = Math.min(maskMinX, x);
                            maskMinY = Math.min(maskMinY, y);
                            maskMaxX = Math.max(maskMaxX, x);
                            maskMaxY = Math.max(maskMaxY, y);
                        }
                    }
                }
    
                if (maskMaxX > -1) {
                    const resultImageEl = new Image();
                    resultImageEl.src = resultImageSrc;
                    await new Promise(resolve => { resultImageEl.onload = resolve; resultImageEl.onerror = resolve; });
                    
                    const scaleX = resultImageEl.naturalWidth / maskCanvasForCrop.width;
                    const scaleY = resultImageEl.naturalHeight / maskCanvasForCrop.height;
    
                    const cropX = maskMinX * scaleX;
                    const cropY = maskMinY * scaleY;
                    const cropW = (maskMaxX - maskMinX) * scaleX;
                    const cropH = (maskMaxY - maskMinY) * scaleY;
    
                    if (cropW > 0 && cropH > 0) {
                        const cropCanvas = document.createElement('canvas');
                        cropCanvas.width = cropW;
                        cropCanvas.height = cropH;
                        const cropCtx = cropCanvas.getContext('2d');
                        cropCtx?.drawImage(resultImageEl, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                        setIntermediateResult(cropCanvas.toDataURL('image/png'));
                    } else {
                        setIntermediateResult(resultImageSrc);
                    }
                } else {
                    setIntermediateResult(resultImageSrc);
                }
    
            } else {
                console.error("No image generated in API response.");
                alert("The AI failed to generate an image. Please try again.");
            }
    
        } catch (error) {
            console.error("Error in handleGenerate:", error);
            alert(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ... (Rest of the component remains the same)
    
    // Helper function references not changed (handleUseAsInput, handleDownloadFinalImage, etc.)
    const handleUseAsInput = useCallback(() => {
        if (finalImage) {
            setMainImage(finalImage);
            setIntermediateResult(null);
            setFullGeneratedImage(null);
            setFinalImage(null);
            clearCanvas();
            setBox(null);
        }
    }, [finalImage, clearCanvas]);

    const handleDownloadFinalImage = useCallback(() => {
        if (finalImage) {
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `[F9render.com]_final-result-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [finalImage]);
    
    const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
        if (isFullScreen && e.button === 1) { // Middle mouse button for panning
            e.preventDefault();
            setIsPanning(true);
            return;
        }

        if (activeTool !== 'box') return;
        if ((e.target as HTMLElement).closest('[data-box-part="true"]')) return;

        const { x, y } = getMousePos(e);

        setInteraction({
            type: 'draw',
            handle: 'bottom-right',
            startX: x,
            startY: y,
            startBox: { x, y, width: 0, height: 0 },
        });
    }, [activeTool, isFullScreen, getMousePos]);
    
    const handleBoxInteractionStart = useCallback((e: React.MouseEvent<HTMLDivElement>, type: 'move' | 'resize') => {
        if (activeTool !== 'box' || !box) return;
        e.stopPropagation();

        const handle = (e.currentTarget as HTMLElement).dataset.handle || 'move';
        const { x, y } = getMousePos(e);
        
        setInteraction({
            type,
            handle,
            startX: x,
            startY: y,
            startBox: box,
        });
    }, [activeTool, box, getMousePos]);

    useEffect(() => {
        const currentContainer = imageContainerRef.current;
        const handleWheel = (e: WheelEvent) => {
            if (!isFullScreen || !currentContainer) return;
            e.preventDefault();

            const rect = currentContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = 1.1;
            const newScale = e.deltaY < 0 ? transform.scale * zoomFactor : transform.scale / zoomFactor;
            
            const clampedScale = Math.max(0.1, Math.min(newScale, 10));

            const mouseOnContentX = (mouseX - transform.x) / transform.scale;
            const mouseOnContentY = (mouseY - transform.y) / transform.scale;

            const newX = mouseX - mouseOnContentX * clampedScale;
            const newY = mouseY - mouseOnContentY * clampedScale;

            setTransform({ scale: clampedScale, x: newX, y: newY });
        };
        
        if (isFullScreen && currentContainer) {
            currentContainer.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (currentContainer) {
                currentContainer.removeEventListener('wheel', handleWheel);
            }
        };
    }, [isFullScreen, transform]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isPanning) {
                setTransform(t => ({
                    ...t,
                    x: t.x + e.movementX,
                    y: t.y + e.movementY
                }));
                return;
            }

            if (!interaction || !imageDimensions) return;

            const { x: mouseX, y: mouseY } = getMousePos(e);
            const dx = mouseX - interaction.startX;
            const dy = mouseY - interaction.startY;
            
            const imgW = imageDimensions.width;
            const imgH = imageDimensions.height;

            if (interaction.type === 'draw') {
                 // Clamp to image bounds
                 const constrainedX = Math.max(0, Math.min(mouseX, imgW));
                 const constrainedY = Math.max(0, Math.min(mouseY, imgH));
                 const constrainedStartX = Math.max(0, Math.min(interaction.startX, imgW));
                 const constrainedStartY = Math.max(0, Math.min(interaction.startY, imgH));

                 const newBox: Box = {
                    x: Math.min(constrainedStartX, constrainedX),
                    y: Math.min(constrainedStartY, constrainedY),
                    width: Math.abs(constrainedX - constrainedStartX),
                    height: Math.abs(constrainedY - constrainedStartY),
                };
                setBox(newBox);
            } else if (interaction.type === 'move' && interaction.startBox) {
                const newX = Math.max(0, Math.min(imgW - interaction.startBox.width, interaction.startBox.x + dx));
                const newY = Math.max(0, Math.min(imgH - interaction.startBox.height, interaction.startBox.y + dy));
                
                setBox({
                    ...interaction.startBox,
                    x: newX,
                    y: newY,
                });
            } else if (interaction.type === 'resize' && interaction.startBox) {
                let { x, y, width, height } = interaction.startBox;
                
                if (interaction.handle.includes('right')) {
                    width = Math.max(10, Math.min(interaction.startBox.width + dx, imgW - x));
                }
                if (interaction.handle.includes('bottom')) {
                    height = Math.max(10, Math.min(interaction.startBox.height + dy, imgH - y));
                }
                if (interaction.handle.includes('left')) {
                    const newWidth = interaction.startBox.width - dx;
                    if (newWidth >= 10 && (interaction.startBox.x + dx) >= 0) {
                        width = newWidth;
                        x = interaction.startBox.x + dx;
                    } else if ((interaction.startBox.x + dx) < 0) {
                        // Prevent dragging left past 0
                        width = interaction.startBox.width + interaction.startBox.x;
                        x = 0;
                    }
                }
                if (interaction.handle.includes('top')) {
                    const newHeight = interaction.startBox.height - dy;
                    if (newHeight >= 10 && (interaction.startBox.y + dy) >= 0) {
                        height = newHeight;
                        y = interaction.startBox.y + dy;
                    } else if ((interaction.startBox.y + dy) < 0) {
                        // Prevent dragging top past 0
                        height = interaction.startBox.height + interaction.startBox.y;
                        y = 0;
                    }
                }
                setBox({ x, y, width, height });
            }
        };

        const handleMouseUp = () => {
            setInteraction(null);
            setIsPanning(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [interaction, isPanning, getMousePos, imageDimensions]);

    const handleReferenceImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && referenceImages.length < 3) {
            const url = URL.createObjectURL(file);
            setReferenceImages(prev => [...prev, { url, file }]);
            if (!isReferenceSectionOpen) {
                setIsReferenceSectionOpen(true);
            }
        }
    };
    
    const handleRemoveReferenceImage = (indexToRemove: number) => {
        setReferenceImages(prev => {
            const imageToRemove = prev[indexToRemove];
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.url);
            }
            return prev.filter((_, index) => index !== indexToRemove);
        });
    };
    
    const handles = ['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'left'];
    const getCursorForHandle = (handle: string) => {
        if (handle.includes('top-left') || handle.includes('bottom-right')) return 'nwse-resize';
        if (handle.includes('top-right') || handle.includes('bottom-left')) return 'nesw-resize';
        if (handle.includes('top') || handle.includes('bottom')) return 'ns-resize';
        if (handle.includes('left') || handle.includes('right')) return 'ew-resize';
        return 'move';
    };
    
    const imageAndCanvasWrapperStyle = useMemo((): React.CSSProperties => {
        if (isFullScreen) {
            // Using imageDimensions here ensures the wrapper size matches the image pixels exactly
            // even if the canvas ref isn't updated in time or if browser layout shifts.
            const w = imageDimensions?.width || maskCanvasRef.current?.width || '100%';
            const h = imageDimensions?.height || maskCanvasRef.current?.height || '100%';
            return {
                position: 'absolute',
                top: 0,
                left: 0,
                width: typeof w === 'number' ? `${w}px` : w,
                height: typeof h === 'number' ? `${h}px` : h,
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: 'top left',
                willChange: 'transform',
            };
        }
    
        return {
            position: 'relative',
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        };
    }, [isFullScreen, transform, imageDimensions]);
    
    return (
        <>
        {zoomedIntermediateImage && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setZoomedIntermediateImage(null)}>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <img src={zoomedIntermediateImage} alt="Zoomed intermediate result" className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-lg" />
                    <div className="absolute -top-4 -right-4 flex items-center gap-3">
                        <a href={zoomedIntermediateImage} download={`[F9render.com]_intermediate-result-${Date.now()}.png`} title={t('autoColoring.downloadBtn')} className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-500 transition-transform hover:scale-110">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </a>
                        <button onClick={() => setZoomedIntermediateImage(null)} title={t('autoColoring.closeBtn')} className="bg-white text-black p-2.5 rounded-full shadow-lg hover:bg-gray-200 transition-transform hover:scale-110">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )}
        {zoomedFinalImage && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setZoomedFinalImage(null)}>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <img src={zoomedFinalImage} alt="Zoomed final result" className="w-auto h-auto max-w-[95vw] max-h-[90vh] object-contain rounded-lg" />
                    <div className="absolute -top-4 -right-4 flex items-center gap-3">
                        <a href={zoomedFinalImage} download={`[F9render.com]_final-result-${Date.now()}.png`} title={t('autoColoring.downloadBtn')} className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-500 transition-transform hover:scale-110">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </a>
                        <button onClick={() => setZoomedFinalImage(null)} title={t('autoColoring.closeBtn')} className="bg-white text-black p-2.5 rounded-full shadow-lg hover:bg-gray-200 transition-transform hover:scale-110">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )}
        {isFullScreenCompare && mainImage && finalImage && (
            <FullScreenCompare
                originalImage={mainImage}
                inpaintedImage={finalImage}
                onClose={() => setIsFullScreenCompare(false)}
            />
        )}
        <div className={`flex-grow flex flex-col gap-4 bg-[#282f3d] min-h-0 ${isFullScreen ? 'p-0' : 'p-4 lg:p-6 lg:flex-row lg:gap-6'}`}>
            
            <div className={`flex-col gap-4 lg:gap-6 lg:w-4/12 ${isFullScreen ? 'hidden' : 'flex'}`}>
                {/* Final Result Panel */}
                <div className="bg-[#202633] rounded-lg p-4 flex flex-col min-h-[300px] flex-1 overflow-hidden">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2 flex-shrink-0">
                         <h2 className="text-white font-semibold border-b-2 border-blue-500 pb-2 w-fit">{t('imageGenerationPage.editPage.finalResultTitle')}</h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsFullScreenCompare(true)}
                                disabled={!mainImage || !finalImage || isLoading}
                                title={t('imageGenerationPage.editPage.fullscreenCompareTooltip')}
                                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                            >
                                <ArrowsPointingOutIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDownloadFinalImage}
                                disabled={!finalImage || isLoading}
                                title={t('imageGenerationPage.editPage.downloadFinalTooltip')}
                                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                            >
                                <ArrowDownTrayIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleUseAsInput}
                                disabled={!finalImage || isLoading}
                                title={t('imageGenerationPage.editPage.useAsInputTooltip')}
                                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                            >
                                <RefreshIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                     <div className="flex-grow flex items-center justify-center text-center min-h-0 relative">
                        {isLoading ? (
                             <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                                <p className="text-gray-400 text-sm mt-2">Generating...</p>
                            </div>
                        ) : finalImage ? (
                            <div 
                                className="relative group cursor-pointer w-full h-full flex items-center justify-center"
                                onClick={() => setZoomedFinalImage(finalImage)}
                            >
                                <img src={finalImage} alt="Final result" className="max-h-full max-w-full object-contain" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MagnifyingGlassPlusIcon className="w-12 h-12 text-white" />
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('imageGenerationPage.editPage.finalResultPlaceholder')}</p>
                        )}
                    </div>
                </div>
                {/* Intermediate Result Panel */}
                <div className="bg-[#202633] rounded-lg p-4 flex flex-col min-h-[300px] flex-1 overflow-hidden">
                    <h2 className="text-white font-semibold border-b-2 border-blue-500 pb-2 mb-4 w-fit flex-shrink-0">{t('imageGenerationPage.editPage.intermediateResultTitle')}</h2>
                    <div className="flex-grow flex items-center justify-center text-center min-h-0 relative">
                        {isLoading && !finalImage ? (
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-gray-400 text-sm">Generating intermediate result...</p>
                            </div>
                        ) : intermediateResult ? (
                            <div 
                                className="relative group cursor-pointer w-full h-full flex items-center justify-center"
                                onClick={() => setZoomedIntermediateImage(intermediateResult)}
                            >
                                <img src={intermediateResult} alt="Generated result" className="max-h-full max-w-full object-contain" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MagnifyingGlassPlusIcon className="w-12 h-12 text-white" />
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500">{t('imageGenerationPage.editPage.intermediateResultPlaceholder')}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Middle Column (Editor) */}
            <div className={`bg-[#202633] flex flex-col min-h-[400px] ${isFullScreen ? 'fixed inset-0 z-50 rounded-none' : 'lg:w-5/12 rounded-lg p-4'}`}>
                <div className={`flex-shrink-0 flex-wrap gap-2 ${isFullScreen ? 'hidden' : 'flex justify-between items-center mb-4'}`}>
                    <h2 className="text-white font-semibold border-b-2 border-blue-500 pb-2 w-fit flex-shrink-0">{t('imageGenerationPage.editPage.editTitle')}</h2>
                </div>
                <div 
                    ref={imageContainerRef}
                    className={`flex-grow rounded-lg overflow-hidden relative flex justify-center items-center`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onMouseDown={handleContainerMouseDown}
                    style={{ cursor: isFullScreen && isPanning ? 'grabbing' : isFullScreen ? 'grab' : activeTool === 'box' ? 'crosshair' : 'default' }}
                >
                    <input type="file" ref={mainFileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                    {mainImage ? (
                        <div style={imageAndCanvasWrapperStyle}>
                            <img 
                                src={mainImage} 
                                alt="Uploaded" 
                                className={`${isFullScreen ? 'absolute inset-0 w-full h-full' : 'max-w-full max-h-full w-auto h-auto'} object-contain pointer-events-none`} 
                            />
                            <canvas
                                ref={maskCanvasRef}
                                className="absolute inset-0 w-full h-full"
                                style={{
                                    cursor: (activeTool === 'pencil' || activeTool === 'eraser') ? 'crosshair' : 'default',
                                    pointerEvents: (activeTool === 'pencil' || activeTool === 'eraser' || (isFullScreen && isPanning)) ? 'auto' : 'none'
                                }}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                            />
                             {box && (
                                <div
                                    data-box-part="true"
                                    style={{
                                        position: 'absolute',
                                        // Use imageDimensions state for stable calculation, fallback to ref if not available
                                        left: `${(box.x / (imageDimensions?.width || maskCanvasRef.current?.width || 1)) * 100}%`,
                                        top: `${(box.y / (imageDimensions?.height || maskCanvasRef.current?.height || 1)) * 100}%`,
                                        width: `${(box.width / (imageDimensions?.width || maskCanvasRef.current?.width || 1)) * 100}%`,
                                        height: `${(box.height / (imageDimensions?.height || maskCanvasRef.current?.height || 1)) * 100}%`,
                                        border: '1px dashed white',
                                        cursor: 'move',
                                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                        pointerEvents: 'all'
                                    }}
                                    onMouseDown={(e) => handleBoxInteractionStart(e, 'move')}
                                >
                                    {handles.map(handle => (
                                        <div
                                            key={handle}
                                            data-box-part="true"
                                            data-handle={handle}
                                            onMouseDown={(e) => handleBoxInteractionStart(e, 'resize')}
                                            className="absolute w-3 h-3 bg-white border border-gray-800 rounded-full"
                                            style={{
                                                top: handle.includes('top') ? '0' : handle.includes('bottom') ? '100%' : '50%',
                                                left: handle.includes('left') ? '0' : handle.includes('right') ? '100%' : '50%',
                                                transform: 'translate(-50%, -50%)',
                                                cursor: getCursorForHandle(handle),
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 cursor-pointer border-2 border-dashed border-gray-600 rounded-lg" onClick={() => mainFileInputRef.current?.click()}>
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-6">
                                    <ArrowUpTrayIcon className="w-10 h-10" />
                                    <ClipboardIcon className="w-10 h-10" />
                                </div>
                                <p>{t('imageGenerationPage.editPage.uploadPlaceholder')}</p>
                            </div>
                        </div>
                    )}
                </div>

                 { /* TOOLBAR */ }
                <div className={`flex items-center gap-1 p-1 rounded-md mt-4 flex-wrap justify-center ${isFullScreen ? 'absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 shadow-lg backdrop-blur-sm' : 'bg-slate-800'}`}>
                    <button onClick={() => closeFullScreenEditor(true)} className={`p-2 rounded bg-green-600 text-white hover:bg-green-500 ${isFullScreen ? 'flex' : 'hidden'}`}><CheckIcon className="w-5 h-5"/></button>
                    <div className={`w-px h-6 bg-gray-600 mx-1 ${isFullScreen ? 'flex' : 'hidden'}`}></div>
                    <button onClick={() => handleToolChange('pencil')} title={t('imageGenerationPage.editPage.enableBrushTooltip')} className={`p-2 rounded ${activeTool === 'pencil' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}><PencilIcon className="w-5 h-5" style={{ color: activeTool !== 'pencil' ? maskColor : 'white' }}/></button>
                    <button onClick={() => handleToolChange('eraser')} title={t('imageGenerationPage.editPage.enableEraserTooltip')} className={`p-2 rounded ${activeTool === 'eraser' ? 'bg-pink-600' : 'hover:bg-slate-700'}`}><EraserIcon className="w-5 h-5 text-gray-300" /></button>
                    <button onClick={() => handleToolChange('box')} title={t('imageGenerationPage.editPage.defineFocusAreaTooltip')} className={`p-2 rounded ${activeTool === 'box' ? 'bg-yellow-500' : 'hover:bg-slate-700'}`}><SelectionIcon className="w-5 h-5 text-gray-300" /></button>
                    <button onClick={() => { setBox(null); clearCanvas(true); }} title={t('imageGenerationPage.editPage.clearMaskTooltip')} disabled={!box && !isMaskDrawn} className="p-2 rounded hover:bg-slate-700 disabled:text-slate-600 disabled:cursor-not-allowed"><XMarkIcon className="w-5 h-5" /></button>
                    <div className="w-px h-6 bg-gray-600 mx-1"></div>
                    <input type="color" value={maskColor} onChange={(e) => setMaskColor(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer p-0 appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-slate-700"/>
                    <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 hover:bg-slate-700 rounded disabled:text-slate-600 disabled:cursor-not-allowed"><UndoIcon className="w-5 h-5 text-white"/></button>
                    <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-slate-700 rounded disabled:text-slate-600 disabled:cursor-not-allowed"><RedoIcon className="w-5 h-5 text-white"/></button>
                    <div className={`w-px h-6 bg-gray-600 mx-1 ${isFullScreen ? 'flex' : 'hidden'}`}></div>
                    {isFullScreen && (
                         <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-md">
                            <ImageEditSlider label={t('imageGenerationPage.editPage.sizeLabel')} value={brushSize} onChange={setBrushSize} min={1} max={200} unit="px" />
                            <ImageEditSlider label={t('imageGenerationPage.editPage.blurLabel')} value={blurAmount} onChange={setBlurAmount} unit="%" />
                         </div>
                    )}
                    <div className="w-px h-6 bg-gray-600 mx-1"></div>
                    <button onClick={fitToScreen} className={`p-2 rounded hover:bg-slate-700 ${isFullScreen ? 'flex' : 'hidden'}`}><ArrowsPointingInIcon className="w-5 h-5 text-gray-300"/></button>
                    <button onClick={openFullScreenEditor} disabled={!mainImage} title={t('imageGenerationPage.editPage.fullscreenEditorTooltip')} className={`p-2 rounded hover:bg-slate-700 disabled:text-slate-600 disabled:cursor-not-allowed ${isFullScreen ? 'hidden' : 'flex'}`}><ArrowsPointingOutIcon className="w-5 h-5 text-gray-300" /></button>
                    <button onClick={() => { setMainImage(null); clearCanvas(); setIntermediateResult(null); setFullGeneratedImage(null); setFinalImage(null); setBox(null); setReferenceImages(c => { c.forEach(i => URL.revokeObjectURL(i.url)); return []; });}} title={t('imageGenerationPage.editPage.deleteImageTooltip')} className="p-2 rounded hover:bg-slate-700"><TrashIcon className="w-5 h-5 text-gray-300" /></button>
                </div>

                {isFullScreen && <button onClick={() => closeFullScreenEditor(false)} className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full hover:bg-slate-800"><XMarkIcon className="w-6 h-6"/></button>}
            </div>

            <aside className={`w-full flex-shrink-0 bg-[#202633] rounded-lg p-4 flex flex-col gap-5 overflow-y-auto custom-scrollbar ${isFullScreen ? 'hidden' : 'lg:w-[350px]'}`}>
                <div className="space-y-3">
                    <button 
                        onClick={() => mainImage && setIsReferenceSectionOpen(prev => !prev)} 
                        className="w-full text-left text-white font-semibold flex items-center justify-between disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled={!mainImage}
                    >
                        <span>{t('imageGenerationPage.editPage.referenceImageTitle')} ({referenceImages.length})</span>
                        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isReferenceSectionOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isReferenceSectionOpen && mainImage && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="grid grid-cols-3 gap-2">
                                {referenceImages.map((img, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img src={img.url} alt={`Reference ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                        <button onClick={() => handleRemoveReferenceImage(index)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><XMarkIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {referenceImages.length < 3 && (
                                    <div onClick={() => referenceFileInputRef.current?.click()} className="border-2 border-dashed border-gray-600 rounded-lg aspect-square flex items-center justify-center text-center cursor-pointer hover:border-gray-500">
                                        <div className="text-gray-500 flex flex-col items-center gap-1"><PlusIcon className="w-6 h-6"/><p className="text-xs">{t('imageGenerationPage.editPage.addReferenceImage')}</p></div>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={referenceFileInputRef} onChange={handleReferenceImageUpload} className="hidden" accept="image/*" />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button onClick={handleGenerate} disabled={isLoading || !mainImage} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2.5 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">{t('imageGenerationPage.editPage.createImageBtn')}</button>
                    <button onClick={handleDetailZoom} disabled={isLoading || !mainImage} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">{t('imageGenerationPage.editPage.createDetailZoomBtn')}</button>
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm text-gray-400">{t('imageGenerationPage.editPage.suggestionLabel')}</label>
                    <div className="relative">
                        <input type="text" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} placeholder={t('imageGenerationPage.editPage.suggestionPlaceholder')} className="w-full bg-slate-800 border border-slate-700 text-white rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">ⓘ</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-white font-semibold">{t('imageGenerationPage.editPage.toolsTitle')}</h3>
                    <ImageEditSlider label={t('imageGenerationPage.editPage.sizeLabel')} value={brushSize} onChange={setBrushSize} min={1} max={200} unit="px" />
                    <ImageEditSlider label={t('imageGenerationPage.editPage.blurLabel')} value={blurAmount} onChange={setBlurAmount} unit="%" />
                </div>

                <div className="space-y-4">
                    <h3 className="text-white font-semibold">{t('imageGenerationPage.editPage.combineOptionsTitle')}</h3>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">{t('imageGenerationPage.editPage.combineAreaLabel')}</label>
                        <div className="flex bg-slate-800 p-1 rounded-md">
                            <button onClick={() => setCombineArea('box')} className={`w-1/2 py-1.5 text-sm font-semibold rounded ${combineArea === 'box' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700'} transition-colors`}>{t('imageGenerationPage.editPage.boundingBoxBtn')}</button>
                            <button onClick={() => setCombineArea('mask')} className={`w-1/2 py-1.5 text-sm font-semibold rounded ${combineArea === 'mask' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-700'} transition-colors`}>{t('imageGenerationPage.editPage.maskAreaBtn')}</button>
                        </div>
                    </div>
                    <ImageEditSlider label={t('imageGenerationPage.editPage.expandLabel')} value={expandAmount} onChange={setExpandAmount} min={0} max={100} unit="%" />
                    <ImageEditSlider label={t('imageGenerationPage.editPage.featherEdgeLabel')} value={featherAmount} onChange={setFeatherAmount} min={0} max={128} unit="px" />
                </div>
            </aside>
        </div>
        </>
    );
};

export default ImageEditMainPage;
