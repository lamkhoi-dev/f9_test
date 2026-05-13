import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PromptAttributes {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  thumbnail: string;
  tier: 'free' | 'pro';
  sortOrder: number;
  isActive: boolean;
}

type PromptCreationAttributes = Optional<PromptAttributes, 'id' | 'thumbnail' | 'sortOrder' | 'isActive'>;

class Prompt extends Model<PromptAttributes, PromptCreationAttributes> implements PromptAttributes {
  declare id: string;
  declare categoryId: string;
  declare title: string;
  declare content: string;
  declare thumbnail: string;
  declare tier: 'free' | 'pro';
  declare sortOrder: number;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Prompt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'prompt_categories', key: 'id' },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    tier: {
      type: DataTypes.ENUM('free', 'pro'),
      allowNull: false,
      defaultValue: 'free',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Prompt',
    tableName: 'prompts',
    timestamps: true,
  }
);

export default Prompt;
