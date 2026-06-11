import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BlogPostAttributes {
  id: string;
  imageUrl: string;
  tagVi: string;
  tagEn: string;
  titleVi: string;
  titleEn: string;
  excerptVi: string;
  excerptEn: string;
  contentVi: string;
  contentEn: string;
  sortOrder: number;
  isActive: boolean;
}

type BlogPostCreationAttributes = Optional<BlogPostAttributes, 'id' | 'sortOrder' | 'isActive' | 'contentVi' | 'contentEn' | 'imageUrl'>;

class BlogPost extends Model<BlogPostAttributes, BlogPostCreationAttributes> implements BlogPostAttributes {
  declare id: string;
  declare imageUrl: string;
  declare tagVi: string;
  declare tagEn: string;
  declare titleVi: string;
  declare titleEn: string;
  declare excerptVi: string;
  declare excerptEn: string;
  declare contentVi: string;
  declare contentEn: string;
  declare sortOrder: number;
  declare isActive: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

BlogPost.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    tagVi: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    tagEn: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    titleVi: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    titleEn: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    excerptVi: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    excerptEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    contentVi: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    contentEn: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'BlogPost',
    tableName: 'blog_posts',
    timestamps: true,
  }
);

export default BlogPost;
