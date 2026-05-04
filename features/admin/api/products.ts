import { adminRequest } from "./admin-client";
import type { Product, ProductListData } from "../types";

export type CreateProductPayload = {
  category_id: number;
  sku: string;
  title: string;
  short_description?: string;
  description: string;
  price: number;
  quantity?: number;
  low_stock_warning?: number;
  thumbnail_url?: string;
};

export function listProducts() {
  return adminRequest<ProductListData>("products");
}

export function createProduct(payload: CreateProductPayload) {
  return adminRequest<Product>("products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
