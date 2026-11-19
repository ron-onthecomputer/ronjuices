import { useCallback, useEffect, useState } from "react";
import { api, apiMessage } from "../api/client";
import { formatUsdCents } from "../utils/currency";

const blankProduct = {
  slug: "",
  name: "",
  description: "",
  volumeMl: 500,
  priceCents: 0,
  currency: "USD",
  stockQuantity: 0,
  lowStockThreshold: 5,
  isActive: true,
  isFeatured: false,
  accentColor: "#3E0162",
  backgroundColor: "#7E57C2",
  image: {
    alt: "",
    fallbackSrc: "",
    webpSrc: "",
    avifSrc: "",
    width: 800,
    height: 533,
  },
};

const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;

const normalizeSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function DeleteProductModal({ product, isDeleting, onCancel, onConfirm }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !isDeleting) onCancel();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isDeleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4"
      onClick={isDeleting ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
        aria-describedby="delete-product-description"
        className="w-full max-w-md bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="delete-product-title"
          className="text-2xl font-bold text-gray-900"
        >
          Delete product?
        </h2>
        <p id="delete-product-description" className="mt-3 text-gray-600">
          Are you sure you want to delete <strong>{product.name}</strong>? This
          action cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-red-700 px-4 py-2 text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-60"
            onClick={onConfirm}
            disabled={isDeleting}
            autoFocus
          >
            {isDeleting ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [authNotice, setAuthNotice] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState({ search: "", status: "" });
  const [error, setError] = useState("");
  const [newProduct, setNewProduct] = useState(blankProduct);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productDraft, setProductDraft] = useState(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productImageFile, setProductImageFile] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState({
    state: "idle",
    message: "",
  });
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productCreationStatus, setProductCreationStatus] = useState("idle");
  const load = useCallback(async () => {
    const [p, o, pay] = await Promise.all([
      api.get("/admin/products"),
      api.get("/admin/orders", { params: filter }),
      api.get("/admin/payments"),
    ]);
    setProducts(p.data.data);
    setOrders(o.data.data);
    setPayments(pay.data.data);
  }, [filter]);
  useEffect(() => {
    api
      .get("/admin/auth/me")
      .then(() => {
        setAuthenticated(true);
        load().catch((e) => setError(apiMessage(e)));
      })
      .catch(() => setAuthenticated(false));
  }, [load]);
  const login = async (event) => {
    event.preventDefault();
    setError("");
    setAuthNotice("");
    try {
      await api.post("/admin/auth/login", credentials);
      setAuthenticated(true);
      await load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordChangeError("");
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setPasswordChangeError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.patch("/admin/auth/password", {
        currentPassword: passwordChange.currentPassword,
        newPassword: passwordChange.newPassword,
      });
      setPasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordChange(false);
      setCredentials({ email: "", password: "" });
      setAuthNotice("Password changed. Sign in again with your new password.");
      setAuthenticated(false);
    } catch (e) {
      setPasswordChangeError(apiMessage(e));
    } finally {
      setIsChangingPassword(false);
    }
  };
  const startEditingProduct = (product) => {
    setError("");
    setEditingProductId(product.id);
    setProductDraft({
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
    });
  };
  const cancelEditingProduct = () => {
    setEditingProductId(null);
    setProductDraft(null);
  };
  const saveProduct = async (id) => {
    if (!productDraft) return;

    setError("");
    setIsSavingProduct(true);
    try {
      const response = await api.patch(`/admin/products/${id}`, productDraft);
      setProducts((all) =>
        all.map((item) => (item.id === id ? response.data.data : item)),
      );
      cancelEditingProduct();
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setIsSavingProduct(false);
    }
  };
  const deleteProduct = async () => {
    if (!productToDelete) return;

    setError("");
    setIsDeleting(true);
    try {
      await api.delete(`/admin/products/${productToDelete.id}`);
      setProducts((all) =>
        all.filter((product) => product.id !== productToDelete.id),
      );
      setProductToDelete(null);
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setIsDeleting(false);
    }
  };
  const transition = async (id, status) => {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
      await load();
    } catch (e) {
      setError(apiMessage(e));
    }
  };
  const createProduct = async (event) => {
    event.preventDefault();
    setError("");
    setProductCreationStatus("idle");
    setIsCreatingProduct(true);
    try {
      const response = await api.post("/admin/products", {
        ...newProduct,
        slug: normalizeSlug(newProduct.slug),
      });
      setProducts((all) =>
        [...all, response.data.data].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewProduct(blankProduct);
      setProductImageFile(null);
      setImageUploadStatus({ state: "idle", message: "" });
      setProductCreationStatus("success");
    } catch (e) {
      setError(apiMessage(e));
    } finally {
      setIsCreatingProduct(false);
    }
  };
  const uploadProductImage = async () => {
    if (!productImageFile || !newProduct.image.alt.trim()) {
      setImageUploadStatus({
        state: "error",
        message: "Add image alt text and select a PNG before uploading.",
      });
      return;
    }

    setError("");
    setIsUploadingImage(true);
    setImageUploadStatus({
      state: "uploading",
      message: "Uploading and generating optimized image formats…",
    });
    try {
      const body = new FormData();
      body.append("image", productImageFile);
      body.append("alt", newProduct.image.alt.trim());
      const response = await api.post("/admin/product-images", body, {
        timeout: 60_000,
      });
      setNewProduct((current) => ({ ...current, image: response.data.data }));
      setProductImageFile(null);
      setImageUploadStatus({
        state: "success",
        message:
          "Upload successful. Optimized PNG, WebP and AVIF images are ready.",
      });
    } catch (e) {
      setImageUploadStatus({ state: "error", message: apiMessage(e) });
    } finally {
      setIsUploadingImage(false);
    }
  };
  if (authenticated === null)
    return (
      <main className="min-h-screen pt-40 text-center" aria-live="polite">
        Checking admin session…
      </main>
    );
  if (!authenticated)
    return (
      <main className="mx-auto grot min-h-screen max-w-md px-6 pt-36">
        <h1 className="text-5xl text-[#3E0162]">Admin sign in</h1>
        <form onSubmit={login} className="mt-8 grid gap-4 bg-white p-6 shadow">
          {authNotice && (
            <p role="status" className="bg-green-50 p-3 text-sm text-green-800">
              {authNotice}
            </p>
          )}
          <label>
            Email
            <input
              type="email"
              className="mt-1 min-h-11 w-full outline-none focus:ring-2 focus:ring-[#3E0162] p-3"
              value={credentials.email}
              onChange={(e) =>
                setCredentials({ ...credentials, email: e.target.value })
              }
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              className="mt-1 min-h-11 w-full outline-none focus:ring-2 focus:ring-[#3E0162] p-3"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
              required
            />
          </label>
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <button className="min-h-12 bg-[#3E0162] hover:bg-[#5e0094] text-white">
            Sign in
          </button>
        </form>
      </main>
    );
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 pb-20 pt-28 font-[poppins]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest">Operations</p>
          <h1 className="bagerich text-5xl text-[#3E0162]">Store admin</h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="border border-[#3E0162] p-2 text-[#3E0162] hover:bg-[#3E0162] hover:text-white"
            onClick={() => {
              setPasswordChangeError("");
              setShowPasswordChange((visible) => !visible);
            }}
            aria-expanded={showPasswordChange}
            aria-controls="admin-password-change"
          >
            Change password
          </button>
          <button
            type="button"
            className="text-white bg-[#3E0162] hover:bg-[#5c0191] p-2"
            onClick={async () => {
              await api.post("/admin/auth/logout");
              setAuthenticated(false);
            }}
          >
            Sign out
          </button>
        </div>
      </div>
      {showPasswordChange && (
        <section
          id="admin-password-change"
          className="mt-6 max-w-xl bg-white p-6 shadow"
        >
          <h2 className="text-2xl font-bold">Change password</h2>
          <p className="mt-1 text-sm text-gray-600">
            Use at least 12 characters. You will be signed out after the change.
          </p>
          <form onSubmit={changePassword} className="mt-5 grid gap-4">
            <label className="text-sm font-medium text-gray-700">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                className="mt-1 min-h-11 w-full border border-gray-300 p-3 outline-none focus:border-[#3E0162] focus:ring-1 focus:ring-[#3E0162]"
                value={passwordChange.currentPassword}
                onChange={(event) =>
                  setPasswordChange({
                    ...passwordChange,
                    currentPassword: event.target.value,
                  })
                }
                required
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                className="mt-1 min-h-11 w-full border border-gray-300 p-3 outline-none focus:border-[#3E0162] focus:ring-1 focus:ring-[#3E0162]"
                value={passwordChange.newPassword}
                onChange={(event) =>
                  setPasswordChange({
                    ...passwordChange,
                    newPassword: event.target.value,
                  })
                }
                required
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                className="mt-1 min-h-11 w-full border border-gray-300 p-3 outline-none focus:border-[#3E0162] focus:ring-1 focus:ring-[#3E0162]"
                value={passwordChange.confirmPassword}
                onChange={(event) =>
                  setPasswordChange({
                    ...passwordChange,
                    confirmPassword: event.target.value,
                  })
                }
                required
              />
            </label>
            {passwordChangeError && (
              <p role="alert" className="text-sm text-red-700">
                {passwordChangeError}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                className="min-h-11 bg-[#3E0162] px-5 font-semibold text-white hover:bg-[#5c0191] disabled:cursor-wait disabled:opacity-60"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Changing password…" : "Update password"}
              </button>
              <button
                type="button"
                className="min-h-11 border border-gray-300 px-5 text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordChangeError("");
                  setPasswordChange({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <p className="mt-3 text-red-700" role="alert">
        {error}
      </p>
      <section className="mt-10">
        <h2 className="text-2xl font-bold">Products and inventory</h2>
        <details className="mt-4 bg-white p-4 shadow">
          <summary className="cursor-pointer font-semibold">
            Create product
          </summary>
          <form onSubmit={createProduct} className="mt-6 space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Product details
              </legend>
              <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  ["slug", "Slug"],
                  ["name", "Name"],
                  ["description", "Description"],
                  ["volumeMl", "Volume (ml)", "number"],
                  ["priceCents", "Price (cents)", "number"],
                  ["stockQuantity", "Opening stock", "number"],
                  ["lowStockThreshold", "Low-stock threshold", "number"],
                  ["accentColor", "Accent colour"],
                  ["backgroundColor", "Background colour"],
                ].map(([name, label, type]) => (
                  <label
                    key={name}
                    className="text-sm font-medium text-gray-700"
                  >
                    {label}
                    <input
                      className="mt-1 min-h-11 w-full border border-gray-300 bg-white p-2 outline-none focus:border-[#3E0162] focus:ring-1 focus:ring-[#3E0162]"
                      type={type || "text"}
                      value={newProduct[name]}
                      pattern={name === "slug" ? "[a-z0-9-]+" : undefined}
                      title={
                        name === "slug"
                          ? "Use lowercase letters, numbers and hyphens only"
                          : undefined
                      }
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          [name]:
                            type === "number"
                              ? Number(e.target.value)
                              : name === "slug"
                                ? normalizeSlug(e.target.value)
                                : e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                ))}
                <label className="flex min-h-11 items-center gap-3 self-end border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={newProduct.isFeatured}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        isFeatured: e.target.checked,
                      })
                    }
                  />
                  Mark as featured
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                Product image
              </legend>
              <p className="mb-4 text-sm text-gray-600">
                Upload one PNG. The server will create and store the optimized
                PNG, WebP and AVIF versions.
              </p>
              <div className="grid gap-5 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
                <label className="text-sm font-medium text-gray-700">
                  Image alt text
                  <input
                    className="mt-1 h-11 w-full border border-gray-300 bg-white px-3 outline-none focus:border-[#3E0162] focus:ring-1 focus:ring-[#3E0162]"
                    value={newProduct.image.alt}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        image: { ...newProduct.image, alt: e.target.value },
                      })
                    }
                    placeholder="Describe the product image"
                    required
                  />
                </label>

                <label className="text-sm font-medium text-gray-700">
                  PNG file
                  <input
                    key={newProduct.image.fallbackSrc || "new-product-image"}
                    className="mt-1 flex h-11 w-full items-center border border-gray-300 bg-white px-2 text-sm file:mr-3 file:h-full file:border-0 file:bg-gray-900 file:px-3 file:py-0 file:text-white"
                    type="file"
                    accept="image/png,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImageUploadStatus({ state: "idle", message: "" });
                      setNewProduct((current) => ({
                        ...current,
                        image: {
                          ...current.image,
                          fallbackSrc: "",
                          webpSrc: "",
                          avifSrc: "",
                        },
                      }));
                      if (!file) {
                        setProductImageFile(null);
                        return;
                      }
                      if (file.type !== "image/png") {
                        setProductImageFile(null);
                        setImageUploadStatus({
                          state: "error",
                          message:
                            "Unsupported file format. Select a PNG image.",
                        });
                        e.target.value = "";
                        return;
                      }
                      if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
                        setProductImageFile(null);
                        setImageUploadStatus({
                          state: "error",
                          message:
                            "File size is too big. Product images must be 10 MB or smaller.",
                        });
                        e.target.value = "";
                        return;
                      }
                      setProductImageFile(file);
                    }}
                    required={!newProduct.image.fallbackSrc}
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    PNG only · maximum 10 MB
                  </span>
                </label>

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 bg-gray-900 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 lg:mt-6"
                  onClick={uploadProductImage}
                  disabled={
                    isUploadingImage ||
                    !productImageFile ||
                    !newProduct.image.alt.trim()
                  }
                >
                  {isUploadingImage && (
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden="true"
                    />
                  )}
                  {isUploadingImage ? "Uploading…" : "Upload image"}
                </button>
              </div>

              <div className="mt-4 min-h-6 " aria-live="polite">
                {imageUploadStatus.state === "uploading" && (
                  <p
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                    role="status"
                  >
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#3E0162]"
                      aria-hidden="true"
                    />
                    {imageUploadStatus.message}
                  </p>
                )}
                {imageUploadStatus.state === "success" && (
                  <p
                    className="flex items-start gap-2 text-sm font-semibold text-green-700"
                    role="status"
                  >
                    <i
                      className="bi bi-arrow-up-circle-fill mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{imageUploadStatus.message}</span>
                  </p>
                )}
                {imageUploadStatus.state === "error" && (
                  <p
                    className="flex items-start gap-2 text-sm font-semibold text-red-700"
                    role="alert"
                  >
                    <i
                      className="bi bi-x-circle-fill mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      Upload unsuccessful: {imageUploadStatus.message}
                    </span>
                  </p>
                )}
              </div>
            </fieldset>

            <div className="flex flex-col items-start gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center">
              <button
                className="inline-flex min-h-12 min-w-48 items-center justify-center gap-2 bg-[#3E0162] px-6 font-semibold text-white hover:bg-[#5c0191] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  isUploadingImage ||
                  isCreatingProduct ||
                  !newProduct.image.fallbackSrc
                }
              >
                {isCreatingProduct && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden="true"
                  />
                )}
                {isCreatingProduct ? "Creating product…" : "Create product"}
              </button>
              {productCreationStatus === "success" && (
                <p
                  className="flex items-center gap-2 font-semibold text-green-700"
                  role="status"
                >
                  <i className="bi bi-check-circle-fill" aria-hidden="true" />
                  Created successfully
                </p>
              )}
            </div>
          </form>
        </details>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full bg-white text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">Product</th>
                <th>Description</th>
                <th>Price (cents)</th>
                <th>Stock</th>
                <th>Low at</th>
                <th>Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isEditing = editingProductId === p.id;
                const displayedProduct = isEditing ? productDraft : p;

                return (
                  <tr
                    key={p.id}
                    className={
                      p.stockQuantity <= p.lowStockThreshold ||
                      p.stockQuantity === 0
                        ? "bg-red-50"
                        : "border-t"
                    }
                  >
                    <td className="p-3">
                      <input
                        aria-label={`${p.name} name`}
                        className="w-48 border p-2 font-semibold disabled:border-transparent disabled:bg-transparent disabled:text-gray-900"
                        value={displayedProduct.name}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setProductDraft({
                            ...productDraft,
                            name: e.target.value,
                          })
                        }
                      />

                      <span className="ml-2 text-red-600 font-medium">
                        {p.stockQuantity === 0
                          ? "Out of Stock"
                          : p.stockQuantity <= p.lowStockThreshold
                            ? "Low Stock"
                            : ""}
                      </span>
                    </td>
                    <td>
                      <input
                        aria-label={`${p.name} description`}
                        className="w-64 border p-2 disabled:border-transparent disabled:bg-transparent disabled:text-gray-900"
                        value={displayedProduct.description}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setProductDraft({
                            ...productDraft,
                            description: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${p.name} price`}
                        className="w-24 border p-2 disabled:border-transparent disabled:bg-transparent disabled:text-gray-900"
                        type="number"
                        value={displayedProduct.priceCents}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setProductDraft({
                            ...productDraft,
                            priceCents: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${p.name} stock`}
                        className="w-20 border p-2 disabled:border-transparent disabled:bg-transparent disabled:text-gray-900"
                        type="number"
                        value={displayedProduct.stockQuantity}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setProductDraft({
                            ...productDraft,
                            stockQuantity: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${p.name} low stock threshold`}
                        className="w-20 border p-2 disabled:border-transparent disabled:bg-transparent disabled:text-gray-900"
                        type="number"
                        value={displayedProduct.lowStockThreshold}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setProductDraft({
                            ...productDraft,
                            lowStockThreshold: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${p.name} active`}
                        type="checkbox"
                        checked={displayedProduct.isActive}
                        disabled={!isEditing}
                        onChange={(e) =>
                          setProductDraft({
                            ...productDraft,
                            isActive: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="bg-[#3E0162] px-3 py-2 font-semibold text-white hover:bg-[#5c0191] disabled:cursor-wait disabled:opacity-60"
                              onClick={() => saveProduct(p.id)}
                              disabled={isSavingProduct}
                            >
                              {isSavingProduct ? "Saving" : "Save"}
                            </button>
                            <button
                              type="button"
                              className="border border-gray-400 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                              onClick={cancelEditingProduct}
                              disabled={isSavingProduct}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="border-none font-semibold text-[#3E0162]  hover:text-[#540185] p-2 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => startEditingProduct(p)}
                            disabled={editingProductId !== null}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="border border-red-700 px-3 py-2 font-semibold text-red-700 hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setProductToDelete(p)}
                          disabled={isEditing || editingProductId !== null}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Orders</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <input
              className="border p-2"
              placeholder="Number or email"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
            <select
              className="border p-2"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All statuses</option>
              {[
                "paid",
                "processing",
                "ready",
                "completed",
                "cancelled",
                "payment_failed",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </form>
        </div>
        <div className="mt-4 space-y-3">
          {filter.search.trim() && orders.length === 0 && (
            <p
              className="bg-white p-6 text-center text-sm text-gray-600 shadow"
              role="status"
            >
              Search results not found.
            </p>
          )}
          {orders.map((o) => (
            <article
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 shadow"
            >
              <div>
                <strong>{o.orderNumber}</strong>
                <p className="text-sm">
                  {o.customerEmail} · {formatUsdCents(o.totalCents, o.currency)}
                </p>
                <p className="text-xs">Payment: {o.paymentStatus}</p>
              </div>
              <label className="text-sm">
                Fulfilment{" "}
                <select
                  className="ml-2 border p-2"
                  value={o.status}
                  onChange={(e) => transition(o.id, e.target.value)}
                >
                  <option>{o.status}</option>
                  {(
                    {
                      paid: ["processing", "cancelled"],
                      processing: ["ready", "cancelled"],
                      ready: ["completed"],
                    }[o.status] || []
                  ).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-bold">Recent payments</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {payments.map((p) => (
            <article key={p.id} className="bg-white p-4 shadow">
              <div className="flex justify-between">
                <strong>{p.orderNumber}</strong>
                <span>{p.status}</span>
              </div>
              <p className="mt-2 text-sm">
                {formatUsdCents(p.amountCents, p.currency)} · attempt{" "}
                {p.attempts}
              </p>
              {p.failureReason && (
                <p className="mt-2 text-sm text-red-700">{p.failureReason}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Gateway status: {p.gatewayStatus || "Not reported"}
              </p>
            </article>
          ))}
        </div>
      </section>
      {productToDelete && (
        <DeleteProductModal
          product={productToDelete}
          isDeleting={isDeleting}
          onCancel={() => setProductToDelete(null)}
          onConfirm={deleteProduct}
        />
      )}
    </main>
  );
}
