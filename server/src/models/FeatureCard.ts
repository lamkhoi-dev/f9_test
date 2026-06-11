import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface FeatureCardAttributes {
  id: string;
  cardKey: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  extraImageUrls: string; // JSON array for perspectives card (4 images)
  sortOrder: number;
}

type FeatureCardCreationAttributes = Optional<FeatureCardAttributes, 'id' | 'sortOrder' | 'descriptionVi' | 'descriptionEn' | 'beforeImageUrl' | 'afterImageUrl' | 'extraImageUrls'>;

class FeatureCard extends Model<FeatureCardAttributes, FeatureCardCreationAttributes> implements FeatureCardAttributes {
  declare id: string;
  declare cardKey: string;
  declare titleVi: string;
  declare titleEn: string;
  declare descriptionVi: string;
  declare descriptionEn: string;
  declare beforeImageUrl: string;
  declare afterImageUrl: string;
  declare extraImageUrls: string;
  declare sortOrder: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  getExtraImages(): string[] {
    try { return JSON.parse(this.extraImageUrls); } catch { return []; }
  }
}

FeatureCard.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cardKey: {
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
    beforeImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    afterImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    extraImageUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '[]',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'FeatureCard',
    tableName: 'feature_cards',
    timestamps: true,
  }
);

export default FeatureCard;
