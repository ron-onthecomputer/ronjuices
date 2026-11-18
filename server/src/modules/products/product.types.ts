export type Currency = "USD" | "ZWG";

export type ProductImage = {
  alt: string;
  fallbackSrc: string;
  webpSrc: string;
  avifSrc: string;
  width: number;
  height: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  volumeMl: number;
  priceCents: number;
  currency: Currency;
  image: ProductImage;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  isAvailable: boolean;
  accentColor: string;
  backgroundColor: string;
};

export type ProductListFilters = {
  search?: string | undefined;
  availability?: "available" | "unavailable" | undefined;
  featured?: boolean | undefined;
  sort: "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
  page: number;
  pageSize: number;
};

export type ProductWriteInput = Omit<Product, "id" | "isAvailable">;

export type ProductDeleteResult = "deleted" | "not_found" | "in_use";

export interface ProductRepository {
  list(
    filters: ProductListFilters,
  ): Promise<{ products: Product[]; total: number }>;
  findBySlug(slug: string): Promise<Product | null>;
  findByIds(ids: string[]): Promise<Product[]>;
  adminList(): Promise<Product[]>;
  create(input: ProductWriteInput): Promise<Product>;
  update(
    id: string,
    input: Partial<ProductWriteInput>,
  ): Promise<Product | null>;
  delete(id: string): Promise<ProductDeleteResult>;
}
