import sequelize from '../config/database';
import User from './User';
import AppConfig from './AppConfig';
import Pricing from './Pricing';
import VertexKey from './VertexKey';
import UsageLog from './UsageLog';
import PromptCategory from './PromptCategory';
import Prompt from './Prompt';
import PricingPackage from './PricingPackage';
import PaymentOrder from './PaymentOrder';

// Associations
User.hasMany(UsageLog, { foreignKey: 'userId', as: 'usageLogs' });
UsageLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

PromptCategory.hasMany(Prompt, { foreignKey: 'categoryId', as: 'prompts' });
Prompt.belongsTo(PromptCategory, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(PaymentOrder, { foreignKey: 'userId', as: 'paymentOrders' });
PaymentOrder.belongsTo(User, { foreignKey: 'userId', as: 'user' });

PricingPackage.hasMany(PaymentOrder, { foreignKey: 'packageId', as: 'paymentOrders' });
PaymentOrder.belongsTo(PricingPackage, { foreignKey: 'packageId', as: 'package' });

const db = {
  sequelize,
  User,
  AppConfig,
  Pricing,
  VertexKey,
  UsageLog,
  PromptCategory,
  Prompt,
  PricingPackage,
  PaymentOrder,
};

export default db;

