import { createContext, useContext, useEffect, useMemo } from "react";
import useProducts from "../hooks/useProducts";
import useCartStore from "../stores/useCartStore";

const CatalogContext = createContext(null);

export function ProductCatalogProvider({ children }) {
  const catalog = useProducts();
  const revalidate = useCartStore((state) => state.revalidate);
  useEffect(() => { if (catalog.products.length) revalidate(catalog.products); }, [catalog.products, revalidate]);
  const value = useMemo(() => ({ ...catalog, byId: new Map(catalog.products.map((item) => [item.id, item])) }), [catalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useProductCatalog = () => useContext(CatalogContext);
