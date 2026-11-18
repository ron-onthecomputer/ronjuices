import type { ProductRepository } from "../products/product.types.js";

export type CartInput = { productId: string; quantity: number };

export async function validateCart(repository: ProductRepository, items: CartInput[]) {
  const products = await repository.findByIds(items.map((item) => item.productId));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const currencies = new Set(products.map((product) => product.currency));
  const hasMixedCurrencies = currencies.size > 1;
  let subtotalCents = 0;

  const validatedItems = items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) {
      return {
        productId: item.productId,
        requestedQuantity: item.quantity,
        allowedQuantity: 0,
        isAvailable: false,
        issue: "PRODUCT_NOT_FOUND" as const,
        lineTotalCents: 0,
      };
    }

    const allowedQuantity = product.isAvailable
      ? Math.min(item.quantity, product.stockQuantity)
      : 0;
    const issue = !product.isAvailable
      ? ("UNAVAILABLE" as const)
      : item.quantity > product.stockQuantity
        ? ("INSUFFICIENT_STOCK" as const)
        : null;
    const lineTotalCents = issue || hasMixedCurrencies ? 0 : product.priceCents * item.quantity;
    subtotalCents += lineTotalCents;

    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      unitPriceCents: product.priceCents,
      currency: product.currency,
      requestedQuantity: item.quantity,
      allowedQuantity,
      isAvailable: product.isAvailable,
      issue,
      lineTotalCents,
    };
  });

  return {
    items: validatedItems,
    subtotalCents: hasMixedCurrencies ? 0 : subtotalCents,
    currency: hasMixedCurrencies ? null : (products[0]?.currency ?? "USD"),
    issue: hasMixedCurrencies ? ("MIXED_CURRENCY" as const) : null,
    isValid:
      !hasMixedCurrencies && validatedItems.every((item) => item.issue === null),
  };
}
