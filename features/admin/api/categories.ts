import { adminRequest } from "./admin-client";
import type {
  ApiResponse,
  Category,
  CategoryListData,
  CategoryTreeData,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "../types";

type ListCategoriesParams = {
  active?: boolean;
};

export function createCategory(payload: CreateCategoryPayload) {
  return adminRequest<Category>("categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listCategories(params: ListCategoriesParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.active !== undefined) {
    searchParams.set("active", String(params.active));
  }

  const query = searchParams.toString();

  return adminRequest<CategoryListData>(
    query ? `categories?${query}` : "categories",
  );
}

export function listDeletedCategories() {
  return adminRequest<CategoryListData>("categories/deleted");
}

export function getCategoryTree() {
  return adminRequest<CategoryTreeData>("categories/tree");
}

export function getCategoryBySlug(slug: string) {
  return adminRequest<Category>(`categories/slug/${encodeURIComponent(slug)}`);
}

export function getCategoryById(id: number) {
  return adminRequest<Category>(`categories/${id}`);
}

export function updateCategory(id: number, payload: UpdateCategoryPayload) {
  return adminRequest<Category>(`categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCategory(id: number): Promise<ApiResponse<null>> {
  return adminRequest<null>(`categories/${id}`, {
    method: "DELETE",
  });
}

export function permanentlyDeleteCategory(
  id: number,
): Promise<ApiResponse<null>> {
  return adminRequest<null>(`categories/${id}/permanent`, {
    method: "DELETE",
  });
}

export function restoreCategory(id: number) {
  return adminRequest<Category>(`categories/${id}/restore`, {
    method: "POST",
  });
}
