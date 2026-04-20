import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';

interface FullScreenCompareProps {
  originalImage: string;
  inpaintedImage: string;
  onClose: () => void;
}

export const FullScreenCompare: React.FC<FullScreenCompareProps> = ({ originalImage, inpaintedImage, onClose }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleInteractionMove = (clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const position = (x / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, position)));
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDragging.current = true;
    handleInteractionMove(e.clientX);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    handleInteractionMove(e.clientX);
  };
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
     if (e.touches.length > 0) {
        handleInteractionMove(e.touches[0].clientX);
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
        handleInteractionMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseUpGlobal = () => {
        isDragging.current = false;
    };
    window.addEventListener('mouseup', handleMouseUpGlobal);
    window.addEventListener('touchend', handleMouseUpGlobal);
    return () => {
        window.removeEventListener('mouseup', handleMouseUpGlobal);
        window.removeEventListener('touchend', handleMouseUpGlobal);
    }
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-fade-in" onMouseDown={onClose}>
        <div 
            className="relative w-full h-full max-w-[90vw] max-h-[90vh] select-none cursor-ew-resize" 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            <div className="relative w-full h-full" style={{ touchAction: 'none' }}>
                {/* Original Image (Bottom Layer) */}
                <img src={originalImage} alt="Original" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                
                {/* Inpainted Image (Top Layer, clipped) */}
                <div 
                    className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" 
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                    <img src={inpaintedImage} alt="Inpainted" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                </div>

                {/* Slider Handle */}
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-white/70 pointer-events-none"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        <button onClick={onClose} title="Close" className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full shadow-lg hover:bg-black/60 transition-transform hover:scale-110">
            <XMarkIcon className="w-6 h-6" />
        </button>
    </div>
  );
};
