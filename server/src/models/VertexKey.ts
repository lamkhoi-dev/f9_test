import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface VertexKeyAttributes {
  id: number;
  label: string;
  provider: string;
  keyType: 'service_account' | 'api_key';
  credentials: any;
  status: 'active' | 'limited' | 'disabled';
  dailyUsed: number;
  lastUsedAt?: Date;
  projectId?: string;
}

type VertexKeyCreationAttributes = Optional<VertexKeyAttributes, 'id' | 'status' | 'dailyUsed' | 'lastUsedAt' | 'projectId'>;

class VertexKey extends Model<VertexKeyAttributes, VertexKeyCreationAttributes> implements VertexKeyAttributes {
  declare id: number;
  declare label: string;
  declare provider: string;
  declare keyType: 'service_account' | 'api_key';
  declare credentials: any;
  declare status: 'active' | 'limited' | 'disabled';
  declare dailyUsed: number;
  declare lastUsedAt?: Date;
  declare projectId?: string;
}

VertexKey.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'google',
    },
    keyType: {
      type: DataTypes.ENUM('service_account', 'api_key'),
      allowNull: false,
      defaultValue: 'service_account',
    },
    credentials: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'limited', 'disabled'),
      allowNull: false,
      defaultValue: 'active',
    },
    dailyUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'VertexKey',
    tableName: 'vertex_keys',
  }
);

export default VertexKey;
