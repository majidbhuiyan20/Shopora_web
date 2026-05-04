"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getRevenueSummary } from "../api/analytics";
import { getAdminToken } from "../api/admin-client";
import {
  createCategory,
  deleteCategory,
  listCategories,
  listDeletedCategories,
  permanentlyDeleteCategory,
  restoreCategory,
  updateCategory,
} from "../api/categories";
import { listOrders, updateOrderStatus } from "../api/orders";
import { createProduct, listProducts } from "../api/products";
import type {
  Category,
  Order,
  OrderStatus,
  Product,
  RevenueSummary,
} from "../types";

const orderStatuses: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
];

const navigationItems = [
  { value: "overview", label: "Overview", helper: "Snapshot" },
  { value: "categories", label: "Categories", helper: "Taxonomy" },
  { value: "products", label: "Products", helper: "Inventory" },
  { value: "orders", label: "Orders", helper: "Tracking" },
] as const;

type DashboardTab = (typeof navigationItems)[number]["value"];
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
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  const stats = useMemo(
    () => [
      { label: "Categories", value: categories.length, tone: "green" },
      { label: "Products", value: products.length, tone: "ink" },
      { label: "Orders", value: orders.length, tone: "gold" },
      {
        label: "Revenue",
        value: currency(revenue?.total_revenue ?? revenue?.revenue ?? 0),
        tone: "green",
      },
    ],
    [categories.length, orders.length, products.length, revenue],
  );

  const lowStockCount = products.filter((product) => product.quantity <= 10)
    .length;
  const pendingOrderCount = orders.filter((order) => order.status === "pending")
    .length;

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      const [categoryRes, deletedRes, productRes, orderRes, revenueRes] =
        await Promise.all([
          listCategories(),
          listDeletedCategories().catch(() => ({ data: { categories: [] } })),
          listProducts(),
          listOrders(),
          getRevenueSummary(),
        ]);

      setCategories(categoryRes.data?.categories ?? []);
      setDeletedCategories(deletedRes.data?.categories ?? []);
      setProducts(productRes.data?.products ?? []);
      setOrders(orderRes.data?.orders ?? []);
      setRevenue(revenueRes.data?.summary ?? null);
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

  function openCreateCategoryDialog() {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
    setIsCategoryDialogOpen(true);
  }

  function openEditCategoryDialog(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      icon_url: category.icon_url ?? "",
      display_order: String(category.display_order ?? 0),
      is_active: category.is_active,
    });
    setIsCategoryDialogOpen(true);
    setActiveTab("categories");
    setNotice("");
    setError("");
  }

  function closeCategoryDialog() {
    setIsCategoryDialogOpen(false);
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
  }

  function openProductDialog() {
    setProductForm(emptyProductForm);
    setIsProductDialogOpen(true);
  }

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

      closeCategoryDialog();
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save category.",
      );
    } finally {
      setIsSaving(false);
    }
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
      await createProduct({
        category_id: Number(productForm.category_id),
        sku: productForm.sku,
        title: productForm.title,
        short_description: productForm.short_description,
        description: productForm.description,
        price: Number(productForm.price),
        quantity: Number(productForm.quantity || 0),
        low_stock_warning: 10,
        thumbnail_url: productForm.thumbnail_url,
      });
      setNotice("Product created successfully.");
      setProductForm(emptyProductForm);
      setIsProductDialogOpen(false);
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
      await updateOrderStatus(orderID, status, `Admin marked order as ${status}.`);
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
    <main className="min-h-screen bg-[#edf0f3] text-ink">
      <div className="flex min-h-screen">
        <Sidebar activeTab={activeTab} onChange={setActiveTab} />

        <section className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-7">
            <DashboardHeader
              activeTab={activeTab}
              lowStockCount={lowStockCount}
              pendingOrderCount={pendingOrderCount}
              onRefresh={loadDashboard}
              onCreateCategory={() => {
                setActiveTab("categories");
                openCreateCategoryDialog();
              }}
              onCreateProduct={() => {
                setActiveTab("products");
                openProductDialog();
              }}
            />

            {notice ? <Notice tone="success">{notice}</Notice> : null}
            {error ? <Notice tone="error">{error}</Notice> : null}

            {isLoading ? (
              <Panel>
                <p className="text-sm font-bold text-ink/55">
                  Loading dashboard...
                </p>
              </Panel>
            ) : null}

            {!isLoading && activeTab === "overview" ? (
              <Overview stats={stats} products={products} orders={orders} />
            ) : null}

            {!isLoading && activeTab === "categories" ? (
              <CategoriesPanel
                categories={categories}
                deletedCategories={deletedCategories}
                onCreate={openCreateCategoryDialog}
                onEdit={openEditCategoryDialog}
                onDelete={handleDeleteCategory}
                onRestore={handleRestoreCategory}
                onPermanentDelete={handlePermanentDeleteCategory}
              />
            ) : null}

            {!isLoading && activeTab === "products" ? (
              <ProductsPanel
                categories={categories}
                products={products}
                onCreate={openProductDialog}
              />
            ) : null}

            {!isLoading && activeTab === "orders" ? (
              <OrdersPanel
                orders={orders}
                onUpdateStatus={handleUpdateOrderStatus}
              />
            ) : null}
          </div>
        </section>
      </div>

      <CategoryDialog
        form={categoryForm}
        isOpen={isCategoryDialogOpen}
        isSaving={isSaving}
        isEditing={Boolean(editingCategoryId)}
        onChange={setCategoryForm}
        onClose={closeCategoryDialog}
        onSubmit={handleSubmitCategory}
      />

      <ProductDialog
        categories={categories}
        form={productForm}
        isOpen={isProductDialogOpen}
        isSaving={isSaving}
        onChange={setProductForm}
        onClose={() => setIsProductDialogOpen(false)}
        onSubmit={handleCreateProduct}
      />
    </main>
  );
}

function Sidebar({
  activeTab,
  onChange,
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 border-r border-[#dde2e8] bg-white text-[#5f6368] shadow-[8px_0_24px_rgba(20,30,40,0.04)] lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-[#eef1f4] px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef7ff] text-xl font-black text-[#0788ff]">
              S
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-normal text-[#2f3338]">
                Shopora
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a7adb5]">
                Admin Suite
              </p>
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5">
          {navigationItems.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              className={`flex w-full items-center justify-between rounded-md px-5 py-3 text-left transition ${
                activeTab === item.value
                  ? "bg-[#edf6ff] text-[#0788ff]"
                  : "text-[#666a70] hover:bg-[#f5f8fb] hover:text-[#0788ff]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-current/15 text-xs font-black">
                  {item.label.slice(0, 1)}
                </span>
                <span>
                  <span className="block text-base font-medium">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium opacity-60">
                    {item.helper}
                  </span>
                </span>
              </span>
              <span className="text-lg opacity-70">&gt;</span>
            </button>
          ))}
        </nav>

        <div className="mt-4 px-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#a7adb5]">
            Commerce
          </p>
          <div className="space-y-3 text-sm font-medium text-[#747980]">
            <p>Catalog operations</p>
            <p>Order fulfillment</p>
            <p>Revenue tracking</p>
          </div>
        </div>

        <div className="mt-auto border-t border-[#eef1f4] p-5">
          <div className="grid grid-cols-3 gap-3 text-center text-xl">
            <button className="rounded-lg bg-[#f4f7fa] py-2" type="button">
              D
            </button>
            <button className="rounded-lg bg-[#f4f7fa] py-2" type="button">
              L
            </button>
            <button className="rounded-lg bg-[#f4f7fa] py-2" type="button">
              i
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardHeader({
  activeTab,
  lowStockCount,
  pendingOrderCount,
  onRefresh,
  onCreateCategory,
  onCreateProduct,
}: {
  activeTab: DashboardTab;
  lowStockCount: number;
  pendingOrderCount: number;
  onRefresh: () => void;
  onCreateCategory: () => void;
  onCreateProduct: () => void;
}) {
  const title = navigationItems.find((item) => item.value === activeTab)?.label;

  return (
    <header className="space-y-5">
      <div className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#dde2e8] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(20,30,40,0.06)]">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl font-medium text-[#44484d] hover:bg-[#f4f7fa]"
          aria-label="Open menu"
          title="Menu"
        >
          =
        </button>
        <label className="relative hidden h-12 flex-1 items-center md:flex">
          <span className="absolute left-5 text-lg font-black text-[#777c82]">
            /
          </span>
          <input
            type="search"
            placeholder="Search"
            className="h-12 w-full rounded-full border border-[#d9dee6] bg-white pl-14 pr-5 text-base text-ink outline-none transition placeholder:text-[#9aa1aa] focus:border-[#0788ff] focus:ring-4 focus:ring-[#0788ff]/10"
          />
        </label>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <TopIcon label="Tasks" badge={lowStockCount} icon="V" />
          <TopIcon label="Apps" icon="#" />
          <TopIcon label="Orders" badge={pendingOrderCount} icon="!" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d9dee6] bg-[#f5f8fb] text-sm font-black text-primary">
            SA
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-[#dde2e8] bg-white p-6 shadow-[0_10px_24px_rgba(20,30,40,0.06)]">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.18em] text-[#0788ff]">
            Shopora Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-[#2f3338] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#666a70]">
            A clean commerce command center for categories, products, orders,
            and revenue tracking.
          </p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-[#dde2e8] bg-white p-5 shadow-[0_10px_24px_rgba(20,30,40,0.06)] sm:grid-cols-3 xl:min-w-[480px]">
          <button
            type="button"
            onClick={onCreateCategory}
            className="h-12 rounded-lg bg-[#0788ff] px-4 text-sm font-black text-white shadow-lg shadow-[#0788ff]/20 transition hover:bg-[#0574da]"
          >
            Add category
          </button>
          <button
            type="button"
            onClick={onCreateProduct}
            className="h-12 rounded-lg border border-[#0788ff]/20 bg-[#eef7ff] px-4 text-sm font-black text-[#0788ff] transition hover:bg-[#e1f0ff]"
          >
            Add product
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="h-12 rounded-lg border border-[#d9dee6] bg-white px-4 text-sm font-black text-[#666a70] transition hover:border-[#0788ff]/35 hover:text-[#0788ff]"
          >
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}

function TopIcon({
  label,
  icon,
  badge,
}: {
  label: string;
  icon: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      className="relative flex h-11 w-11 items-center justify-center rounded-lg text-xl font-black text-[#44484d] hover:bg-[#f4f7fa]"
      aria-label={label}
      title={label}
    >
      {icon}
      {badge ? (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-black text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function Overview({
  stats,
  products,
  orders,
}: {
  stats: { label: string; value: number | string; tone: string }[];
  products: Product[];
  orders: Order[];
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#dde2e8] bg-white p-6 shadow-[0_10px_24px_rgba(20,30,40,0.06)]"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-black ${
                  index === 0
                    ? "bg-[#e8f1ff] text-[#1677ff]"
                    : index === 1
                      ? "bg-[#dcf8ec] text-[#00b976]"
                      : index === 2
                        ? "bg-[#ffe7f0] text-[#ff2f75]"
                        : "bg-[#def8ff] text-[#00a5c7]"
                }`}
              >
                {item.label.slice(0, 1)}
              </div>
              <div>
                <p className="text-3xl font-semibold text-[#34383d]">
                  {item.value}
                </p>
                <p className="mt-2 text-base font-medium text-[#6d5860]">
                  {item.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <ProductTable products={products.slice(0, 6)} compact />
        <OrderTracker orders={orders} onUpdateStatus={null} compact />
      </div>
    </section>
  );
}

function CategoriesPanel({
  categories,
  deletedCategories,
  onCreate,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  categories: Category[];
  deletedCategories: Category[];
  onCreate: () => void;
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
    <Panel>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
            Category Manager
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink">
            Product categories
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
            Keep the storefront taxonomy tidy with imagery, active states, and
            recovery tools for deleted categories.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
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
                className={`h-10 rounded-md px-4 transition ${
                  categoryView === value
                    ? "bg-white text-primary shadow-sm"
                    : "text-ink/55 hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="h-12 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-[#0b6830]"
          >
            Add category
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCategories.map((category) => (
          <article
            key={category.id}
            className="group relative overflow-visible rounded-2xl border border-[#d9e4dc] bg-white shadow-lg shadow-[#153820]/5 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#153820]/10"
          >
            <CategoryHero category={category} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black text-ink">
                    {category.name}
                  </h3>
                  <p className="mt-1 truncate text-xs font-bold text-ink/45">
                    /{category.slug}
                  </p>
                </div>
                <CategoryActions
                  category={category}
                  categoryView={categoryView}
                  isOpen={openMenuId === category.id}
                  onToggle={() =>
                    setOpenMenuId((current) =>
                      current === category.id ? null : category.id,
                    )
                  }
                  onEdit={() => {
                    setOpenMenuId(null);
                    onEdit(category);
                  }}
                  onDelete={() => {
                    setOpenMenuId(null);
                    onDelete(category.id);
                  }}
                  onRestore={() => {
                    setOpenMenuId(null);
                    onRestore(category.id);
                  }}
                  onPermanentDelete={() => {
                    setOpenMenuId(null);
                    onPermanentDelete(category.id);
                  }}
                />
              </div>

              <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-ink/58">
                {category.description || "No description added yet."}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <StatusPill
                  label={
                    categoryView === "deleted"
                      ? "Deleted"
                      : category.is_active
                        ? "Active"
                        : "Inactive"
                  }
                  tone={
                    categoryView === "deleted"
                      ? "danger"
                      : category.is_active
                        ? "success"
                        : "muted"
                  }
                />
                <span className="text-xs font-black text-ink/40">
                  Order {category.display_order}
                </span>
              </div>
            </div>
          </article>
        ))}

        {!visibleCategories.length ? (
          <div className="rounded-2xl border border-dashed border-[#c9d8ce] bg-[#f7faf7] p-8 text-center md:col-span-2 xl:col-span-3">
            <p className="text-lg font-black text-ink">No categories found</p>
            <p className="mt-2 text-sm text-ink/55">
              Create your first category with polished artwork.
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function ProductsPanel({
  categories,
  products,
  onCreate,
}: {
  categories: Category[];
  products: Product[];
  onCreate: () => void;
}) {
  return (
    <section className="grid gap-5">
      <Panel>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
              Product Catalog
            </p>
            <h2 className="mt-2 text-2xl font-black text-ink">
              Products and inventory
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
              Publish products into categories, track stock, and keep customer
              facing items ready.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="h-12 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-[#0b6830]"
          >
            Add product
          </button>
        </div>
      </Panel>

      <ProductTable products={products} categories={categories} />
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

function CategoryDialog({
  form,
  isOpen,
  isSaving,
  isEditing,
  onChange,
  onClose,
  onSubmit,
}: {
  form: typeof emptyCategoryForm;
  isOpen: boolean;
  isSaving: boolean;
  isEditing: boolean;
  onChange: (value: typeof emptyCategoryForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      title={isEditing ? "Edit category" : "Create category"}
      description="Use visual artwork and clean metadata for a storefront-ready category."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="grid gap-5">
        {form.image_url ? (
          <div
            className="aspect-[16/7] rounded-xl border border-[#d9e4dc] bg-cover bg-center"
            style={{ backgroundImage: `url("${form.image_url}")` }}
            aria-label="Category image preview"
          />
        ) : (
          <div className="flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-[#c9d8ce] bg-primary-soft text-sm font-black text-primary">
            Category image preview
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Category name"
            value={form.name}
            onChange={(value) => onChange({ ...form, name: value })}
            required
          />
          <TextInput
            label="Display order"
            type="number"
            value={form.display_order}
            onChange={(value) => onChange({ ...form, display_order: value })}
          />
          <div className="sm:col-span-2">
            <TextArea
              label="Description"
              value={form.description}
              onChange={(value) => onChange({ ...form, description: value })}
            />
          </div>
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
        </div>

        <label className="flex items-center justify-between rounded-lg border border-[#d9e4dc] px-4 py-3 text-sm font-black text-ink/75">
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

        <DialogActions onClose={onClose}>
          <PrimaryButton disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Update category"
                : "Create category"}
          </PrimaryButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ProductDialog({
  categories,
  form,
  isOpen,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: {
  categories: Category[];
  form: typeof emptyProductForm;
  isOpen: boolean;
  isSaving: boolean;
  onChange: (value: typeof emptyProductForm) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      title="Create product"
      description="Add a product with category, inventory, pricing, and a hero image."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="grid gap-5">
        {form.thumbnail_url ? (
          <div
            className="aspect-[16/7] rounded-xl border border-[#d9e4dc] bg-cover bg-center"
            style={{ backgroundImage: `url("${form.thumbnail_url}")` }}
            aria-label="Product image preview"
          />
        ) : (
          <div className="flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-[#c9d8ce] bg-primary-soft text-sm font-black text-primary">
            Product image preview
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <DialogActions onClose={onClose}>
          <PrimaryButton disabled={isSaving}>
            {isSaving ? "Saving..." : "Create product"}
          </PrimaryButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function Dialog({
  isOpen,
  title,
  description,
  children,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d9e4dc] bg-white shadow-2xl shadow-black/25">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-[#e4ece6] bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-ink">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-ink/55">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d9e4dc] text-xl font-black text-ink/55 transition hover:border-primary/35 hover:text-primary"
            aria-label="Close dialog"
            title="Close"
          >
            x
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function DialogActions({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="grid gap-3 border-t border-[#e4ece6] pt-5 sm:grid-cols-[1fr_1.2fr]">
      <button
        type="button"
        onClick={onClose}
        className="h-11 rounded-lg border border-[#d9e4dc] px-5 text-sm font-black text-ink/65 transition hover:border-primary/35 hover:text-primary"
      >
        Cancel
      </button>
      {children}
    </div>
  );
}

function ProductTable({
  products,
  categories = [],
  compact = false,
}: {
  products: Product[];
  categories?: Category[];
  compact?: boolean;
}) {
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-ink">
            {compact ? "Recent products" : "Product catalog"}
          </h2>
          <p className="mt-1 text-sm text-ink/55">
            Product, category, stock, and price at a glance.
          </p>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-[#e4ece6]">
        <table className="w-full text-left text-sm">
          <thead className="bg-primary-soft text-primary">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4ece6]">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProductArtwork product={product} />
                    <div className="min-w-0">
                      <p className="truncate font-black text-ink">
                        {product.title}
                      </p>
                      <p className="truncate text-xs font-bold text-ink/45">
                        {product.sku}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink/60">
                  {product.category_id
                    ? categoryNames.get(product.category_id) ?? "Unmapped"
                    : "Unmapped"}
                </td>
                <td className="px-4 py-3">
                  <StatusPill
                    label={String(product.quantity)}
                    tone={product.quantity <= 10 ? "danger" : "success"}
                  />
                </td>
                <td className="px-4 py-3 font-bold text-ink/70">
                  {currency(product.final_price ?? product.price)}
                </td>
              </tr>
            ))}
            {!products.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-ink/55" colSpan={4}>
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
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
    <Panel>
      <h2 className="text-xl font-black text-ink">Customer order tracking</h2>
      <p className="mt-1 text-sm text-ink/55">
        Monitor customer orders and move them through fulfillment.
      </p>
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
                <td className="px-4 py-3 font-black text-ink">#{order.id}</td>
                <td className="px-4 py-3 text-ink/60">
                  {order.address?.full_name ?? `Customer ${order.customer_id}`}
                </td>
                <td className="px-4 py-3 font-bold text-ink/70">
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
                    <StatusPill label={order.status} tone="success" />
                  )}
                </td>
              </tr>
            ))}
            {!visibleOrders.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-ink/55" colSpan={4}>
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CategoryHero({ category }: { category: Category }) {
  if (category.image_url) {
    return (
      <div
        className="h-36 rounded-t-2xl bg-cover bg-center"
        style={{ backgroundImage: `url("${category.image_url}")` }}
        aria-label={`${category.name} category image`}
      />
    );
  }

  return (
    <div className="flex h-36 items-center justify-center rounded-t-2xl bg-primary-soft text-4xl font-black text-primary">
      {category.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function CategoryActions({
  category,
  categoryView,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  category: Category;
  categoryView: CategoryView;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink/55 transition hover:bg-primary-soft hover:text-primary"
        aria-label={`Open actions for ${category.name}`}
        title="Actions"
      >
        <span className="text-xl leading-none">...</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#d9e4dc] bg-white p-2 text-left shadow-xl shadow-[#153820]/12">
          {categoryView === "active" ? (
            <>
              <ActionMenuButton label="Edit category" onClick={onEdit} />
              <ActionMenuButton
                label="Delete category"
                destructive
                onClick={onDelete}
              />
            </>
          ) : (
            <>
              <ActionMenuButton label="Restore category" onClick={onRestore} />
              <ActionMenuButton
                label="Delete forever"
                destructive
                onClick={onPermanentDelete}
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProductArtwork({ product }: { product: Product }) {
  if (product.thumbnail_url) {
    return (
      <div
        className="h-12 w-12 shrink-0 rounded-xl border border-[#d9e4dc] bg-cover bg-center"
        style={{ backgroundImage: `url("${product.thumbnail_url}")` }}
        aria-label={`${product.title} image`}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d9e4dc] bg-primary-soft text-base font-black text-primary">
      {product.title.slice(0, 1).toUpperCase()}
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

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "danger" | "muted";
}) {
  const styles = {
    success: "bg-primary-soft text-primary",
    danger: "bg-red-50 text-red-700",
    muted: "bg-zinc-100 text-zinc-600",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[tone]}`}>
      {label}
    </span>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#dde2e8] bg-white p-6 shadow-[0_10px_24px_rgba(20,30,40,0.06)]">
      {children}
    </div>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "error";
}) {
  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm font-black ${
        tone === "success"
          ? "bg-primary-soft text-primary"
          : "bg-red-50 text-red-700"
      }`}
    >
      {children}
    </p>
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
