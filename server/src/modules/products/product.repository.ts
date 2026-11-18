import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "../../db/pool.js";
import type {
  Currency,
  Product,
  ProductDeleteResult,
  ProductListFilters,
  ProductRepository,
  ProductWriteInput,
} from "./product.types.js";

type ProductRow = QueryResultRow & {
  id: string;
  slug: string;
  name: string;
  description: string;
  volume_ml: number;
  price_cents: number;
  currency: Currency;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_featured: boolean;
  accent_color: string;
  background_color: string;
  alt_text: string;
  fallback_url: string;
  webp_url: string;
  avif_url: string;
  width: number;
  height: number;
  total_count?: string;
};

const productColumns = `
  p.id, p.slug, p.name, p.description, p.volume_ml, p.price_cents,
  p.currency, p.stock_quantity, p.low_stock_threshold, p.is_active,
  p.is_featured, p.accent_color, p.background_color,
  image.alt_text, image.fallback_url, image.webp_url, image.avif_url,
  image.width, image.height
`;

const primaryImageJoin = `
  JOIN LATERAL (
    SELECT alt_text, fallback_url, webp_url, avif_url, width, height
    FROM product_images
    WHERE product_id = p.id
    ORDER BY sort_order
    LIMIT 1
  ) image ON TRUE
`;

const sortSql: Record<ProductListFilters["sort"], string> = {
  featured: "p.is_featured DESC, p.name ASC",
  "price-asc": "p.price_cents ASC, p.name ASC",
  "price-desc": "p.price_cents DESC, p.name ASC",
  "name-asc": "p.name ASC",
  "name-desc": "p.name DESC",
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    volumeMl: row.volume_ml,
    priceCents: row.price_cents,
    currency: row.currency,
    image: {
      alt: row.alt_text,
      fallbackSrc: row.fallback_url,
      webpSrc: row.webp_url,
      avifSrc: row.avif_url,
      width: row.width,
      height: row.height,
    },
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    isAvailable: row.is_active && row.stock_quantity > 0,
    accentColor: row.accent_color,
    backgroundColor: row.background_color,
  };
}

export function createProductRepository(): ProductRepository {
  const findAdminById = async (id: string): Promise<Product | null> => {
    const result = await getPool().query<ProductRow>(
      `SELECT ${productColumns} FROM products p ${primaryImageJoin} WHERE p.id = $1`,
      [id],
    );
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  };

  const saveImage = async (
    client: PoolClient,
    productId: string,
    image: ProductWriteInput["image"],
  ) => {
    await client.query(
      `INSERT INTO product_images (product_id, alt_text, fallback_url, webp_url, avif_url, width, height, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0)
       ON CONFLICT (product_id, sort_order) DO UPDATE SET alt_text=$2, fallback_url=$3,
         webp_url=$4, avif_url=$5, width=$6, height=$7`,
      [
        productId,
        image.alt,
        image.fallbackSrc,
        image.webpSrc,
        image.avifSrc,
        image.width,
        image.height,
      ],
    );
  };

  return {
    async list(filters) {
      const conditions = ["p.is_active = TRUE"];
      const values: unknown[] = [];

      if (filters.search) {
        values.push(`%${filters.search}%`);
        conditions.push(
          `(p.name ILIKE $${values.length} OR p.description ILIKE $${values.length})`,
        );
      }
      if (filters.availability === "available")
        conditions.push("p.stock_quantity > 0");
      if (filters.availability === "unavailable")
        conditions.push("p.stock_quantity = 0");
      if (filters.featured !== undefined) {
        values.push(filters.featured);
        conditions.push(`p.is_featured = $${values.length}`);
      }

      values.push(filters.pageSize, (filters.page - 1) * filters.pageSize);
      const limitPosition = values.length - 1;
      const offsetPosition = values.length;
      const result = await getPool().query<ProductRow>(
        `SELECT ${productColumns}, COUNT(*) OVER() AS total_count
         FROM products p
         ${primaryImageJoin}
         WHERE ${conditions.join(" AND ")}
         ORDER BY ${sortSql[filters.sort]}
         LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
        values,
      );

      return {
        products: result.rows.map(mapProduct),
        total: Number(result.rows[0]?.total_count ?? 0),
      };
    },

    async findBySlug(slug) {
      const result = await getPool().query<ProductRow>(
        `SELECT ${productColumns}
         FROM products p
         ${primaryImageJoin}
         WHERE p.slug = $1 AND p.is_active = TRUE`,
        [slug],
      );
      return result.rows[0] ? mapProduct(result.rows[0]) : null;
    },

    async findByIds(ids) {
      if (ids.length === 0) return [];
      const result = await getPool().query<ProductRow>(
        `SELECT ${productColumns}
         FROM products p
         ${primaryImageJoin}
         WHERE p.id = ANY($1::uuid[])`,
        [ids],
      );
      return result.rows.map(mapProduct);
    },

    async adminList() {
      const result = await getPool().query<ProductRow>(
        `SELECT ${productColumns} FROM products p ${primaryImageJoin} ORDER BY p.name`,
      );
      return result.rows.map(mapProduct);
    },

    async create(input) {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<{ id: string }>(
          `INSERT INTO products (slug,name,description,volume_ml,price_cents,currency,stock_quantity,
             low_stock_threshold,is_active,is_featured,accent_color,background_color)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [
            input.slug,
            input.name,
            input.description,
            input.volumeMl,
            input.priceCents,
            input.currency,
            input.stockQuantity,
            input.lowStockThreshold,
            input.isActive,
            input.isFeatured,
            input.accentColor,
            input.backgroundColor,
          ],
        );
        const id = result.rows[0]!.id;
        await saveImage(client, id, input.image);
        await client.query("COMMIT");
        return (await findAdminById(id))!;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async update(id, input) {
      const current = await findAdminById(id);
      if (!current) return null;
      const next = {
        ...current,
        ...input,
        image: input.image ?? current.image,
      };
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `UPDATE products SET slug=$2,name=$3,description=$4,volume_ml=$5,price_cents=$6,currency=$7,
             stock_quantity=$8,low_stock_threshold=$9,is_active=$10,is_featured=$11,
             accent_color=$12,background_color=$13 WHERE id=$1`,
          [
            id,
            next.slug,
            next.name,
            next.description,
            next.volumeMl,
            next.priceCents,
            next.currency,
            next.stockQuantity,
            next.lowStockThreshold,
            next.isActive,
            next.isFeatured,
            next.accentColor,
            next.backgroundColor,
          ],
        );
        await saveImage(client, id, next.image);
        await client.query("COMMIT");
        return (await findAdminById(id))!;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async delete(id): Promise<ProductDeleteResult> {
      try {
        const result = await getPool().query(
          "DELETE FROM products WHERE id = $1 RETURNING id",
          [id],
        );
        return result.rowCount === 0 ? "not_found" : "deleted";
      } catch (error) {
        if ((error as { code?: string }).code === "23503") return "in_use";
        throw error;
      }
    },
  };
}
