
import React from 'react';
import { SubCategory } from '../../lib/promptLibrary/types';

interface SubCategoryCardProps {
  item: SubCategory;
  onClick: (item: SubCategory) => void;
}

const SubCategoryCard: React.FC<SubCategoryCardProps> = ({ item, onClick }) => {
  return (
    <div 
      className="group bg-[#252a33] rounded-xl border border-[#374151] overflow-hidden shadow-sm hover:shadow-lg hover:border-[#4b5563] transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => onClick(item)}
    >
      <div className="relative aspect-video overflow-hidden bg-[#1e232d]">
        <img 
          src={item.imageUrl} 
          alt={item.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
        />
        <div className="absolute top-3 left-3">
          <span className="bg-[#f97316] text-[10px] font-bold text-white px-2 py-1 rounded tracking-wider shadow-md">
            {item.badge}
          </span>
        </div>
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-[#f97316] transition-colors">
          {item.title}
        </h4>
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      </div>
    </div>
  );
};

export default SubCategoryCard;
