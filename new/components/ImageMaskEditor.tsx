
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PencilIcon } from './icons/PencilIcon';
import { EraserIcon } from './icons/EraserIcon';
import { SelectionIcon } from './icons/SelectionIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ImageMaskEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (maskBase64: string) => void;
}

const ImageMaskEditor: React.FC<ImageMaskEditorProps> = ({ imageUrl, onClose, onSave }) => {
  const [activeTool, setActiveTool] = useState<'pencil' | 'eraser' | 'pointer'>('pencil');
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize canvas
  const initCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
  }, []);

  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (activeTool === 'pointer' || !canvasRef.current) return;
    setIsDrawing(true);
    const pos = getMousePos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || activeTool === 'pointer' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      const pos = getMousePos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = activeTool === 'eraser' ? 'rgba(0,0,0,1)' : 'rgba(0, 255, 255, 0.6)';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      setHasDrawn(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const maskData = canvasRef.current.toDataURL('image/png');
    onSave(maskData);
  };

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHasDrawn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in" onContextMenu={(e) => e.preventDefault()}>
      {/* Top Controls - High Z-index to ensure interactivity */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#1a1a1c]/90 backdrop-blur-md p-1.5 rounded-xl shadow-2xl border border-white/10 select-none z-[10010]">
        <button 
            onClick={() => setActiveTool('pencil')}
            className={`p-2.5 rounded-lg transition-all ${activeTool === 'pencil' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:bg-white/5'}`}
        >
            <PencilIcon className="w-5 h-5" />
        </button>
        <button 
            onClick={() => setActiveTool('eraser')}
            className={`p-2.5 rounded-lg transition-all ${activeTool === 'eraser' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:bg-white/5'}`}
        >
            <EraserIcon className="w-5 h-5" />
        </button>
        <button 
            onClick={() => setActiveTool('pointer')}
            className={`p-2.5 rounded-lg transition-all ${activeTool === 'pointer' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:bg-white/5'}`}
        >
            <SelectionIcon className="w-5 h-5 rotate-45" />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <button 
            onClick={handleClear}
            className="p-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
            <TrashIcon className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        
        <div className="flex items-center gap-3 px-3">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Size:</span>
            <input 
                type="range" 
                min="5" 
                max="200" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-32 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
        
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        <div className="px-3 flex items-center">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Cyan</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        className="relative max-w-full max-h-[calc(100vh-160px)] flex items-center justify-center overflow-hidden rounded-lg bg-black/40 z-[10005]"
      >
        <img 
            ref={imageRef}
            src={imageUrl} 
            alt="Edit target" 
            onLoad={initCanvas}
            className="max-w-full max-h-[calc(100vh-160px)] object-contain pointer-events-none select-none"
        />
        <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair z-10"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
        />
      </div>

      {/* Bottom Buttons - High Z-index to ensure interactivity */}
      <div className="mt-8 flex gap-4 z-[10010]">
        <button 
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full transition-all border border-white/5 shadow-xl backdrop-blur-sm"
        >
            <XMarkIcon className="w-5 h-5" /> Hủy bỏ
        </button>
        <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-all shadow-2xl shadow-cyan-900/50 transform hover:scale-105 active:scale-95"
        >
            <CheckIcon className="w-5 h-5" /> Lưu vùng vẽ
        </button>
      </div>

      <p className="absolute bottom-6 text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium z-[10010]">
        Vẽ vùng mong muốn đặt nhân vật để AI xử lý chính xác hơn
      </p>
    </div>
  );
};

export default ImageMaskEditor;
