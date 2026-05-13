import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PromptCategoryAttributes {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

type PromptCategoryCreationAttributes = Optional<PromptCategoryAttributes, 'id' | 'description' | 'sortOrder' | 'isActive'>;

class PromptCategory extends Model<PromptCategoryAttributes, PromptCategoryCreationAttributes> implements PromptCategoryAttributes {
  declare id: string;
  declare name: string;
  declare description: string;
  declare sortOrder: number;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PromptCategory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
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
    modelName: 'PromptCategory',
    tableName: 'prompt_categories',
    timestamps: true,
  }
);

export default PromptCategory;
