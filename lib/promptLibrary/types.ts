
export interface SubCategory {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  badge?: string;
}

export interface MainCategory {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  subCategories: SubCategory[];
}
