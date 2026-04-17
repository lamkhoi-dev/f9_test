import React, { useState, useRef, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { XMarkIcon } from './icons/XMarkIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';

interface SliderControlProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
}

const SliderControl: React.FC<SliderControlProps> = ({ label, value, onValueChange, min = 0, max = 200 }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = Number(e.target.value);
    if (!isNaN(numValue)) {
      onValueChange(Math.max(min, Math.min(max, numValue)));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm w-20 flex-shrink-0 text-gray-300">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        className="flex-grow h-1 bg-gray-600 rounded-full appearance-none cursor-pointer range-sm accent-orange-500"
      />
      <div className="w-16 text-center">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          className="w-full bg-[#1F2937] border border-gray-600 rounded-md text-white text-center text-sm p-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
    </div>
  );
};

interface ImageEditorProps {
  imgSrc: string;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imgSrc, onClose }) => {
  const { t } = useLanguage();

  const initialFilters = {
    exposure: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grain: 0,
    clarity: 0,
    dehaze: 0,
    sepia: 0,
    invert: 0,
    hue: 0,
  };

  const [filters, setFilters] = useState(initialFilters);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFilterChange = (filterName: keyof typeof initialFilters, value: number) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // ✅ Sửa lại filter string — loại bỏ dấu %
  const buildCssFilterString = useMemo(() => {
    const brightness = filters.exposure / 100;  // 1 = 100%
    const contrast = (filters.contrast / 100) * (1 + filters.clarity / 200 + filters.dehaze / 200);
    const saturate = (filters.saturation / 100) + (filters.dehaze / 200);
    const blur = filters.blur / 20; // Max ~5px
    const sepia = filters.sepia / 100;
    const invert = filters.invert / 100;
    const hue = filters.hue * 3.6; // 0–100 → 0–360°

    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) blur(${blur}px)
            sepia(${sepia}) invert(${invert}) hue-rotate(${hue}deg)`;
  }, [filters]);

  const handleSave = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    setIsSaving(true);
    const originalImage = new Image();
    originalImage.crossOrigin = 'anonymous';
    originalImage.src = imgSrc;

    originalImage.onload = () => {
      canvas.width = originalImage.naturalWidth;
      canvas.height = originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsSaving(false);
        return;
      }

      ctx.filter = buildCssFilterString;
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none'; // reset

      const link = document.createElement('a');
      link.download = `[F9render.com]_edited-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsSaving(false);
    };

    originalImage.onerror = () => {
      setIsSaving(false);
      alert('Không thể tải ảnh để lưu (CORS có thể đang chặn).');
    };
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-fade-in" onMouseDown={onClose}>
      <div className="relative w-full h-full flex items-center justify-center p-4 lg:p-16 lg:pr-[350px]" onMouseDown={(e) => e.stopPropagation()}>
        <img
          ref={imageRef}
          src={imgSrc}
          alt="Editing view"
          className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg transition-all duration-100"
          style={{ filter: buildCssFilterString }}
        />
        {/* Hiệu ứng hạt (grain overlay) */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgibm9pc2UpIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4=')`,
            backgroundSize: '150px',
            opacity: filters.grain / 100,
            transition: 'opacity 0.1s ease-in-out'
          }}
        ></div>
      </div>

      {/* Sidebar điều chỉnh */}
      <div className="absolute right-0 top-0 bottom-0 bg-[#282f3d] w-[340px] p-4 flex flex-col shadow-2xl animate-fade-in" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{t('imageEditor.title')}</h2>
          <button onClick={() => setFilters(initialFilters)} className="text-sm text-gray-400 hover:text-white">
            {t('imageEditor.reset')}
          </button>
        </div>

        <div className="flex-grow space-y-4 overflow-y-auto pr-2">
          <SliderControl label={t('imageEditor.exposure')} value={filters.exposure} onValueChange={v => handleFilterChange('exposure', v)} />
          <SliderControl label={t('imageEditor.contrast')} value={filters.contrast} onValueChange={v => handleFilterChange('contrast', v)} />
          <SliderControl label={t('imageEditor.saturation')} value={filters.saturation} onValueChange={v => handleFilterChange('saturation', v)} />
          <SliderControl label={t('imageEditor.blur')} value={filters.blur} onValueChange={v => handleFilterChange('blur', v)} max={100} />
          <SliderControl label={t('imageEditor.grain')} value={filters.grain} onValueChange={v => handleFilterChange('grain', v)} max={100} />
          <SliderControl label={t('imageEditor.clarity')} value={filters.clarity} onValueChange={v => handleFilterChange('clarity', v)} max={100} />
          <SliderControl label={t('imageEditor.dehaze')} value={filters.dehaze} onValueChange={v => handleFilterChange('dehaze', v)} max={100} />
          <SliderControl label="Sepia" value={filters.sepia} onValueChange={v => handleFilterChange('sepia', v)} max={100} />
          <SliderControl label="Invert" value={filters.invert} onValueChange={v => handleFilterChange('invert', v)} max={100} />
          <SliderControl label="Hue" value={filters.hue} onValueChange={v => handleFilterChange('hue', v)} max={100} />
        </div>

        <div className="pt-6 mt-auto">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-500 disabled:cursor-wait"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>{isSaving ? t('imageEditor.saving') : t('imageEditor.save')}</span>
          </button>
        </div>
      </div>

      <button
        onClick={onClose}
        title={t('autoColoring.closeBtn')}
        className="absolute top-4 left-4 bg-black/40 text-white p-2 rounded-full shadow-lg hover:bg-black/60 transition-transform hover:scale-110"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default ImageEditor;
