export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export type Category = {
  id: number;
  parent_id?: number | null;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  icon_url?: string;
  display_order: number;
  is_active: boolean;
  seo?: CategorySEO;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
};

export type CategorySEO = {
  meta_title?: string;
  meta_description?: string;
  keywords?: string;
  og_image?: string;
};

export type CategoryTree = Category & {
  level: number;
  product_count?: number;
  children?: CategoryTree[];
};

export type CreateCategoryPayload = {
  parent_id?: number;
  name: string;
  description?: string;
  image_url?: string;
  icon_url?: string;
  display_order?: number;
  seo?: CategorySEO;
};

export type UpdateCategoryPayload = Partial<CreateCategoryPayload> & {
  is_active?: boolean;
};

export type Product = {
  id: number;
  category_id?: number;
  sku: string;
  title: string;
  slug?: string;
  short_description?: string;
  price: number;
  discount_price?: number;
  final_price?: number;
  thumbnail_url?: string;
  quantity: number;
  is_active: boolean;
  is_featured: boolean;
};

export type Order = {
  id: number;
  customer_id: number;
  status: OrderStatus;
  total: number;
  created_at?: string;
  updated_at?: string;
  address?: {
    full_name?: string;
    phone?: string;
    city?: string;
    country?: string;
  };
};

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export type RevenueSummary = {
  revenue?: number;
  total_revenue?: number;
  orders?: number;
  total_orders?: number;
};

export type CategoryListData = {
  total: number;
  categories: Category[];
};

export type CategoryTreeData = {
  tree: CategoryTree[];
};

export type ProductListData = {
  total: number;
  page: number;
  limit: number;
  products: Product[];
};

export type OrderListData = {
  orders: Order[];
};
