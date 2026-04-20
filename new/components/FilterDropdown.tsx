
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ label, options, value, onChange, placeholder }) => {
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

  return (
    <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-400">{label}</label>
        <div className="relative" ref={selectRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#364053] text-white rounded-lg p-3 text-left flex justify-between items-center focus:outline-none"
            >
                <span>{value || placeholder}</span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full mt-1 w-full bg-[#364053] rounded-lg shadow-xl max-h-80 overflow-y-auto custom-scrollbar border border-slate-600 ring-1 ring-black/5">
                <ul>
                    {options.map((option) => (
                    <li
                        key={option}
                        onClick={() => handleSelect(option)}
                        className={`p-3 cursor-pointer text-white hover:bg-slate-700/50 ${value === option ? 'bg-blue-600' : ''}`}
                    >
                        {option}
                    </li>
                    ))}
                </ul>
                </div>
            )}
        </div>
    </div>
  );
};

export default FilterDropdown;
