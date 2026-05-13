import sequelize from '../config/database';
import User from './User';
import AppConfig from './AppConfig';
import Pricing from './Pricing';
import VertexKey from './VertexKey';
import UsageLog from './UsageLog';
import PromptCategory from './PromptCategory';
import Prompt from './Prompt';

// Associations
User.hasMany(UsageLog, { foreignKey: 'userId', as: 'usageLogs' });
UsageLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

PromptCategory.hasMany(Prompt, { foreignKey: 'categoryId', as: 'prompts' });
Prompt.belongsTo(PromptCategory, { foreignKey: 'categoryId', as: 'category' });

const db = {
  sequelize,
  User,
  AppConfig,
  Pricing,
  VertexKey,
  UsageLog,
  PromptCategory,
  Prompt,
};

export default db;
