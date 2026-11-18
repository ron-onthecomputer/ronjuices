import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiMessage } from "../api/client";
import useCartStore from "../stores/useCartStore";

export default function PaymentReturn() {
  const [state, setState] = useState({ status: "checking", message: "Confirming your payment…" });
  const clearCart = useCartStore((value) => value.clearCart);
  const pending = (() => { try { return JSON.parse(sessionStorage.getItem("ronjuices-payment") || "null"); } catch { return null; } })();
  useEffect(() => {
    if (!pending?.paymentId) { setState({ status: "missing", message: "We could not find a pending payment in this browser." }); return; }
    let cancelled = false; let attempts = 0;
    const poll = async () => {
      try {
        const response = await api.get(`/payments/${pending.paymentId}/status`);
        if (cancelled) return;
        const payment = response.data.data;
        if (payment.status === "paid") { clearCart(); sessionStorage.removeItem("ronjuices-payment"); sessionStorage.removeItem("ronjuices-checkout"); setState({ status: "paid", message: "Payment received. Your order is confirmed." }); return; }
        if (["failed", "cancelled"].includes(payment.status)) { setState({ status: payment.status, message: payment.failureReason || "Payment was not completed. Your checkout details have been kept." }); return; }
        if (++attempts < 12) setTimeout(poll, 2500); else setState({ status: "pending", message: "Payment is still pending. You can look up the order again shortly." });
      } catch (error) { setState({ status: "error", message: apiMessage(error) }); }
    };
    poll(); return () => { cancelled = true; };
  }, [clearCart, pending?.paymentId]);
  return <main className="mx-auto min-h-screen max-w-2xl px-6 pt-36 text-center"><p className="text-sm uppercase tracking-widest text-[#6847A2]">Payment status</p><h1 className="mt-4 bagerich text-5xl text-[#3E0162]">{state.status === "paid" ? "Thank you!" : "Your order"}</h1><p className="mt-5" aria-live="polite">{state.message}</p>{pending?.orderNumber && <p className="mt-3 font-mono">{pending.orderNumber}</p>}<div className="mt-8 flex justify-center gap-5"><Link to="/orders" className="underline">Look up an order</Link><Link to="/" className="underline">Back to shop</Link></div></main>;
}
