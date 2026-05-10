import React from 'react';

interface CreditIconProps {
  className?: string;
}

const CreditIcon: React.FC<CreditIconProps> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#gold_gradient)" stroke="url(#gold_border)" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="7.5" stroke="url(#gold_inner)" strokeWidth="0.75" fill="none"/>
    <path d="M13.5 8.5C13.5 8.5 12.8 8 12 8C10.34 8 9 9.34 9 11C9 12.66 10.34 14 12 14C12.8 14 13.5 13.5 13.5 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 14L12.8 15.4M12 14L10.5 15" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    <defs>
      <linearGradient id="gold_gradient" x1="4" y1="4" x2="20" y2="20">
        <stop stopColor="#F6D365"/>
        <stop offset="1" stopColor="#E8A317"/>
      </linearGradient>
      <linearGradient id="gold_border" x1="4" y1="4" x2="20" y2="20">
        <stop stopColor="#D4A017"/>
        <stop offset="1" stopColor="#C49000"/>
      </linearGradient>
      <linearGradient id="gold_inner" x1="6" y1="6" x2="18" y2="18">
        <stop stopColor="#FCEABB" stopOpacity="0.6"/>
        <stop offset="1" stopColor="#D4A017" stopOpacity="0.3"/>
      </linearGradient>
    </defs>
  </svg>
);

export default CreditIcon;
