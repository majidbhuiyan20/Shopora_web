"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminRequest, getAdminToken } from "../api/admin-client";
import {
  createCategory,
  deleteCategory,
  listCategories,
  listDeletedCategories,
  permanentlyDeleteCategory,
  restoreCategory,
  updateCategory,
} from "../api/categories";
import type {
  Category,
  Order,
  OrderListData,
  OrderStatus,
  Product,
  ProductListData,
  RevenueSummary,
} from "../types";

const orderStatuses: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

type DashboardTab = "overview" | "categories" | "products" | "orders";
type CategoryView = "active" | "deleted";

const emptyCategoryForm = {
  name: "",
  description: "",
  image_url: "",
  icon_url: "",
  display_order: "0",
  is_active: true,
};

const emptyProductForm = {
  category_id: "",
  sku: "",
  title: "",
  short_description: "",
  description: "",
  price: "",
  quantity: "",
  thumbnail_url: "",
};

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [categories, setCategories] = useState<Category[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(
    () => [
      { label: "Categories", value: categories.length },
      { label: "Products", value: products.length },
      { label: "Orders", value: orders.length },
      {
        label: "Revenue",
        value: currency(revenue?.total_revenue ?? revenue?.revenue ?? 0),
      },
    ],
    [categories.length, orders.length, products.length, revenue],
  );

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      const [categoryRes, productRes, orderRes, revenueRes] = await Promise.all([
        listCategories(),
        adminRequest<ProductListData>("products"),
        adminRequest<OrderListData>("orders"),
        adminRequest<{ summary: RevenueSummary }>("analytics/revenue"),
      ]);

      setCategories(categoryRes.data?.categories ?? []);
      setProducts(productRes.data?.products ?? []);
      setOrders(orderRes.data?.orders ?? []);
      setRevenue(revenueRes.data?.summary ?? null);
      void listDeletedCategories()
        .then((deletedRes) =>
          setDeletedCategories(deletedRes.data?.categories ?? []),
        )
        .catch(() => setDeletedCategories([]));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function initializeDashboard() {
      if (!getAdminToken()) {
        setError("Please login again. Admin token was not found.");
        setIsLoading(false);
        return;
      }

      await loadDashboard();
    }

    void initializeDashboard();
  }, []);

  async function handleSubmitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice("");
    setError("");

    try {
      const payload = {
        name: categoryForm.name,
        description: categoryForm.description,
        image_url: categoryForm.image_url,
        icon_url: categoryForm.icon_url,
        display_order: Number(categoryForm.display_order || 0),
        is_active: categoryForm.is_active,
      };

      if (editingCategoryId) {
        await updateCategory(editingCategoryId, payload);
        setNotice("Category updated successfully.");
      } else {
        await createCategory(payload);
        setNotice("Category created successfully.");
      }

      setCategoryForm(emptyCategoryForm);
      setEditingCategoryId(null);
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create category.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditCategory(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      icon_url: category.icon_url ?? "",
      display_order: String(category.display_order ?? 0),
      is_active: category.is_active,
    });
    setActiveTab("categories");
    setNotice("");
    setError("");
  }

  function handleCancelCategoryEdit() {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  }

  async function handleDeleteCategory(id: number) {
    setNotice("");
    setError("");

    try {
      await deleteCategory(id);
      setNotice("Category deleted successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete category.",
      );
    }
  }

  async function handleRestoreCategory(id: number) {
    setNotice("");
    setError("");

    try {
      await restoreCategory(id);
      setNotice("Category restored successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to restore category.",
      );
    }
  }

  async function handlePermanentDeleteCategory(id: number) {
    setNotice("");
    setError("");

    try {
      await permanentlyDeleteCategory(id);
      setNotice("Category permanently deleted.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to permanently delete category.",
      );
    }
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice("");
    setError("");

    try {
      await adminRequest("products", {
        method: "POST",
        body: JSON.stringify({
          category_id: Number(productForm.category_id),
          sku: productForm.sku,
          title: productForm.title,
          short_description: productForm.short_description,
          description: productForm.description,
          price: Number(productForm.price),
          quantity: Number(productForm.quantity || 0),
          low_stock_warning: 10,
          thumbnail_url: productForm.thumbnail_url,
        }),
      });
      setNotice("Product created successfully.");
      setProductForm(emptyProductForm);
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create product.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateOrderStatus(orderID: number, status: OrderStatus) {
    setNotice("");
    setError("");

    try {
      await adminRequest(`orders/${orderID}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          note: `Admin marked order as ${status}.`,
        }),
      });
      setNotice(`Order #${orderID} updated to ${status}.`);
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update order.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f8f4]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8">
        <header className="flex flex-col justify-between gap-5 rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-xl shadow-[#153820]/8 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">
              Shopora Admin
            </p>
            <h1 className="text-3xl font-black text-ink sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
              Manage categories, publish products, view product-category
              inventory, and track customer orders from one workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="h-11 rounded-lg border border-primary/20 px-5 text-sm font-bold text-primary transition hover:bg-primary-soft"
          >
            Refresh
          </button>
        </header>

        <nav className="grid gap-3 sm:grid-cols-4">
          {[
            ["overview", "Overview"],
            ["categories", "Categories"],
            ["products", "Products"],
            ["orders", "Orders"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value as DashboardTab)}
              className={`h-11 rounded-lg border px-4 text-sm font-bold transition ${
                activeTab === value
                  ? "border-primary bg-primary text-white"
                  : "border-[#d9e4dc] bg-white text-ink/70 hover:border-primary/35 hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {notice ? (
          <p className="rounded-lg bg-primary-soft px-4 py-3 text-sm font-bold text-primary">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-[#d9e4dc] bg-white p-8 text-sm font-bold text-ink/60">
            Loading dashboard...
          </div>
        ) : null}

        {!isLoading && activeTab === "overview" ? (
          <Overview stats={stats} products={products} orders={orders} />
        ) : null}

        {!isLoading && activeTab === "categories" ? (
          <CategoriesPanel
            categories={categories}
            deletedCategories={deletedCategories}
            form={categoryForm}
            editingCategoryId={editingCategoryId}
            isSaving={isSaving}
            onChange={setCategoryForm}
            onSubmit={handleSubmitCategory}
            onCancelEdit={handleCancelCategoryEdit}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onRestore={handleRestoreCategory}
            onPermanentDelete={handlePermanentDeleteCategory}
          />
        ) : null}

        {!isLoading && activeTab === "products" ? (
          <ProductsPanel
            categories={categories}
            form={productForm}
            products={products}
            isSaving={isSaving}
            onChange={setProductForm}
            onSubmit={handleCreateProduct}
          />
        ) : null}

        {!isLoading && activeTab === "orders" ? (
          <OrdersPanel
            orders={orders}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        ) : null}
      </div>
    </main>
  );
}

function Overview({
  stats,
  products,
  orders,
}: {
  stats: { label: string; value: number | string }[];
  products: Product[];
  orders: Order[];
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#d9e4dc] bg-white p-6 shadow-lg shadow-[#153820]/6"
          >
            <p className="text-sm font-bold text-ink/55">{item.label}</p>
            <p className="mt-4 text-3xl font-black text-primary">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProductCategoryList products={products} />
        <OrderTracker orders={orders} onUpdateStatus={null} compact />
      </div>
    </section>
  );
}

function CategoriesPanel({
  categories,
  deletedCategories,
  form,
  editingCategoryId,
  isSaving,
  onChange,
  onSubmit,
  onCancelEdit,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  categories: Category[];
  deletedCategories: Category[];
  form: typeof emptyCategoryForm;
  editingCategoryId: number | null;
  isSaving: boolean;
  onChange: (value: typeof emptyCategoryForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
}) {
  const [categoryView, setCategoryView] = useState<CategoryView>("active");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const visibleCategories =
    categoryView === "active" ? categories : deletedCategories;

  return (
    <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-lg shadow-[#153820]/6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-ink">
              {editingCategoryId ? "Edit category" : "Add category"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/55">
              Add the category artwork URL so storefront lists can display a
              polished visual card.
            </p>
          </div>
          {editingCategoryId ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-9 rounded-lg border border-[#d9e4dc] px-3 text-xs font-black text-ink/65 transition hover:border-primary/40 hover:text-primary"
            >
              Cancel
            </button>
          ) : null}
        </div>

        {form.image_url ? (
          <div
            className="mt-5 aspect-[16/9] rounded-xl border border-[#d9e4dc] bg-cover bg-center"
            style={{ backgroundImage: `url("${form.image_url}")` }}
            aria-label="Category image preview"
          />
        ) : (
          <div className="mt-5 flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-[#c9d8ce] bg-primary-soft text-sm font-bold text-primary">
            Image preview
          </div>
        )}

        <div className="mt-5 space-y-4">
          <TextInput
            label="Category name"
            value={form.name}
            onChange={(value) => onChange({ ...form, name: value })}
            required
          />
          <TextArea
            label="Description"
            value={form.description}
            onChange={(value) => onChange({ ...form, description: value })}
          />
          <TextInput
            label="Image URL"
            value={form.image_url}
            onChange={(value) => onChange({ ...form, image_url: value })}
          />
          <TextInput
            label="Icon URL"
            value={form.icon_url}
            onChange={(value) => onChange({ ...form, icon_url: value })}
          />
          <TextInput
            label="Display order"
            type="number"
            value={form.display_order}
            onChange={(value) => onChange({ ...form, display_order: value })}
          />
          <label className="flex items-center justify-between rounded-lg border border-[#d9e4dc] px-3 py-3 text-sm font-bold text-ink/75">
            <span>Active category</span>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                onChange({ ...form, is_active: event.target.checked })
              }
              className="h-5 w-5 accent-[#0f7a3a]"
            />
          </label>
          <PrimaryButton disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : editingCategoryId
                ? "Update category"
                : "Create category"}
          </PrimaryButton>
        </div>
      </form>

      <div className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-lg shadow-[#153820]/6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black text-ink">Product categories</h2>
            <p className="mt-1 text-sm text-ink/55">
              Review category artwork, status, and operational actions.
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-lg border border-[#d9e4dc] bg-[#f7faf7] p-1 text-sm font-black">
            {[
              ["active", `Active ${categories.length}`],
              ["deleted", `Deleted ${deletedCategories.length}`],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setCategoryView(value as CategoryView);
                  setOpenMenuId(null);
                }}
                className={`h-9 rounded-md px-3 transition ${
                  categoryView === value
                    ? "bg-white text-primary shadow-sm"
                    : "text-ink/55 hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-[#e4ece6]">
          <table className="w-full text-left text-sm">
            <thead className="bg-primary-soft text-primary">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4ece6]">
              {visibleCategories.map((category) => (
                <tr key={category.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CategoryArtwork category={category} />
                      <div className="min-w-0">
                        <p className="truncate font-black text-ink">
                          {category.name}
                        </p>
                        <p className="line-clamp-1 text-xs text-ink/50">
                          {category.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{category.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        categoryView === "deleted"
                          ? "bg-red-50 text-red-700"
                          : category.is_active
                            ? "bg-primary-soft text-primary"
                            : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {categoryView === "deleted"
                        ? "Deleted"
                        : category.is_active
                          ? "Active"
                          : "Inactive"}
                    </span>
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId((current) =>
                          current === category.id ? null : category.id,
                        )
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/55 transition hover:bg-primary-soft hover:text-primary"
                      aria-label={`Open actions for ${category.name}`}
                      title="Actions"
                    >
                      <span className="text-xl leading-none">...</span>
                    </button>
                    {openMenuId === category.id ? (
                      <div className="absolute right-4 top-12 z-10 w-44 rounded-xl border border-[#d9e4dc] bg-white p-2 text-left shadow-xl shadow-[#153820]/12">
                        {categoryView === "active" ? (
                          <>
                            <ActionMenuButton
                              label="Edit category"
                              onClick={() => {
                                setOpenMenuId(null);
                                onEdit(category);
                              }}
                            />
                            <ActionMenuButton
                              label="Delete category"
                              destructive
                              onClick={() => {
                                setOpenMenuId(null);
                                onDelete(category.id);
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <ActionMenuButton
                              label="Restore category"
                              onClick={() => {
                                setOpenMenuId(null);
                                onRestore(category.id);
                              }}
                            />
                            <ActionMenuButton
                              label="Delete forever"
                              destructive
                              onClick={() => {
                                setOpenMenuId(null);
                                onPermanentDelete(category.id);
                              }}
                            />
                          </>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!visibleCategories.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink/55" colSpan={4}>
                    No {categoryView} categories found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CategoryArtwork({ category }: { category: Category }) {
  if (category.image_url) {
    return (
      <div
        className="h-14 w-14 shrink-0 rounded-xl border border-[#d9e4dc] bg-cover bg-center"
        style={{ backgroundImage: `url("${category.image_url}")` }}
        aria-label={`${category.name} image`}
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#d9e4dc] bg-primary-soft text-lg font-black text-primary">
      {category.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function ActionMenuButton({
  label,
  onClick,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block h-9 w-full rounded-lg px-3 text-left text-sm font-bold transition ${
        destructive
          ? "text-red-700 hover:bg-red-50"
          : "text-ink/75 hover:bg-primary-soft hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function ProductsPanel({
  categories,
  form,
  products,
  isSaving,
  onChange,
  onSubmit,
}: {
  categories: Category[];
  form: typeof emptyProductForm;
  products: Product[];
  isSaving: boolean;
  onChange: (value: typeof emptyProductForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-lg shadow-[#153820]/6"
      >
        <h2 className="text-xl font-black text-ink">Add product</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Category"
            value={form.category_id}
            onChange={(value) => onChange({ ...form, category_id: value })}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="SKU"
            value={form.sku}
            onChange={(value) => onChange({ ...form, sku: value })}
            required
          />
          <TextInput
            label="Title"
            value={form.title}
            onChange={(value) => onChange({ ...form, title: value })}
            required
          />
          <TextInput
            label="Price"
            type="number"
            value={form.price}
            onChange={(value) => onChange({ ...form, price: value })}
            required
          />
          <TextInput
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={(value) => onChange({ ...form, quantity: value })}
          />
          <TextInput
            label="Image URL"
            value={form.thumbnail_url}
            onChange={(value) => onChange({ ...form, thumbnail_url: value })}
          />
          <div className="sm:col-span-2">
            <TextInput
              label="Short description"
              value={form.short_description}
              onChange={(value) =>
                onChange({ ...form, short_description: value })
              }
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea
              label="Description"
              value={form.description}
              onChange={(value) => onChange({ ...form, description: value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <PrimaryButton disabled={isSaving}>
              {isSaving ? "Saving..." : "Create product"}
            </PrimaryButton>
          </div>
        </div>
      </form>

      <ProductCategoryList products={products} />
    </section>
  );
}

function OrdersPanel({
  orders,
  onUpdateStatus,
}: {
  orders: Order[];
  onUpdateStatus: (orderID: number, status: OrderStatus) => void;
}) {
  return <OrderTracker orders={orders} onUpdateStatus={onUpdateStatus} />;
}

function ProductCategoryList({ products }: { products: Product[] }) {
  return (
    <div className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-lg shadow-[#153820]/6">
      <h2 className="text-xl font-black text-ink">Products by category</h2>
      <div className="mt-5 overflow-hidden rounded-xl border border-[#e4ece6]">
        <table className="w-full text-left text-sm">
          <thead className="bg-primary-soft text-primary">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4ece6]">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-bold text-ink">
                  {product.title}
                </td>
                <td className="px-4 py-3 text-ink/60">{product.sku}</td>
                <td className="px-4 py-3 text-ink/60">{product.quantity}</td>
                <td className="px-4 py-3 text-ink/60">
                  {currency(product.final_price ?? product.price)}
                </td>
              </tr>
            ))}
            {!products.length ? (
              <tr>
                <td className="px-4 py-6 text-ink/55" colSpan={4}>
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderTracker({
  orders,
  onUpdateStatus,
  compact = false,
}: {
  orders: Order[];
  onUpdateStatus: ((orderID: number, status: OrderStatus) => void) | null;
  compact?: boolean;
}) {
  const visibleOrders = compact ? orders.slice(0, 5) : orders;

  return (
    <div className="rounded-2xl border border-[#d9e4dc] bg-white p-6 shadow-lg shadow-[#153820]/6">
      <h2 className="text-xl font-black text-ink">Customer order tracking</h2>
      <div className="mt-5 overflow-hidden rounded-xl border border-[#e4ece6]">
        <table className="w-full text-left text-sm">
          <thead className="bg-primary-soft text-primary">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4ece6]">
            {visibleOrders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-bold text-ink">#{order.id}</td>
                <td className="px-4 py-3 text-ink/60">
                  {order.address?.full_name ?? `Customer ${order.customer_id}`}
                </td>
                <td className="px-4 py-3 text-ink/60">
                  {currency(order.total)}
                </td>
                <td className="px-4 py-3">
                  {onUpdateStatus ? (
                    <select
                      value={order.status}
                      onChange={(event) =>
                        onUpdateStatus(
                          order.id,
                          event.target.value as OrderStatus,
                        )
                      }
                      className="h-9 rounded-lg border border-[#d9e4dc] bg-white px-3 text-sm font-bold text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                      {order.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!visibleOrders.length ? (
              <tr>
                <td className="px-4 py-6 text-ink/55" colSpan={4}>
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-bold text-ink/75">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-11 w-full rounded-lg border border-[#d9e4dc] bg-white px-3 text-base text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-bold text-ink/75">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={4}
        className="w-full resize-none rounded-lg border border-[#d9e4dc] bg-white px-3 py-3 text-base text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  children,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-bold text-ink/75">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-11 w-full rounded-lg border border-[#d9e4dc] bg-white px-3 text-base text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
      >
        {children}
      </select>
    </label>
  );
}

function PrimaryButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-11 w-full rounded-lg bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-[#0b6830] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
    </button>
  );
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
