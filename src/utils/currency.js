export const VAT_RATE = 0.155;

const configuredRate = Number(import.meta.env.VITE_USD_TO_ZWG_RATE);

export const USD_TO_ZWG_RATE =
  Number.isFinite(configuredRate) && configuredRate > 0
    ? configuredRate
    : 26.5247;

export const getUsdPriceCents = (product) => {
  if (Number.isFinite(product.priceCents)) {
    return Math.max(0, Math.round(product.priceCents));
  }

  if (Number.isFinite(product.price)) {
    return Math.max(0, Math.round(product.price * 100));
  }

  return 0;
};

export const formatUsdCents = (usdCents, currency = "USD") => {
  const usdAmount = Math.max(0, Number(usdCents) || 0) / 100;

  if (currency === "ZWG") {
    const zwgAmount = usdAmount * USD_TO_ZWG_RATE;
    return `ZWG ${zwgAmount.toLocaleString("en-ZW", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(usdAmount);
};
