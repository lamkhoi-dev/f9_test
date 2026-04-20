import type React from 'react';

export interface CardData {
  id: number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  iconClassName: string;
  titleKey: string;
  descriptionKey: string;
  pageLink?: string;
}
