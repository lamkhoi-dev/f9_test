import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

const ImageEditSlider: React.FC<SliderProps> = ({ label, value, onChange, min = 0, max = 100, unit = '%' }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <label className="text-gray-400">{label}</label>
        <span className="text-white font-medium">{value}{unit}</span>
      </div>
       <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer custom-slider"
        />
      </div>
      <style>{`
        .custom-slider::-webkit-slider-runnable-track {
          background: #374151; /* bg-gray-700 */
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6; /* bg-blue-500 */
          cursor: pointer;
          border-radius: 50%;
          margin-top: -6px; /* center thumb on track */
        }

        .custom-slider::-moz-range-track {
          background: #374151;
          height: 4px;
          border-radius: 9999px;
        }
        .custom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #3b82f6;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default ImageEditSlider;
