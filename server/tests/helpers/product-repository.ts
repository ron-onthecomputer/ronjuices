import type {
  Product,
  ProductListFilters,
  ProductRepository,
} from "../../src/modules/products/product.types.js";

export const availableProduct: Product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "cranberry",
  name: "CRANBERRY BLAST",
  description: "Tart, refreshing, antioxidant-rich",
  volumeMl: 500,
  priceCents: 700,
  currency: "USD",
  image: {
    alt: "Cranberry Blast can",
    fallbackSrc: "/images/cranberryCan.png",
    webpSrc: "/images/optimized/cranberryCan.webp",
    avifSrc: "/images/optimized/cranberryCan.avif",
    width: 800,
    height: 1200,
  },
  stockQuantity: 3,
  lowStockThreshold: 5,
  isActive: true,
  isFeatured: true,
  isAvailable: true,
  accentColor: "#960006",
  backgroundColor: "#960006",
};

export class FakeProductRepository implements ProductRepository {
  constructor(private readonly products: Product[] = [availableProduct]) {}

  async list(_filters: ProductListFilters) {
    return { products: this.products, total: this.products.length };
  }

  async findBySlug(slug: string) {
    return this.products.find((product) => product.slug === slug) ?? null;
  }

  async findByIds(ids: string[]) {
    return this.products.filter((product) => ids.includes(product.id));
  }

  async adminList() {
    return this.products;
  }
  async create(input: Omit<Product, "id" | "isAvailable">) {
    return {
      ...input,
      id: crypto.randomUUID(),
      isAvailable: input.isActive && input.stockQuantity > 0,
    };
  }
  async update(
    id: string,
    input: Partial<Omit<Product, "id" | "isAvailable">>,
  ) {
    const product = this.products.find((item) => item.id === id);
    return product
      ? {
          ...product,
          ...input,
          isAvailable:
            (input.isActive ?? product.isActive) &&
            (input.stockQuantity ?? product.stockQuantity) > 0,
        }
      : null;
  }
  async delete(id: string) {
    const index = this.products.findIndex((product) => product.id === id);
    if (index === -1) return "not_found" as const;
    this.products.splice(index, 1);
    return "deleted" as const;
  }
}
