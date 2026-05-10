import sequelize from '../config/database';
import User from './User';
import AppConfig from './AppConfig';
import Pricing from './Pricing';
import VertexKey from './VertexKey';
import UsageLog from './UsageLog';

// Associations
User.hasMany(UsageLog, { foreignKey: 'userId', as: 'usageLogs' });
UsageLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const db = {
  sequelize,
  User,
  AppConfig,
  Pricing,
  VertexKey,
  UsageLog,
};

export default db;
