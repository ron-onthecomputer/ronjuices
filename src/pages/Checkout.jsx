import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api, apiMessage } from "../api/client";
import { useProductCatalog } from "../contexts/ProductCatalog";
import useCartStore from "../stores/useCartStore";
import { formatUsdCents } from "../utils/currency";

const empty = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  line1: "",
  line2: "",
  suburb: "",
  city: "",
  province: "",
  postalCode: "",
  country: "ZW",
  customerNote: "",
};
const saved = (() => {
  try {
    return (
      JSON.parse(sessionStorage.getItem("ronjuices-checkout") || "null") ||
      empty
    );
  } catch {
    return empty;
  }
})();
const key = () => crypto.randomUUID();

const requiredMessage = "This field is required.";
const checkoutSchema = z.object({
  firstName: z.string().trim().min(1, requiredMessage),
  lastName: z.string().trim().min(1, requiredMessage),
  email: z
    .string()
    .trim()
    .min(1, requiredMessage)
    .email("Enter a valid email address."),
  phone: z.string().trim().min(1, requiredMessage),
  line1: z.string().trim().min(1, requiredMessage),
  line2: z.string(),
  suburb: z.string().trim().min(1, requiredMessage),
  city: z.string().trim().min(1, requiredMessage),
  province: z.string().trim().min(1, requiredMessage),
  postalCode: z.string().trim().min(1, requiredMessage),
  country: z.string().trim().length(2, "Use a 2-letter country code."),
  customerNote: z.string(),
});

const fieldClass = (hasError) =>
  `mt-1 min-h-11 w-full border p-3 outline-none transition-all duration-300 focus:ring-2 ${
    hasError
      ? "border-red-600 focus-ring-2 focus:border-red-600 focus:ring-red-600"
      : "focus:border-[#3E0162] focus:ring-2 focus:ring-[#3E0162]"
  }`;

export default function Checkout() {
  const items = useCartStore((state) => state.items);
  const { byId, refresh } = useProductCatalog();
  const [form, setForm] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const resolved = useMemo(
    () =>
      items.flatMap((item) =>
        byId.has(item.productId)
          ? [{ ...item, product: byId.get(item.productId) }]
          : [],
      ),
    [items, byId],
  );
  const total = resolved.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0,
  );
  const change = ({ target }) => {
    const next = { ...form, [target.name]: target.value };
    setForm(next);
    if (fieldErrors[target.name]) {
      const issue = checkoutSchema
        .safeParse(next)
        .error?.issues.find(({ path }) => path[0] === target.name);
      setFieldErrors((current) => ({
        ...current,
        [target.name]: issue?.message,
      }));
    }
    sessionStorage.setItem("ronjuices-checkout", JSON.stringify(next));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach((issue) => {
        const name = issue.path[0];
        if (name && !errors[name]) errors[name] = issue.message;
      });
      setFieldErrors(errors);
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      await refresh({ background: true });
      const cart = await api.post("/cart/validate", { items });
      if (!cart.data.data.isValid)
        throw new Error(
          "Your basket changed. Review availability and try again.",
        );
      const orderKey = key();
      const order = await api.post(
        "/orders",
        {
          customer: {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
          },
          deliveryAddress: {
            recipientName: `${form.firstName} ${form.lastName}`,
            line1: form.line1,
            line2: form.line2 || undefined,
            suburb: form.suburb,
            city: form.city,
            province: form.province,
            postalCode: form.postalCode,
            country: form.country,
          },
          customerNote: form.customerNote || undefined,
          items,
        },
        { headers: { "Idempotency-Key": orderKey } },
      );
      const payment = await api.post(
        "/payments/paynow/initiate",
        { orderId: order.data.data.id },
        { headers: { "Idempotency-Key": key() } },
      );
      sessionStorage.setItem(
        "ronjuices-payment",
        JSON.stringify({
          paymentId: payment.data.data.id,
          orderNumber: order.data.data.orderNumber,
        }),
      );
      if (!payment.data.data.redirectUrl)
        throw new Error("Paynow did not provide a payment URL.");
      window.location.assign(payment.data.data.redirectUrl);
    } catch (caught) {
      setError(apiMessage(caught));
      setBusy(false);
    }
  };

  if (!items.length)
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 pt-32">
        <h1 className="bagerich text-4xl text-[#3E0162]">
          Your basket is empty
        </h1>
        <Link
          to="/#products"
          className="mt-6 items-center inline-block underline decoration-dashed "
        >
          Browse catalogue
          <i className="bi bi-arrow-right text-lg" aria-hidden="true"></i>
        </Link>
      </main>
    );
  return (
    <main className="mx-auto grot  min-h-screen max-w-6xl px-6 pb-20 pt-28">
      <Link to="/#products" className="text-sm underline">
        ← Continue shopping
      </Link>
      <h1 className="mt-5 bagerich text-5xl text-[#3E0162]">Guest checkout</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <form
          id="checkout-form"
          onSubmit={submit}
          noValidate
          className="grid gap-4 rounded bg-[#fdfcfc]  p-6"
          aria-describedby="checkout-status"
        >
          <h2 className="text-xl font-semibold">Contact and delivery</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["firstName", "First name"],
              ["lastName", "Last name"],
              ["email", "Email", "email"],
              ["phone", "Phone", "tel"],
              ["line1", "Address line 1"],
              ["line2", "Address line 2"],
              ["suburb", "Suburb"],
              ["city", "City"],
              ["province", "Province"],
              ["postalCode", "Postal code"],
            ].map(([name, label, type]) => (
              <label key={name} className="text-sm">
                {label}
                {name !== "line2" && (
                  <span className="ml-1 text-red-600" aria-hidden="true">
                    *
                  </span>
                )}
                <input
                  id={name}
                  className={fieldClass(Boolean(fieldErrors[name]))}
                  name={name}
                  type={type || "text"}
                  value={form[name]}
                  onChange={change}
                  required={!["line2"].includes(name)}
                  aria-invalid={Boolean(fieldErrors[name])}
                  aria-describedby={
                    fieldErrors[name] ? `${name}-error` : undefined
                  }
                />
                {fieldErrors[name] && (
                  <span
                    id={`${name}-error`}
                    className="mt-1 block text-xs text-red-700"
                  >
                    {fieldErrors[name]}
                  </span>
                )}
              </label>
            ))}
            <label className="text-sm">
              Country code
              <span className="ml-1 text-red-600" aria-hidden="true">
                *
              </span>
              <input
                id="country"
                className={fieldClass(Boolean(fieldErrors.country))}
                name="country"
                value={form.country}
                onChange={change}
                maxLength="2"
                required
                aria-invalid={Boolean(fieldErrors.country)}
                aria-describedby={
                  fieldErrors.country ? "country-error" : undefined
                }
              />
              {fieldErrors.country && (
                <span
                  id="country-error"
                  className="mt-1 block text-xs text-red-700"
                >
                  {fieldErrors.country}
                </span>
              )}
            </label>
          </div>
          <label className="text-sm">
            Order note (optional)
            <textarea
              className="mt-1 w-full border p-3 outline-none transition-colors focus:border-[#3E0162] focus:ring-1 focus:ring-[#3E0162]"
              name="customerNote"
              value={form.customerNote}
              onChange={change}
            />
          </label>
        </form>

        <div className="flex h-fit flex-col gap-2">
          <aside className="h-fit rounded bg-[#fdfcfc] p-6">
            <h2 className="text-xl font-semibold">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {resolved.map((item) => (
                <li
                  key={item.productId}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span>
                    {item.quantity} × {item.product.name}
                  </span>
                  <span>
                    {formatUsdCents(item.product.priceCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-between border-t pt-4 font-bold">
              <span>Total</span>
              <span>{formatUsdCents(total)}</span>
            </div>
            <div className="flex w-full justify-between mt-5 text-sm">
              <input
                type="text"
                name="discount"
                id="discount"
                placeholder="Discount code"
                className="outline-none focus:ring-1 focus:ring-[#3E0162]"
              />
              <button className="bg-[#3E0162] text-white px-4 transition-all duration-300 hover:bg-[#3e01629d]">
                Apply
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-600">
              Final stock and server-owned prices are checked before payment.
            </p>
          </aside>
          <button
            type="submit"
            form="checkout-form"
            disabled={busy}
            className="min-h-12 bg-[#3E0162] px-6 text-white disabled:opacity-50 transition-all duration-300 hover:bg-[#3e01629d]"
          >
            {busy ? "Preparing secure payment…" : "Pay with Paynow"}
          </button>
          <p
            id="checkout-status"
            aria-live="assertive"
            className="text-sm text-red-700 text-center"
          >
            {error}
          </p>
        </div>
      </div>
    </main>
  );
}
