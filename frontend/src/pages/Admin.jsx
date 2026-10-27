
import React, { useEffect, useState } from "react";

import {
  ShieldCheck, Package, Plus, Pencil, Trash2, LogOut,
  RefreshCw, Search, X, Save, Store, Boxes,
  AlertTriangle, ClipboardList, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react";


const API = "http://localhost:5000/api/admin";

const emptyProduct = {
  name: "",
  category: "clothing",
  subCategory: "",
  gender: "ALL",
  originalPrice: "",
  discountPrice: "",
  sizes: "",
  colors: "",
  image: "",
  description: "",
  stock: "0",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6fa",
    color: "#202437",
    fontFamily: "Inter, Arial, sans-serif",
  },
  header: {
    background: "#171827",
    color: "white",
    padding: "18px 5%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  button: {
    border: 0,
    borderRadius: 9,
    padding: "11px 15px",
    background: "#e83e67",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondary: {
    border: "1px solid #e1e3eb",
    borderRadius: 9,
    padding: "10px 13px",
    background: "white",
    color: "#282b3b",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #dfe2eb",
    borderRadius: 8,
    fontSize: 14,
    background: "white",
    color: "#202437",
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#45495b",
  },
  card: {
    background: "white",
    border: "1px solid #e9eaf0",
    borderRadius: 14,
    padding: 20,
    boxShadow: "0 4px 18px rgba(25,30,60,.035)",
  },
};

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

 if (!response.ok) {
  if (response.status === 401) {
    sessionStorage.removeItem("manpasand_admin_token");
  }

  const error = new Error(
    data.message || `Request failed (${response.status})`
  );

  error.status = response.status;
  error.data = data;

  throw error;
}

  return data;
}

function Field({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("manpasand_admin_token") || ""
  );
  const [password, setPassword] = useState("");
  const [authStage, setAuthStage] = useState("password");
const [setupKey, setSetupKey] = useState("");
const [authCode, setAuthCode] = useState("");
const [challengeId, setChallengeId] = useState("");
const [setupToken, setSetupToken] = useState("");
const [qrCode, setQrCode] = useState("");
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

const [inventoryProductId, setInventoryProductId] = useState("");
const [variantLines, setVariantLines] = useState("M, Black, 10\nL, Black, 8");
const [adjustment, setAdjustment] = useState({
  productId: "",
  size: "",
  color: "",
  type: "stock_in",
  quantity: "1",
  reason: "",
});
const [stockHistory, setStockHistory] = useState([]);
const [lowStockItems, setLowStockItems] = useState([]);
const [inventoryLoading, setInventoryLoading] = useState(false);

  const loggedIn = Boolean(token);

  async function loadProducts(currentToken = token) {
    setLoading(true);
    setError("");

    try {
      const data = await request("/products", currentToken);
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("administrator")) {
        setToken("");
        sessionStorage.removeItem("manpasand_admin_token");
      }
    } finally {
      setLoading(false);
    }
  }

  
useEffect(() => {
  if (token) {
    loadProducts(token);
    loadInventory(token);
  }
}, [token]);

async function handleLogin(event) {
  event.preventDefault();
  setError("");
  setNotice("");
  setLoading(true);

  try {
    const data = await request("/login", "", {
      method: "POST",
      body: JSON.stringify({ password }),
    });

    if (data.needsSetup) {
      setAuthStage("setup");
      setNotice("Set up your authenticator app to secure the admin account.");
      return;
    }

    if (data.requiresTwoFactor && data.challengeId) {
      setChallengeId(data.challengeId);
      setAuthStage("verify");
      setNotice("Enter the current six-digit code from your authenticator app.");
      return;
    }

    setError("Unexpected login response. Check the backend authentication routes.");
  } catch (err) {
    console.log("Admin login error:", {
      message: err.message,
      status: err.status,
      data: err.data,
    });

    if (err.data?.needsSetup) {
      setAuthStage("setup");
      setNotice("Set up your authenticator app to secure the admin account.");
    } else {
      setError(err.message);
    }
  } finally {
    setLoading(false);
  }
}



  function logout() {
    sessionStorage.removeItem("manpasand_admin_token");
    setToken("");
    setProducts([]);
    setFormOpen(false);
    setEditingId(null);
    setNotice("");
    setError("");
  }

  function openNewProduct() {
    setEditingId(null);
    setForm({ ...emptyProduct });
    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function openEditProduct(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      category: product.category || "clothing",
      subCategory: product.subCategory || "",
      gender: product.gender || "ALL",
      originalPrice: String(product.originalPrice ?? ""),
      discountPrice: String(product.discountPrice ?? ""),
      sizes: Array.isArray(product.sizes) ? product.sizes.join(", ") : "",
      colors: Array.isArray(product.colors) ? product.colors.join(", ") : "",
      image: product.image || "",
      description: product.description || "",
      stock: String(product.stock ?? 0),
    });
    setError("");
    setNotice("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      originalPrice: Number(form.originalPrice),
      discountPrice: Number(form.discountPrice),
      stock: Number(form.stock),
      sizes: form.sizes.split(",").map((item) => item.trim()).filter(Boolean),
      colors: form.colors.split(",").map((item) => item.trim()).filter(Boolean),
    };

    try {
      if (editingId) {
        await request(`/products/${encodeURIComponent(editingId)}`, token, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Product updated successfully.");
      } else {
        await request("/products", token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Product added successfully.");
      }

      setFormOpen(false);
      setEditingId(null);
      setForm({ ...emptyProduct });
      await loadProducts(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  
async function loadInventory(currentToken = token) {
  setInventoryLoading(true);

  try {
    const [lowData, historyData] = await Promise.all([
      request("/inventory/low-stock", currentToken),
      request("/inventory/adjustments", currentToken),
    ]);

    setLowStockItems(lowData.items || []);
    setStockHistory(historyData.adjustments || []);
  } catch (err) {
    setError(`Inventory: ${err.message}`);
  } finally {
    setInventoryLoading(false);
  }
}

async function initializeInventory(event) {
  event.preventDefault();
  setError("");
  setNotice("");

  try {
    const variants = variantLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((part) => part.trim());

        if (parts.length !== 3 || !parts[0] || !parts[1] || !/^\d+$/.test(parts[2])) {
          throw new Error(
            "Each line must be: size, colour, quantity (example: M, Black, 10)."
          );
        }

        return { size: parts[0], color: parts[1], stock: Number(parts[2]) };
      });

    if (!inventoryProductId) {
      throw new Error("Select a product first.");
    }

    if (!variants.length) {
      throw new Error("Enter at least one variant.");
    }

    await request(
      `/inventory/initialize/${encodeURIComponent(inventoryProductId)}`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ variants }),
      }
    );

    setNotice("Variant inventory initialized successfully.");
    await loadProducts(token);
    await loadInventory(token);
  } catch (err) {
    setError(err.message);
  }
}

async function submitStockAdjustment(event) {
  event.preventDefault();
  setError("");
  setNotice("");

  try {
    const quantity = Number(adjustment.quantity);

    if (!adjustment.productId || !adjustment.size.trim() || !adjustment.color.trim()) {
      throw new Error("Select a product and enter its exact size and colour.");
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error("Quantity must be a non-negative whole number.");
    }

    if (!adjustment.reason.trim()) {
      throw new Error("Enter a reason for this stock adjustment.");
    }

    await request("/inventory/adjustments", token, {
      method: "POST",
      body: JSON.stringify({ ...adjustment, quantity }),
    });

    setNotice("Stock adjustment saved.");
    setAdjustment((previous) => ({ ...previous, reason: "", quantity: "1" }));
    await loadProducts(token);
    await loadInventory(token);
  } catch (err) {
    setError(err.message);
  }
}


  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category} ${product.gender} ${product.id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const stockCount = products.reduce(
    (total, product) => total + Math.max(0, Number(product.stock) || 0),
    0
  );

  
  if (!loggedIn) {
    const setupStage = authStage === "setup";
    const enableStage = authStage === "enable";
    const verifyStage = authStage === "verify";

    const stageTitle = setupStage
      ? "Set up authenticator"
      : enableStage
      ? "Confirm authenticator"
      : verifyStage
      ? "Two-factor verification"
      : "Admin login";

    async function handleCurrentSubmit(event) {
      if (setupStage) return handleSetupStart(event);
      if (enableStage) return handleEnableAuthenticator(event);
      if (verifyStage) return handleVerifyAuthenticator(event);
      return handleLogin(event);
    }

    return (
      <div
        style={{
          ...styles.page,
          display: "grid",
          placeItems: "center",
          padding: 20,
          boxSizing: "border-box",
          background: "linear-gradient(135deg,#171827,#28243f)",
        }}
      >
        <form
          onSubmit={handleCurrentSubmit}
          style={{
            ...styles.card,
            width: "100%",
            maxWidth: 410,
            boxSizing: "border-box",
            padding: 30,
          }}
        >
          <div
            style={{
              width: 55,
              height: 55,
              display: "grid",
              placeItems: "center",
              borderRadius: 15,
              background: "#ffe5ed",
              color: "#e83e67",
              marginBottom: 20,
            }}
          >
            <ShieldCheck size={28} />
          </div>

          <div style={{ color: "#e83e67", fontWeight: 800, fontSize: 13 }}>
            MANPASAND
          </div>

          <h1 style={{ margin: "8px 0", fontSize: 28 }}>
            {stageTitle}
          </h1>

          <p style={{ color: "#727689", lineHeight: 1.6, marginBottom: 24 }}>
            {setupStage
              ? "Enter your configured setup key to begin securing your admin account."
              : enableStage
              ? "Scan the QR code with your authenticator app, then enter its six-digit code."
              : verifyStage
              ? "Enter the current six-digit code from your authenticator app."
              : "Sign in to manage your product catalogue and stock."}
          </p>

          {error && (
            <p role="alert" style={{ color: "#bd2448", fontSize: 14 }}>
              {error}
            </p>
          )}

          {notice && (
            <p role="status" style={{ color: "#237a50", fontSize: 14 }}>
              {notice}
            </p>
          )}

          {authStage === "password" && (
            <Field label="Admin password">
              <input
                autoFocus
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={styles.input}
                placeholder="Enter your admin password"
              />
            </Field>
          )}

          {setupStage && (
            <>
              <Field label="Admin password">
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  style={styles.input}
                  placeholder="Enter your admin password"
                />
              </Field>

              <div style={{ height: 14 }} />

              <Field label="Authenticator setup key">
                <input
                  required
                  type="password"
                  autoComplete="off"
                  value={setupKey}
                  onChange={(event) => setSetupKey(event.target.value)}
                  style={styles.input}
                  placeholder="Enter your setup key"
                />
              </Field>
            </>
          )}

          {enableStage && (
            <>
              {qrCode && (
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <img
                    src={qrCode}
                    alt="Authenticator setup QR code"
                    style={{
                      width: 210,
                      maxWidth: "100%",
                      background: "#ffffff",
                      padding: 10,
                      borderRadius: 8,
                    }}
                  />
                </div>
              )}

              <Field label="Six-digit authenticator code">
                <input
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={authCode}
                  onChange={(event) =>
                    setAuthCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  style={styles.input}
                  placeholder="123456"
                />
              </Field>
            </>
          )}

          {verifyStage && (
            <Field label="Six-digit authenticator code">
              <input
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={authCode}
                onChange={(event) =>
                  setAuthCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                style={styles.input}
                placeholder="123456"
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, width: "100%", marginTop: 18 }}
          >
            <ShieldCheck size={17} />
            {loading
              ? "Please wait..."
              : setupStage
              ? "Generate QR code"
              : enableStage
              ? "Enable authenticator"
              : verifyStage
              ? "Verify and sign in"
              : "Continue"}
          </button>

          {authStage !== "password" && (
            <button
              type="button"
              onClick={() => {
                setAuthStage("password");
                setError("");
                setNotice("");
                setSetupKey("");
                setSetupToken("");
                setQrCode("");
                setAuthCode("");
                setChallengeId("");
              }}
              style={{
                ...styles.secondary,
                width: "100%",
                justifyContent: "center",
                marginTop: 10,
              }}
            >
              Back to login
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              ...styles.secondary,
              width: "100%",
              justifyContent: "center",
              marginTop: 10,
            }}
          >
            <Store size={16} /> Return to storefront
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "#e83e67", display: "grid", placeItems: "center",
          }}>
            <Store size={23} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>MANPASAND</div>
            <div style={{ fontSize: 12, color: "#c6c7d3" }}>Admin dashboard</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          <button
            style={styles.secondary}
            onClick={() => { window.location.href = "/"; }}
          >
            <Store size={16} /> View store
          </button>
          <button style={styles.secondary} onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, padding: "28px 20px 50px", margin: "0 auto" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 24,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Product management</h1>
            <p style={{ color: "#777b8e", marginBottom: 0 }}>
              Manage your catalogue without editing database files manually.
            </p>
          </div>
          <button style={styles.button} onClick={openNewProduct}>
            <Plus size={18} /> Add product
          </button>
        </div>

        {error && (
          <div role="alert" style={{
            background: "#fff0f2", border: "1px solid #ffcbd5",
            color: "#a31c3d", borderRadius: 10, padding: 13, marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        {notice && (
          <div role="status" style={{
            background: "#eafaf0", border: "1px solid #bce8cb",
            color: "#176b3a", borderRadius: 10, padding: 13, marginBottom: 18,
          }}>
            {notice}
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: 15,
          marginBottom: 24,
        }}>
          <div style={styles.card}>
            <Package color="#e83e67" size={24} />
            <p style={{ color: "#777b8e", marginBottom: 5 }}>Total products</p>
            <div style={{ fontSize: 29, fontWeight: 800 }}>{products.length}</div>
          </div>
          <div style={styles.card}>
            <Boxes color="#6258d9" size={24} />
            <p style={{ color: "#777b8e", marginBottom: 5 }}>Total stock units</p>
            <div style={{ fontSize: 29, fontWeight: 800 }}>{stockCount}</div>
          </div>
          <div style={styles.card}>
            <Package color="#269a69" size={24} />
            <p style={{ color: "#777b8e", marginBottom: 5 }}>Clothing products</p>
            <div style={{ fontSize: 29, fontWeight: 800 }}>
              {products.filter((p) => p.category === "clothing").length}
            </div>
          </div>
          <div style={styles.card}>
            <Package color="#e29b30" size={24} />
            <p style={{ color: "#777b8e", marginBottom: 5 }}>Footwear products</p>
            <div style={{ fontSize: 29, fontWeight: 800 }}>
              {products.filter((p) => p.category === "footwear").length}
            </div>
          </div>
        
        </div>

        {
        <section style={{ ...styles.card, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Inventory management</h2>
          <p style={{ color: "#777b8e" }}>
            Manage clothing sizes, colours, stock quantities and stock adjustments.
          </p>

          <form onSubmit={initializeInventory}>
            <h3>1. Set up product sizes and colours</h3>

            <label style={{ display: "block", marginBottom: 6 }}>
              Select product
            </label>
            <select
              value={inventoryProductId}
              onChange={(event) => setInventoryProductId(event.target.value)}
              required
              style={{ ...styles.input, width: "100%", marginBottom: 12 }}
            >
              <option value="">Choose a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: 6 }}>
              Enter one variant per line: size, colour, quantity
            </label>
            <textarea
              value={variantLines}
              onChange={(event) => setVariantLines(event.target.value)}
              rows={4}
              required
              placeholder={"M, Black, 10\nL, Black, 8\nM, Blue, 5"}
              style={{ ...styles.input, width: "100%", marginBottom: 12 }}
            />

            <button type="submit" style={styles.primary}>
              <Save size={16} /> Save variant inventory
            </button>
          </form>
        </section>
}

        {formOpen && (

          <section style={{ ...styles.card, marginBottom: 24 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 12, marginBottom: 22,
            }}>
              <h2 style={{ margin: 0, fontSize: 21 }}>
                {editingId ? "Edit product" : "Add a new product"}
              </h2>
              <button
                type="button"
                aria-label="Close product form"
                style={styles.secondary}
                onClick={() => setFormOpen(false)}
              >
                <X size={17} /> Close
              </button>
            </div>

            
<form
  onSubmit={
    authStage === "password"
      ? handleLogin
      : authStage === "setup"
      ? handleSetupStart
      : authStage === "enable"
      ? handleEnableAuthenticator
      : handleVerifyAuthenticator
  }
  style={{
    ...styles.card,
    width: "100%",
    maxWidth: 410,
    boxSizing: "border-box",
    padding: 30,
  }}
>
  <div
    style={{
      width: 55,
      height: 55,
      display: "grid",
      placeItems: "center",
      borderRadius: 15,
      background: "#ffe5ed",
      color: "#e83e67",
      marginBottom: 20,
    }}
  >
    <ShieldCheck size={28} />
  </div>

  <div style={{ color: "#e83e67", fontWeight: 800, fontSize: 13 }}>
    MANPASAND
  </div>

  <h1 style={{ margin: "8px 0", fontSize: 28 }}>
    {authStage === "password"
      ? "Admin login"
      : authStage === "setup"
      ? "Secure your account"
      : authStage === "enable"
      ? "Set up authenticator"
      : "Two-factor verification"}
  </h1>

  <p style={{ color: "#727689", lineHeight: 1.6, marginBottom: 24 }}>
    {authStage === "password"
      ? "Sign in to manage your product catalogue and stock."
      : authStage === "setup"
      ? "Enter your backend setup key to begin authenticator setup."
      : authStage === "enable"
      ? "Scan the QR code with your authenticator app, then enter its six-digit code."
      : "Enter the current six-digit code from your authenticator app."}
  </p>

  {error && (
    <p role="alert" style={{ color: "#bd2448", fontSize: 14 }}>
      {error}
    </p>
  )}

  {notice && (
    <p role="status" style={{ color: "#28784a", fontSize: 14 }}>
      {notice}
    </p>
  )}

  {authStage === "password" && (
    <Field label="Admin password">
      <input
        autoFocus
        required
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        style={styles.input}
        placeholder="Enter your admin password"
      />
    </Field>
  )}

  {authStage === "setup" && (
    <>
      <Field label="Admin password">
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={styles.input}
          placeholder="Enter your admin password"
        />
      </Field>

      <div style={{ marginTop: 16 }}>
        <Field label="Authenticator setup key">
          <input
            required
            type="password"
            autoComplete="off"
            value={setupKey}
            onChange={(event) => setSetupKey(event.target.value)}
            style={styles.input}
            placeholder="Enter your setup key"
          />
        </Field>
      </div>
    </>
  )}

  {authStage === "enable" && (
    <>
      {qrCode && (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src={qrCode}
            alt="Manpasand authenticator setup QR code"
            style={{
              width: 220,
              maxWidth: "100%",
              height: "auto",
              border: "1px solid #e2e4eb",
              borderRadius: 12,
            }}
          />
          <p style={{ fontSize: 13, color: "#727689" }}>
            Scan this code using your authenticator app.
          </p>
        </div>
      )}

      <Field label="Six-digit authenticator code">
        <input
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={authCode}
          onChange={(event) =>
            setAuthCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          style={styles.input}
          placeholder="000000"
        />
      </Field>
    </>
  )}

  {authStage === "verify" && (
    <Field label="Six-digit authenticator code">
      <input
        required
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={authCode}
        onChange={(event) =>
          setAuthCode(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        style={styles.input}
        placeholder="000000"
      />
    </Field>
  )}

  <button
    type="submit"
    disabled={loading}
    style={{ ...styles.button, width: "100%", marginTop: 18 }}
  >
    <ShieldCheck size={17} />
    {loading
      ? "Please wait..."
      : authStage === "password"
      ? "Continue"
      : authStage === "setup"
      ? "Generate QR code"
      : authStage === "enable"
      ? "Enable authenticator"
      : "Verify and sign in"}
  </button>

  {authStage !== "password" && (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setAuthStage("password");
        setSetupKey("");
        setAuthCode("");
        setSetupToken("");
        setQrCode("");
        setChallengeId("");
        setError("");
        setNotice("");
      }}
      style={{
        ...styles.secondary,
        width: "100%",
        justifyContent: "center",
        marginTop: 10,
      }}
    >
      Back to login
    </button>
  )}

  <button
    type="button"
    onClick={() => {
      window.location.href = "/";
    }}
    style={{
      ...styles.secondary,
      width: "100%",
      justifyContent: "center",
      marginTop: 12,
    }}
  >
    <Store size={16} /> Return to storefront
  </button>
</form>

          </section>
        )}

        <section style={styles.card}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18,
          }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Your products</h2>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <Search size={17} style={{
                  position: "absolute", left: 11, top: 12, color: "#888da0",
                }} />
                <input value={search} onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products..." style={{ ...styles.input, paddingLeft: 36, width: 230 }} />
              </div>
              <button style={styles.secondary} onClick={() => loadProducts(token)} disabled={loading}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <p style={{ color: "#777b8e" }}>Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <p style={{ color: "#777b8e" }}>No products found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{
                width: "100%", borderCollapse: "collapse",
                textAlign: "left", minWidth: 720,
              }}>
                <thead>
                  <tr style={{ background: "#f7f7fb", color: "#6c7083", fontSize: 12 }}>
                    {["PRODUCT", "CATEGORY", "PRICE", "STOCK", "ACTIONS"].map((heading) => (
                      <th key={heading} style={{ padding: 13, borderBottom: "1px solid #e9eaf0" }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td style={{ padding: 13, borderBottom: "1px solid #eff0f5" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {product.image ? (
                            <img src={product.image} alt="" style={{
                              width: 49, height: 58, borderRadius: 7, objectFit: "cover",
                              background: "#f0f0f4",
                            }} />
                          ) : (
                            <div style={{
                              width: 49, height: 58, borderRadius: 7,
                              display: "grid", placeItems: "center", background: "#f0f0f4",
                            }}><Package size={20} /></div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700 }}>{product.name}</div>
                            <div style={{ fontSize: 11, color: "#85899a", marginTop: 4 }}>
                              {product.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 13, borderBottom: "1px solid #eff0f5" }}>
                        <div style={{ textTransform: "capitalize" }}>{product.category}</div>
                        <div style={{ fontSize: 12, color: "#85899a" }}>{product.gender}</div>
                      </td>
                      <td style={{ padding: 13, borderBottom: "1px solid #eff0f5", whiteSpace: "nowrap" }}>
                        <strong>Rs. {Number(product.discountPrice ?? product.originalPrice ?? 0).toLocaleString("en-IN")}</strong>
                        {Number(product.originalPrice) > Number(product.discountPrice) && (
                          <div style={{ fontSize: 12, color: "#85899a", textDecoration: "line-through" }}>
                            Rs. {Number(product.originalPrice).toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: 13, borderBottom: "1px solid #eff0f5" }}>
                        {product.stock === undefined ? "Not set" : product.stock}
                      </td>
                      <td style={{ padding: 13, borderBottom: "1px solid #eff0f5" }}>
                        <div style={{ display: "flex", gap: 7 }}>
                          <button title="Edit product" style={styles.secondary}
                            onClick={() => openEditProduct(product)}>
                            <Pencil size={15} /> Edit
                          </button>
                          <button title="Delete product" style={{
                            ...styles.secondary, color: "#c32649",
                          }} onClick={() => deleteProduct(product)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: 12, color: "#85899a", marginBottom: 0, marginTop: 16 }}>
            Showing {filteredProducts.length} of {products.length} products.
          </p>
        </section>
      </main>
    </div>
  );
}
