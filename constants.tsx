import { LightbulbIcon } from './components/icons/LightbulbIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { PencilIcon } from './components/icons/PencilIcon';
import { BoltIcon } from './components/icons/BoltIcon';
import { ArrowTopRightOnSquareIcon } from './components/icons/ArrowTopRightOnSquareIcon';
import type { CardData } from './types';

export const cardData: CardData[] = [
  {
    id: 1,
    icon: LightbulbIcon,
    iconClassName: "w-6 h-6 text-yellow-500",
    titleKey: "cards.autoColoring.title",
    descriptionKey: "cards.autoColoring.description",
    pageLink: "auto-coloring",
  },
  {
    id: 2,
    icon: ImageIcon,
    iconClassName: "w-6 h-6 text-blue-500",
    titleKey: "cards.imageGeneration.title",
    descriptionKey: "cards.imageGeneration.description",
    pageLink: "image-generation",
  },
  {
    id: 3,
    icon: SparklesIcon,
    iconClassName: "w-6 h-6 text-purple-500",
    titleKey: "cards.magicEdit.title",
    descriptionKey: "cards.magicEdit.description",
    pageLink: "prompt-library",
  },
  {
    id: 4,
    icon: PencilIcon,
    iconClassName: "w-6 h-6 text-green-500",
    titleKey: "cards.3dSketch.title",
    descriptionKey: "cards.3dSketch.description",
    pageLink: "3d-sketch",
  },
  {
    id: 5,
    icon: BoltIcon,
    iconClassName: "w-6 h-6 text-red-500",
    titleKey: "cards.fastGeneration.title",
    descriptionKey: "cards.fastGeneration.description",
    pageLink: "realistic-model",
  },
  {
    id: 6,
    icon: ArrowTopRightOnSquareIcon,
    iconClassName: "w-6 h-6 text-indigo-500",
    titleKey: "cards.download3d.title",
    descriptionKey: "cards.download3d.description",
    pageLink: "download-3d-model",
  },
];