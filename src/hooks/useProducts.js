import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiMessage } from "../api/client";

export default function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  const refresh = useCallback(async ({ background = false } = {}) => {
    background ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const response = await api.get("/products", { params: { pageSize: 100 } });
      if (mounted.current) setProducts(response.data.data);
      return response.data.data;
    } catch (caught) {
      if (mounted.current) setError(apiMessage(caught));
      throw caught;
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh().catch(() => undefined);
    const onFocus = () => refresh({ background: true }).catch(() => undefined);
    window.addEventListener("focus", onFocus);
    return () => { mounted.current = false; window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  return { products, loading, refreshing, error, refresh };
}
