import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PricingAttributes {
  id: number;
  model: string;
  resolution: string;
  service: string;
  price: number;
}

type PricingCreationAttributes = Optional<PricingAttributes, 'id'>;

class Pricing extends Model<PricingAttributes, PricingCreationAttributes> implements PricingAttributes {
  declare id: number;
  declare model: string;
  declare resolution: string;
  declare service: string;
  declare price: number;
}

Pricing.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resolution: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    service: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'all',
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Pricing',
    tableName: 'pricings',
    indexes: [
      {
        unique: true,
        fields: ['model', 'resolution', 'service'],
      },
    ],
  }
);

export default Pricing;
