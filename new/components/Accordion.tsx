import React from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface AccordionProps {
  title: React.ReactNode;
  count: number;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  variant?: 'primary' | 'secondary';
  headerActions?: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, count, children, isOpen, onToggle, variant = 'primary', headerActions }) => {
  const titleClass = variant === 'primary' 
    ? "font-semibold text-white" 
    : "font-light italic text-sky-400";

  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-3 bg-[#202633] hover:bg-[#282f3d] transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {typeof title === 'string' ? <span className={titleClass}>{title}</span> : title}
          {count > 0 && (
            <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div onClick={e => e.stopPropagation()}>{headerActions}</div>
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-[#282f3d] animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion;