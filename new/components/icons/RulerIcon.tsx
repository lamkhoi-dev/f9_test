
import React from 'react';

export const RulerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v3m3-3v5m3-5v3m-6 18v-3m3 3v-5m3 5v-3M3 9h3m-3 3h5m-5 3h3m18-9h-3m3 3h-5m5 3h-3" />
  </svg>
);
