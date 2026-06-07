import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface PaymentOrderAttributes {
  id: string;
  userId: string;
  packageId?: string;
  packageName: string;
  credits: number;
  amount: number;
  orderCode: string; // F9R + random characters (e.g. F9R12345)
  status: 'pending' | 'completed' | 'failed' | 'manual_check';
  gatewayResponse?: any;
}

type PaymentOrderCreationAttributes = Optional<PaymentOrderAttributes, 'id' | 'packageId' | 'status' | 'gatewayResponse'>;

class PaymentOrder extends Model<PaymentOrderAttributes, PaymentOrderCreationAttributes> implements PaymentOrderAttributes {
  declare id: string;
  declare userId: string;
  declare packageId?: string;
  declare packageName: string;
  declare credits: number;
  declare amount: number;
  declare orderCode: string;
  declare status: 'pending' | 'completed' | 'failed' | 'manual_check';
  declare gatewayResponse?: any;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PaymentOrder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    packageId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    packageName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    orderCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'manual_check'),
      allowNull: false,
      defaultValue: 'pending',
    },
    gatewayResponse: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'PaymentOrder',
    tableName: 'payment_orders',
    timestamps: true,
  }
);

export default PaymentOrder;
