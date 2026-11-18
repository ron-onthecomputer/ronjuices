import { useEffect, useRef, useState } from "react";
import useCartStore from "../stores/useCartStore";
import { formatUsdCents, getUsdPriceCents } from "../utils/currency";

const ProductCard = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const [wasAdded, setWasAdded] = useState(false);
  const feedbackTimer = useRef(null);
  const addItem = useCartStore((state) => state.addItem);
  const currency = useCartStore((state) => state.currency);
  const isOutOfStock = !product.isAvailable;
  const maxQuantity = Number.isFinite(product.stockQuantity)
    ? Math.max(1, product.stockQuantity)
    : 99;

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  const updateQuantity = (amount) => {
    setQuantity((current) =>
      Math.min(maxQuantity, Math.max(1, current + amount)),
    );
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem(product, quantity);
    setWasAdded(true);
    setQuantity(1);

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setWasAdded(false), 1400);
  };

  return (
    <div
      className={`group product-tile relative h-[60vh] shadow-md transition-all duration-500 ${
        isOutOfStock
          ? "cursor-not-allowed grayscale pointer-events-none"
          : " hover:shadow-xl"
      }`}
      style={{ backgroundColor: product.backgroundColor }}
      aria-label={`${product.name}, ${
        isOutOfStock ? "out of stock" : "available"
      }`}
    >
      <picture>
        <source
          type="image/avif"
          srcSet={`${product.image.avifSrc.replace("-800.avif", "-400.avif")} 400w, ${product.image.avifSrc} 800w`}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <source
          type="image/webp"
          srcSet={`${product.image.webpSrc.replace("-800.webp", "-400.webp")} 400w, ${product.image.webpSrc} 800w`}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <img
          src={product.image.fallbackSrc}
          alt={product.image.alt}
          width={product.image.width}
          height={product.image.height}
          loading={product.isFeatured ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 w-full h-[90%] object-cover transition-all duration-500"
        />
      </picture>
      {product.isFeatured && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 text-xs font-semibold text-white/90 montserrat">
          <i className="bi bi-suit-heart-fill"></i>
          <span>Most Popular</span>
        </div>
      )}

      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-start justify-end bg-gray-200/50 p-4">
          <span className="rounded-full montserrat bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Out of stock
          </span>
        </div>
      )}
      {!isOutOfStock && product.stockQuantity <= product.lowStockThreshold && (
        <span className="absolute montserrat right-4 top-4 z-20 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          Only {product.stockQuantity} left
        </span>
      )}

      <div className="absolute bottom-0 z-20 mt-6 min-h-[7rem] w-full bg-white p-3 transition-all duration-300 group-hover:opacity-100 hovered:opacity-100">
        <div className="flex justify-between">
          <h3
            className=" montserrat text-md font-semibold"
            style={{ color: product.accentColor }}
          >
            {product.name}
          </h3>
          <div>
            {(() => {
              const formattedPrice = formatUsdCents(
                getUsdPriceCents(product),
                currency,
              );
              const [dollars, cents] = formattedPrice.split(".");

              return (
                <span className="font-[poppins] text-xl font-bold inline-flex items-start">
                  <span>{dollars}</span>
                  {cents && (
                    <span className="text-xs font-medium relative -top-1 ml-0.5">
                      .{cents}
                    </span>
                  )}
                </span>
              );
            })()}
          </div>
        </div>
        {/*Hover Message*/}
        <div className="product-description hidden transition-all duration-300">
          <p className="montserrat my-1" style={{ color: product.accentColor }}>
            {product.description}
          </p>
          <div className="mt-3  montserrat flex items-center gap-2">
            <div
              className="inline-flex h-9 shrink-0 items-center border border-gray-500 bg-gray-50 p-1 shadow-inner"
              aria-label="Select quantity"
            >
              <button
                type="button"
                onClick={() => updateQuantity(-1)}
                disabled={quantity === 1 || isOutOfStock}
                className="grid h-7 w-7 place-items-center text-gray-600 transition hover:bg-white hover:text-[#3E0162] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Decrease ${product.name} quantity`}
              >
                <i className="bi bi-dash text-lg" aria-hidden="true"></i>
              </button>
              <output
                className="w-7 text-center text-sm font-semibold tabular-nums text-gray-900"
                aria-live="polite"
              >
                {quantity}
              </output>
              <button
                type="button"
                onClick={() => updateQuantity(1)}
                disabled={quantity >= maxQuantity || isOutOfStock}
                className="grid h-7 w-7 place-items-center text-gray-600 transition hover:bg-white hover:text-[#3E0162] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Increase ${product.name} quantity`}
              >
                <i className="bi bi-plus text-lg" aria-hidden="true"></i>
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              style={{ backgroundColor: product.backgroundColor }}
              className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 px-3 text-white shadow-sm transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7E57C2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              <i
                className={`bi ${wasAdded && "bi-check2"} text-base`}
                aria-hidden="true"
              ></i>
              <span className="truncate text-xs font-semibold">
                {wasAdded ? "ADDED" : "ADD TO CART"}
              </span>
            </button>
          </div>
        </div>{" "}
        <div className="container flex flex-col gap-2">
          <span className="grot">500ml</span>
          <div className="inline-flex self-start bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 montserrat">
            100% Natural
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
