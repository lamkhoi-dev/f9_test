import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ShowcaseTabAttributes {
  id: string;
  tabKey: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  originalImageUrl: string;
  renderImageUrls: string; // JSON array string
  sortOrder: number;
  isActive: boolean;
}

type ShowcaseTabCreationAttributes = Optional<ShowcaseTabAttributes, 'id' | 'sortOrder' | 'isActive' | 'descriptionVi' | 'descriptionEn' | 'originalImageUrl' | 'renderImageUrls'>;

class ShowcaseTab extends Model<ShowcaseTabAttributes, ShowcaseTabCreationAttributes> implements ShowcaseTabAttributes {
  declare id: string;
  declare tabKey: string;
  declare titleVi: string;
  declare titleEn: string;
  declare descriptionVi: string;
  declare descriptionEn: string;
  declare originalImageUrl: string;
  declare renderImageUrls: string;
  declare sortOrder: number;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  getRenderImages(): string[] {
    try { return JSON.parse(this.renderImageUrls); } catch { return []; }
  }
}

ShowcaseTab.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tabKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    titleVi: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    titleEn: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    descriptionVi: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    originalImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    renderImageUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
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
    modelName: 'ShowcaseTab',
    tableName: 'showcase_tabs',
    timestamps: true,
  }
);

export default ShowcaseTab;
