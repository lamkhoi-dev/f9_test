import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface LandingSlideAttributes {
  id: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
}

type LandingSlideCreationAttributes = Optional<LandingSlideAttributes, 'id' | 'altText' | 'sortOrder' | 'isActive'>;

class LandingSlide extends Model<LandingSlideAttributes, LandingSlideCreationAttributes> implements LandingSlideAttributes {
  declare id: string;
  declare imageUrl: string;
  declare altText: string;
  declare sortOrder: number;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

LandingSlide.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    altText: {
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
    modelName: 'LandingSlide',
    tableName: 'landing_slides',
    timestamps: true,
  }
);

export default LandingSlide;
