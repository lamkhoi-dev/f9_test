import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  // FIX: Added an optional 'label' property to the interface to allow this component to be used with a label, resolving TypeScript errors in ImageGenerationPage.
  label?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectComponent = (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg p-2.5 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={value ? 'text-white' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full mt-1 w-full bg-[#282f3d] border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <ul>
            <li
              key="placeholder"
              onClick={() => handleSelect('')}
              className={`p-2.5 cursor-pointer hover:bg-slate-700 ${!value ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
            >
              {placeholder}
            </li>
            {options.map((option) => (
              <li
                key={option}
                onClick={() => handleSelect(option)}
                className={`p-2.5 cursor-pointer hover:bg-slate-700 ${value === option ? 'bg-blue-600 text-white' : 'text-gray-300'}`}
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // FIX: Conditionally wraps the select component with a label and a container div if the 'label' prop is provided, maintaining layout consistency.
  if (label) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-semibold text-white">{label}</label>
        {selectComponent}
      </div>
    );
  }

  return selectComponent;
};

export default CustomSelect;