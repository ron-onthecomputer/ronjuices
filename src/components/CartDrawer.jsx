import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import useCartStore, { selectCartCount } from "../stores/useCartStore";
import { formatUsdCents, USD_TO_ZWG_RATE } from "../utils/currency";

const CartDrawer = ({ isOpen, onClose, onCheckout, productsById }) => {
  const closeButtonRef = useRef(null);
  const items = useCartStore((state) => state.items);
  const cartCount = useCartStore(selectCartCount);
  const setItemQuantity = useCartStore((state) => state.setItemQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const currency = useCartStore((state) => state.currency);
  const setCurrency = useCartStore((state) => state.setCurrency);
  const resolvedItems = items.flatMap((item) => {
    const product = productsById.get(item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const subtotalCents = resolvedItems.reduce(
    (total, item) => total + item.product.priceCents * item.quantity,
    0,
  );
  const totalCents = subtotalCents;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] isolate transition ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-[#1d0a2b]/35 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="Close basket"
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        id="shopping-basket"
        className={`absolute right-0 top-0 flex h-dvh w-full max-w-md flex-col border-l border-[#3E0162]/10 bg-[#f5f0e8] shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="basket-title"
        inert={isOpen ? undefined : ""}
      >
        <header className="flex items-start justify-between border-b border-[#3E0162]/10 px-5 py-5 sm:px-7">
          <div>
            <div className="flex items-center gap-3">
              <h2
                id="basket-title"
                className="bagerich text-3xl leading-none text-[#3E0162]"
              >
                Basket
              </h2>
              {/* <span className="rounded-full montserrat bg-[#3E0162] px-1.5 py-1  text-xs font-semibold text-white">
                {cartCount}
              </span> */}
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full text-[#3E0162]  hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7E57C2]"
            aria-label="Close basket"
          >
            <i className="bi bi-x-lg text-base" aria-hidden="true"></i>
          </button>
        </header>

        <div className="flex items-center justify-between border-b border-[#3E0162]/10 bg-white/30 px-5 py-3 sm:px-7">
          <div>
            <p className="montserrat text-xs font-semibold uppercase tracking-[0.18em] text-[#3E0162]">
              Display currency
            </p>
          </div>
          <div
            className="inline-flex border border-[#3E0162] bg-white"
            role="group"
            aria-label="Choose display currency"
          >
            {["USD", "ZWG"].map((currencyOption) => (
              <button
                key={currencyOption}
                type="button"
                onClick={() => setCurrency(currencyOption)}
                className={`px-3 py-2 text-xs font-semibold transition ${
                  currency === currencyOption
                    ? "bg-[#3E0162] text-white"
                    : "text-[#3E0162]/60 hover:bg-white/70 hover:text-[#3E0162]"
                }`}
                aria-pressed={currency === currencyOption}
              >
                {currencyOption}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-full  border-[#7E57C2]/50 text-[#3E0162]">
              <i className="bi bi-cart-x text-4xl" aria-hidden="true"></i>
            </div>
            <h3 className="montserrat text-2xl text-[#3E0162]">
              Oops, nothing here yet
            </h3>
            <p className="montserrat mt-2 max-w-xs text-sm leading-6 text-[#3E0162]/65">
              Choose a flavour and it will appear here, ready for checkout.
            </p>
            <a href="#products">
              <button
                type="button"
                onClick={onClose}
                className="mt-7 border grot
               bg-[#3E0162] px-6 py-3 text-sm font-semibold text-white transition hover:bg-transparent hover:border-[#3E0162] hover:text-[#3E0162]"
              >
                Explore flavours
              </button>
            </a>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="mb-4 flex items-center justify-between">
                <p className="montserrat text-sm text-[#3E0162]/60">
                  {cartCount} {cartCount === 1 ? "drink" : "drinks"} selected
                </p>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs montserrat font-semibold text-[#3E0162]/60 underline decoration-dotted underline-offset-4 transition hover:text-[#3E0162]"
                >
                  Clear basket
                </button>
              </div>

              <ul className="space-y-3" aria-label="Basket items">
                {resolvedItems.map((item) => (
                  <li
                    key={item.productId}
                    className={`grid grid-cols-[6.25rem_1fr_auto] gap-3 border border-black ${item.product.backgroundColor}`}
                  >
                    <div className="h-24 overflow-hidden bg-[#ebe3d7]">
                      <img
                        src={item.product.image.fallbackSrc}
                        alt=""
                        className="h-full w-full object-cover"
                        style={{
                          backgroundColor: item.product.backgroundColor,
                        }}
                      />
                    </div>

                    <div className="min-w-0 py-1">
                      <h3 className="montserrat truncate text-sm font-semibold text-[#3E0162]">
                        {item.product.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[#3E0162]/60">
                        <span className="text-xs grot font-semibold">
                          {formatUsdCents(item.product.priceCents, currency)}
                        </span>
                      </div>

                      <div className="mt-3 inline-flex montserrat h-8 items-center  border border-[#3E0162] bg-[#f5f0e8] p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setItemQuantity(item.productId, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="grid h-7 w-7 place-items-center  text-[#3E0162] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Decrease ${item.product.name} quantity`}
                        >
                          <i className="bi bi-dash" aria-hidden="true"></i>
                        </button>
                        <output
                          className="w-7 text-center text-xs font-semibold tabular-nums text-[#3E0162]"
                          aria-live="polite"
                        >
                          {item.quantity}
                        </output>
                        <button
                          type="button"
                          onClick={() =>
                            setItemQuantity(item.productId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.product.stockQuantity}
                          className="grid h-7 w-7 place-items-center rounded-full text-[#3E0162] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Increase ${item.product.name} quantity`}
                        >
                          <i className="bi bi-plus" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="grid h-8 w-8 place-items-center rounded-full text-[#3E0162]/45 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      aria-label={`Remove ${item.product.name} from basket`}
                    >
                      <i
                        className="bi bi-trash3 text-sm"
                        aria-hidden="true"
                      ></i>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-[#3E0162]/10 bg-white/40 px-5 py-5 sm:px-7">
              <div className="mb-4 space-y-2 text-black">
                <div className="flex items-center justify-between">
                  <span className="montserrat text-sm text-black/65">
                    Subtotal
                  </span>
                  <span className="montserrat text-sm font-semibold tabular-nums">
                    {formatUsdCents(subtotalCents, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#3E0162]/10 pt-3">
                  <span className="montserrat text-sm font-semibold">
                    Total
                  </span>
                  <strong className="montserrat text-lg tabular-nums">
                    {formatUsdCents(totalCents, currency)}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                onClick={onCheckout}
                className="flex w-full grot items-center justify-between bg-[#3E0162] px-5 py-3 text-white transition hover:bg-[#5c0986] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7E57C2] focus-visible:ring-offset-2"
              >
                <span className="grot text-sm font-semibold">
                  Proceed to checkout
                </span>
                <i className="bi bi-arrow-right text-lg" aria-hidden="true"></i>
              </button>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
};

export default CartDrawer;
