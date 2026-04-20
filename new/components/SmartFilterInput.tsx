
import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';

interface SmartFilterInputProps {
  id: string;
  value: string | string[];
  onChange: (value: any) => void;
  placeholder: string;
  suggestions: string[];
  multiSelect?: boolean;
}

const SmartFilterInput: React.FC<SmartFilterInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
  multiSelect = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!multiSelect && typeof value === 'string') {
       if (value !== inputValue) {
           setInputValue(value);
       }
    }
  }, [value, multiSelect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    if (!multiSelect) {
      onChange(newVal);
    }
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      if (!currentValues.includes(suggestion)) {
        onChange([...currentValues, suggestion]);
      }
      setInputValue('');
      inputRef.current?.focus();
    } else {
      setInputValue(suggestion);
      onChange(suggestion);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (multiSelect) {
        const currentValues = Array.isArray(value) ? value : [];
        if (!currentValues.includes(inputValue.trim())) {
            onChange([...currentValues, inputValue.trim()]);
        }
        setInputValue('');
      } else {
        onChange(inputValue.trim());
        setShowSuggestions(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && multiSelect) {
        const currentValues = Array.isArray(value) ? value : [];
        if (currentValues.length > 0) {
            onChange(currentValues.slice(0, -1));
        }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentValues = Array.isArray(value) ? value : [];
    onChange(currentValues.filter(tag => tag !== tagToRemove));
  };

  const editTag = (tagToEdit: string) => {
      removeTag(tagToEdit);
      setInputValue(tagToEdit);
      inputRef.current?.focus();
  }

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(inputValue.toLowerCase()) &&
    (multiSelect ? !(Array.isArray(value) && value.includes(s)) : s !== value)
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className={`flex flex-wrap items-center gap-2 w-full bg-slate-700 border border-slate-600 rounded-lg p-2 focus-within:ring-2 focus-within:ring-orange-500 transition-shadow ${isFocused ? 'ring-2 ring-orange-500' : ''}`}
        onClick={() => {
            inputRef.current?.focus();
            setIsFocused(true);
            setShowSuggestions(true);
        }}
      >
        {multiSelect && Array.isArray(value) && value.map((tag, index) => (
          <span key={index} className="bg-orange-600/80 text-white text-sm px-2 py-1 rounded flex items-start gap-2 max-w-full animate-fade-in">
            <span 
                className="break-words whitespace-pre-wrap cursor-pointer hover:underline min-w-0 text-left" 
                onClick={(e) => { e.stopPropagation(); editTag(tag); }}
                title="Click to edit"
            >
                {tag}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="hover:text-orange-200 focus:outline-none flex-shrink-0 mt-0.5"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
          }}
          placeholder={multiSelect && Array.isArray(value) && value.length > 0 ? '' : placeholder}
          className="flex-grow bg-transparent text-white outline-none min-w-[120px] placeholder-gray-400 h-8"
          autoComplete="off"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-20 top-full mt-1 w-full bg-[#282f3d] border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
          <ul>
            {filteredSuggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 cursor-pointer hover:bg-slate-700 text-white text-sm transition-colors whitespace-pre-wrap"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SmartFilterInput;
