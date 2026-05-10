
import React from 'react';
import { MainCategory } from '../../lib/promptLibrary/types';

interface CategoryCardProps {
  category: MainCategory;
  onClick: (category: MainCategory) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  return (
    <div 
      className="group relative overflow-hidden rounded-xl bg-[#252a33] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-[#374151]"
      onClick={() => onClick(category)}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img 
          src={category.imageUrl} 
          alt={category.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e232d] via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
      </div>
      
      <div className="absolute bottom-0 left-0 p-6 text-white w-full">
        <h3 className="text-xl font-bold mb-1 group-hover:text-[#f97316] transition-colors">{category.title}</h3>
        <p className="text-sm text-gray-300 line-clamp-2 max-w-xs">{category.description}</p>
      </div>
      
      <div className="absolute top-4 right-4 bg-[#1e232d]/60 backdrop-blur-md rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default CategoryCard;
