import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UsageLogAttributes {
  id: string;
  userId: string;
  model: string;
  resolution?: string;
  cost: number;
  type: 'free' | 'paid' | 'hybrid';
  status: 'pending' | 'success' | 'failed' | 'timeout';
  requestId?: string;
  error?: string;
  inputData?: string;
  outputData?: string;
  page?: string;
  config?: any;
  imageCount?: number;
  freeUsed?: number;
}

type UsageLogCreationAttributes = Optional<UsageLogAttributes, 'id' | 'status'>;

class UsageLog extends Model<UsageLogAttributes, UsageLogCreationAttributes> implements UsageLogAttributes {
  declare id: string;
  declare userId: string;
  declare model: string;
  declare resolution?: string;
  declare cost: number;
  declare type: 'free' | 'paid' | 'hybrid';
  declare status: 'pending' | 'success' | 'failed' | 'timeout';
  declare requestId?: string;
  declare error?: string;
  declare inputData?: string;
  declare outputData?: string;
  declare page?: string;
  declare config?: any;
  declare imageCount: number;
  declare freeUsed: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

UsageLog.init(
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
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resolution: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cost: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.ENUM('free', 'paid', 'hybrid'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed', 'timeout'),
      allowNull: false,
      defaultValue: 'pending',
    },
    requestId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // New fields for History
    inputData: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    outputData: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    page: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    imageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    freeUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'UsageLog',
    tableName: 'usage_logs',
    timestamps: true,
  }
);

export default UsageLog;
