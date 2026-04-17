
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';
import { CheckIcon } from './icons/CheckIcon';

interface SingleImageCropModalProps {
  imageUrl: string;
  onClose: () => void;
  onApply: (croppedFile: File) => void;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SingleImageCropModal: React.FC<SingleImageCropModalProps> = ({ imageUrl, onClose, onApply }) => {
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [boxStart, setBoxStart] = useState<CropBox | null>(null);

  // Initialize crop box to full image on load
  const onImageLoad = () => {
    if (imageRef.current) {
      const { width, height } = imageRef.current;
      setCropBox({ x: 0, y: 0, width, height });
    }
  };

  const handlePresetCrop = (ratio: number) => {
    if (!imageRef.current) return;
    const { width, height } = imageRef.current;
    const imageRatio = width / height;

    let newWidth, newHeight;

    if (ratio > imageRatio) {
      // Target is wider than image -> Width constrained
      newWidth = width;
      newHeight = width / ratio;
    } else {
      // Target is taller than image -> Height constrained
      newHeight = height;
      newWidth = height * ratio;
    }

    // Center the box
    const newX = (width - newWidth) / 2;
    const newY = (height - newHeight) / 2;

    setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const getMousePos = (e: MouseEvent | React.MouseEvent | React.TouchEvent) => {
    if (!imageRef.current) return { x: 0, y: 0 };
    const rect = imageRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent touch scrolling
    if (!cropBox) return;
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart(getMousePos(e));
    setBoxStart({ ...cropBox });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragStart || !boxStart || !imageRef.current) return;
      
      const currentPos = getMousePos(e as any);
      const dx = currentPos.x - dragStart.x;
      const dy = currentPos.y - dragStart.y;
      const imgW = imageRef.current.width;
      const imgH = imageRef.current.height;

      let newBox = { ...boxStart };

      if (dragHandle === 'move') {
        newBox.x = Math.max(0, Math.min(imgW - newBox.width, boxStart.x + dx));
        newBox.y = Math.max(0, Math.min(imgH - newBox.height, boxStart.y + dy));
      } else {
        // Resize logic
        if (dragHandle?.includes('e')) { // East (Right)
            newBox.width = Math.min(Math.max(20, boxStart.width + dx), imgW - boxStart.x);
        }
        if (dragHandle?.includes('s')) { // South (Bottom)
            newBox.height = Math.min(Math.max(20, boxStart.height + dy), imgH - boxStart.y);
        }
        if (dragHandle?.includes('w')) { // West (Left)
            const maxX = boxStart.x + boxStart.width - 20;
            const newX = Math.max(0, Math.min(maxX, boxStart.x + dx));
            newBox.width = boxStart.width + (boxStart.x - newX);
            newBox.x = newX;
        }
        if (dragHandle?.includes('n')) { // North (Top)
            const maxY = boxStart.y + boxStart.height - 20;
            const newY = Math.max(0, Math.min(maxY, boxStart.y + dy));
            newBox.height = boxStart.height + (boxStart.y - newY);
            newBox.y = newY;
        }
      }

      setCropBox(newBox);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragHandle(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStart, boxStart, dragHandle]);

  const handleApply = () => {
    if (!imageRef.current || !cropBox) return;

    const canvas = document.createElement('canvas');
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    canvas.width = cropBox.width * scaleX;
    canvas.height = cropBox.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imageRef.current,
      cropBox.x * scaleX,
      cropBox.y * scaleY,
      cropBox.width * scaleX,
      cropBox.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'cropped-image.png', { type: 'image/png', lastModified: Date.now() });
        onApply(file);
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
      <div className="relative w-full max-w-6xl h-full max-h-screen flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white flex-shrink-0">
          <h2 className="text-xl font-bold">Cắt ảnh (Crop)</h2>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Main Image Area */}
        <div className="flex-grow relative flex items-center justify-center overflow-hidden bg-black/50 rounded-lg select-none" ref={containerRef}>
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop target"
            onLoad={onImageLoad}
            className="max-h-[calc(100vh-200px)] max-w-full object-contain pointer-events-none select-none"
            draggable={false}
          />
          
          {/* Crop Overlay */}
          {cropBox && (
            <div
              className="absolute cursor-move"
              style={{
                left: imageRef.current?.offsetLeft! + cropBox.x,
                top: imageRef.current?.offsetTop! + cropBox.y,
                width: cropBox.width,
                height: cropBox.height,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
              onTouchStart={(e) => handleMouseDown(e, 'move')}
            >
              {/* Grid Lines */}
              <div className="absolute inset-0 border border-white/50 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30"></div>
                <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/30"></div>
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30"></div>
                <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/30"></div>
              </div>

              {/* Resize Handles */}
              {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((pos) => (
                <div
                  key={pos}
                  className={`absolute w-4 h-4 bg-white border border-gray-500 rounded-full z-10 
                    ${pos.includes('n') ? '-top-2' : pos.includes('s') ? '-bottom-2' : 'top-1/2 -translate-y-1/2'}
                    ${pos.includes('w') ? '-left-2' : pos.includes('e') ? '-right-2' : 'left-1/2 -translate-x-1/2'}
                  `}
                  style={{ cursor: `${pos}-resize` }}
                  onMouseDown={(e) => handleMouseDown(e, pos)}
                  onTouchStart={(e) => handleMouseDown(e, pos)}
                ></div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 p-6 flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => handlePresetCrop(9/16)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium text-sm">
              Crop 9:16
            </button>
            <button onClick={() => handlePresetCrop(16/9)} className="px-4 py-2 bg-green-800 hover:bg-green-700 text-white rounded-md font-medium text-sm">
              Crop 16:9
            </button>
          </div>
          
          <div className="w-px h-8 bg-gray-700 hidden sm:block"></div>

          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-md font-medium">
              Hủy bỏ
            </button>
            <button onClick={handleApply} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold flex items-center gap-2">
              Áp dụng <CheckIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
