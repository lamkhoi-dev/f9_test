import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PricingPackageAttributes {
  id: string;
  name: string;
  credits: number;
  price: number; // Final price in VND
  originalPrice: number; // Original price in VND for display
  discount: string; // e.g. "-14%" or "-20%"
  durationMonths: number; // e.g. 1, 3, 6
  popular: boolean;
  theme: 'purple' | 'orange';
  features: string[]; // Array of feature strings, serialized/deserialized automatically or stored as JSON
}

type PricingPackageCreationAttributes = Optional<PricingPackageAttributes, 'id' | 'popular' | 'theme' | 'discount'>;

class PricingPackage extends Model<PricingPackageAttributes, PricingPackageCreationAttributes> implements PricingPackageAttributes {
  declare id: string;
  declare name: string;
  declare credits: number;
  declare price: number;
  declare originalPrice: number;
  declare discount: string;
  declare durationMonths: number;
  declare popular: boolean;
  declare theme: 'purple' | 'orange';
  declare features: string[];

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PricingPackage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    originalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    discount: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    durationMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    popular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    theme: {
      type: DataTypes.ENUM('purple', 'orange'),
      allowNull: false,
      defaultValue: 'purple',
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'PricingPackage',
    tableName: 'pricing_packages',
    timestamps: true,
  }
);

export default PricingPackage;
