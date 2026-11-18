import { create } from "zustand";
import { persist } from "zustand/middleware";

const normalizeQuantity = (quantity) =>
  Math.max(1, Math.floor(Number(quantity) || 1));

const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      currency: "USD",
      setCurrency: (currency) =>
        set({ currency: currency === "ZWG" ? "ZWG" : "USD" }),
      addItem: (product, quantity = 1) =>
        set((state) => {
          const requestedQuantity = normalizeQuantity(quantity);
          const stockLimit = Number.isFinite(product.stockQuantity)
            ? Math.max(0, product.stockQuantity)
            : Number.POSITIVE_INFINITY;
          const existingItem = state.items.find(
            (item) => item.productId === product.id
          );
          const nextQuantity = Math.min(
            (existingItem?.quantity ?? 0) + requestedQuantity,
            stockLimit
          );

          if (nextQuantity < 1) return state;

          const cartItem = { productId: product.id, quantity: nextQuantity };

          return {
            items: existingItem
              ? state.items.map((item) =>
                  item.productId === product.id ? cartItem : item
                )
              : [...state.items, cartItem],
          };
        }),
      setItemQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.productId !== productId) return item;

            return {
              ...item,
              quantity: normalizeQuantity(quantity),
            };
          }),
        })),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        })),
      clearCart: () => set({ items: [] }),
      revalidate: (products) => set((state) => {
        const byId = new Map(products.map((product) => [product.id, product]));
        return { items: state.items.flatMap((item) => {
          const product = byId.get(item.productId);
          if (!product?.isAvailable) return [];
          return [{ productId: item.productId, quantity: Math.min(item.quantity, product.stockQuantity) }];
        }) };
      }),
    }),
    {
      name: "ronjuices-cart",
      version: 3,
      migrate: (persistedState) => ({
        ...persistedState,
        currency: persistedState?.currency === "ZWG" ? "ZWG" : "USD",
        items: (persistedState?.items ?? []).filter((item) => item.productId && item.quantity > 0)
          .map(({ productId, quantity }) => ({ productId, quantity })),
      }),
      partialize: (state) => ({ items: state.items.map(({ productId, quantity }) => ({ productId, quantity })) }),
    }
  )
);

export const selectCartCount = (state) =>
  state.items.reduce((total, item) => total + item.quantity, 0);

export default useCartStore;
