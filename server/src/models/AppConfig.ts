import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AppConfigAttributes {
  id: number;
  key: string;
  value: string;
  description?: string;
}

type AppConfigCreationAttributes = Optional<AppConfigAttributes, 'id' | 'description'>;

class AppConfig extends Model<AppConfigAttributes, AppConfigCreationAttributes> implements AppConfigAttributes {
  declare id: number;
  declare key: string;
  declare value: string;
  declare description?: string;
}

AppConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AppConfig',
    tableName: 'app_configs',
  }
);

export default AppConfig;
