import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
  id: string;
  phone: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  hasPersonalKey: boolean;
  freeUsageLeft: number;
  dailyFreeLimit: number;
  lastFreeReset: Date;
  balance: number;
}

type UserCreationAttributes = Optional<UserAttributes, 'id' | 'role' | 'plan' | 'hasPersonalKey' | 'freeUsageLeft' | 'dailyFreeLimit' | 'lastFreeReset' | 'balance'>;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare phone: string;
  declare password: string;
  declare name: string;
  declare role: 'user' | 'admin';
  declare plan: 'free' | 'pro';
  declare hasPersonalKey: boolean;
  declare freeUsageLeft: number;
  declare dailyFreeLimit: number;
  declare lastFreeReset: Date;
  declare balance: number;

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toSafeJSON() {
    const { password, ...safe } = this.toJSON();
    return safe;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false,
    },
    plan: {
      type: DataTypes.ENUM('free', 'pro'),
      defaultValue: 'free',
      allowNull: false,
    },
    hasPersonalKey: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    freeUsageLeft: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      allowNull: false,
    },
    dailyFreeLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // 0 = use global default
      allowNull: false,
    },
    lastFreeReset: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      allowNull: true,
    },
    balance: {
      type: DataTypes.FLOAT,
      defaultValue: 30,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
