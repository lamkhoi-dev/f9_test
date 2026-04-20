
import React from 'react';
import Card from './Card';
import { cardData } from '../constants';
import type { CardData } from '../types';

interface CardGridProps {
  onNavigate: (page?: string) => void;
}

const CardGrid: React.FC<CardGridProps> = ({ onNavigate }) => {
  return (
    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 animate-fade-in">
      {cardData.map((data: CardData) => (
        <Card
          key={data.id}
          icon={<data.icon className={data.iconClassName} />}
          titleKey={data.titleKey}
          descriptionKey={data.descriptionKey}
          onClick={() => onNavigate(data.pageLink)}
          isClickable={!!data.pageLink}
        />
      ))}
    </div>
  );
};

export default CardGrid;
