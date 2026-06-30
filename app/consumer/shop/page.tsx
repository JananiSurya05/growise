"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { CropWithFarmer } from "../../lib/types";
import { computeMarketPrice } from "../../lib/pricing";
import ConsumerLayout from "../../components/ConsumerLayout";
import AppInput from "../../components/ui/AppInput";

type Product = {
  id: string;
  name: string;
  price: number;
  marketPrice: number;
  quantity: number;
  farmer: string;
  farmer_id: string;
  location: string;
  img: string;
  badge: string;
};

type CartItem = Product & { qty: number };

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ConsumerShop() {
  const PAGE_SIZE = 12;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loadError, setLoadError] = useState("");

  async function loadProducts(pageIndex: number, currentSearch = search, currentFilter = filter) {
    setLoading(true);
    setLoadError("");
    setPage(pageIndex);
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("crops")
      .select("id, name, price, quantity, location, image_url, badge, farmer_id, users:farmer_id(name)", { count: "exact" })
      .eq("status", "Active");

    if (currentSearch) {
      query = query.or(`name.ilike.%${currentSearch}%,location.ilike.%${currentSearch}%`);
    }
    if (currentFilter !== "All") {
      query = query.ilike("badge", `%${currentFilter}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("[shop] loadProducts failed:", error.message);
      setLoadError("Couldn't load crops right now. Please try again.");
      setLoading(false);
      return;
    }

    if (count !== null) setTotalCount(count);
    setProducts((data as unknown as CropWithFarmer[]).map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      marketPrice: computeMarketPrice(c.price),
      quantity: c.quantity,
      farmer: c.users?.name ?? "Local Farmer",
      farmer_id: c.farmer_id,
      location: c.location ?? "Tamil Nadu",
      img: c.image_url ?? "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop",
      badge: c.badge ?? "🌿 Eco",
    })));
    setLoading(false);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setAuthUser(user);
      loadProducts(0);
    }
    init();
  }, []);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setShowCart(true);
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQty(id: string, qty: number) {
    if (qty < 1) { removeFromCart(id); return; }
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
  }

  function onCheckoutSuccess() {
    setCart([]);
    setPlacing(false);
    setOrdered(true);
    setTimeout(() => {
      setOrdered(false);
      setShowCart(false);
      window.location.href = "/consumer/orders";
    }, 2000);
  }

  async function placeOrder() {
    if (!authUser || cart.length === 0) return;
    setPlacing(true);
    setOrderError("");

    // Order creation, price recomputation, and farmer-grouping all happen
    // server-side in /api/orders/place — only cropId + qty are sent. The
    // server re-fetches authoritative crop prices/farmer_id; nothing about
    // price, total, amount_saved, or farmer_id from this client is trusted.
    try {
      const res = await fetch("/api/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({ cropId: item.id, qty: item.qty })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to place order." }));
        throw new Error(body.error ?? "Failed to place order.");
      }

      const placed = await res.json() as { payment: { razorpayOrderId: string; amount: number; currency: string } };
      const { razorpayOrderId, amount, currency } = placed.payment;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load the payment gateway. Check your connection and try again.");
      }

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "GroWise",
        description: "Fresh produce order",
        theme: { color: "#4ade80" },
        handler: async (response: RazorpaySuccessResponse) => {
          try {
            const verifyRes = await fetch("/api/orders/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              const body = await verifyRes.json().catch(() => ({ error: "Payment verification failed." }));
              throw new Error(body.error ?? "Payment verification failed.");
            }
            onCheckoutSuccess();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            console.error("[shop] Payment verification failed:", msg);
            setOrderError("Payment received but verification failed. Please contact support before retrying.");
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setOrderError("Payment was cancelled. Your order was created but is unpaid — contact support to complete payment.");
            setPlacing(false);
          },
        },
      });
      razorpay.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[shop] Order placement failed:", msg);
      setOrderError(msg || "Could not place order. Please try again.");
      setPlacing(false);
    }
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalSaved = cart.reduce((sum, i) => sum + (i.marketPrice - i.price) * i.qty, 0);

  return (
    <ConsumerLayout activeHref="/consumer/shop">

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
              <span style={{ fontSize: "11px", color: "#4ade80", fontWeight: "600", letterSpacing: ".06em" }}>LIVE · {totalCount} PRODUCTS</span>
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>🥦 Fresh Produce Shop</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCart(!showCart)}
            style={{ background: cart.length > 0 ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.1)", border: cart.length > 0 ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(96,165,250,0.25)", borderRadius: "10px", padding: "8px 16px", fontSize: "13px", color: cart.length > 0 ? "#4ade80" : "#60a5fa", fontWeight: "600", cursor: "pointer", font: "inherit" }}
          >
            🛒 Cart ({cart.length}) {cart.length > 0 ? "→" : ""}
          </button>
        </div>

        {/* Cart Panel */}
        {showCart && (
          <div style={{ background: "#012e2f", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", color: "#4ade80", fontWeight: "700", marginBottom: "14px" }}>🛒 Your Cart</div>

            {cart.length === 0 ? (
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "16px" }}>Cart is empty — add some veggies! 🥦</div>
            ) : (
              <>
                {cart.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <img src={item.img} alt={item.name} style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>{item.name}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>₹{item.price}/kg · {item.farmer}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button type="button" onClick={() => updateQty(item.id, item.qty - 1)} aria-label={`Decrease quantity of ${item.name}`} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontSize: "14px" }}>-</button>
                      <span style={{ fontSize: "13px", color: "white", minWidth: "20px", textAlign: "center" }}>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item.id, item.qty + 1)} aria-label={`Increase quantity of ${item.name}`} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "white", cursor: "pointer", fontSize: "14px" }}>+</button>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#60a5fa", minWidth: "50px", textAlign: "right" }}>₹{item.price * item.qty}</div>
                    <button type="button" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name} from cart`} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "8px", padding: "4px 10px", color: "#f87171", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>✕</button>
                  </div>
                ))}

                {orderError && (
                  <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "10px", padding: "10px 14px", color: "#f87171", fontSize: "12px", marginTop: "12px" }}>
                    {orderError}
                  </div>
                )}

                <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Total: <span style={{ color: "white", fontWeight: "700" }}>₹{totalAmount}</span></div>
                    <div style={{ fontSize: "11px", color: "#4ade80" }}>You save ₹{totalSaved} vs supermarket!</div>
                    {new Set(cart.map(i => i.farmer_id)).size > 1 && (
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                        Items from {new Set(cart.map(i => i.farmer_id)).size} farmers — separate orders will be created.
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => setCart([])} style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "10px 16px", color: "#f87171", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                      🗑️ Clear All
                    </button>
                    <button onClick={placeOrder} disabled={placing || ordered} style={{ background: ordered ? "#16a34a" : "#4ade80", border: "none", borderRadius: "10px", padding: "10px 20px", color: "#0a0a0a", fontSize: "13px", fontWeight: "700", cursor: placing || ordered ? "not-allowed" : "pointer", opacity: placing ? 0.8 : 1 }}>
                      {ordered ? "✅ Order Placed!" : placing ? "Placing..." : "Place Order →"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Search + filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <AppInput
            aria-label="Search by crop or location"
            value={search}
            onChange={(e) => { setSearch(e.target.value); loadProducts(0, e.target.value, filter); }}
            placeholder="🔍 Search by crop or location..."
            style={{ flex: 1, minWidth: "200px", background: "#012e2f", padding: "10px 16px" }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            {["All", "Eco", "Top", "New"].map((f) => (
              <button key={f} onClick={() => { setFilter(f); loadProducts(0, search, f); }} style={{ background: filter === f ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.04)", border: filter === f ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "999px", padding: "7px 14px", fontSize: "12px", color: filter === f ? "#60a5fa" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'Segoe UI', sans-serif" }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "rgba(255,255,255,0.4)" }}>Loading fresh produce...</div>
        ) : loadError ? (
          <div style={{ textAlign: "center", padding: "48px", background: "#012e2f", borderRadius: "16px", border: "1px solid rgba(248,113,113,0.25)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <div style={{ fontSize: "16px", color: "#f87171", marginBottom: "12px" }}>{loadError}</div>
            <button
              onClick={() => loadProducts(page)}
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "10px", padding: "8px 20px", color: "#f87171", cursor: "pointer", fontSize: "13px" }}
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", background: "#012e2f", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🥦</div>
            <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.5)" }}>No products yet</div>
          </div>
        ) : (
          <div className="products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
            {products.map((product) => {
              const inCart = cart.find((i) => i.id === product.id);
              return (
                <div key={product.id} style={{ background: "#012e2f", border: inCart ? "2px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ position: "relative", height: "110px" }}>
                    <img src={product.img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(1,46,47,0.85) 0%, transparent 55%)" }} />
                    <div style={{ position: "absolute", top: "8px", left: "8px" }}>
                      <div style={{ background: "rgba(0,0,0,0.65)", borderRadius: "999px", padding: "2px 8px", fontSize: "9px", color: "#4ade80", fontWeight: "600" }}>{product.badge}</div>
                    </div>
                    {inCart && (
                      <div style={{ position: "absolute", top: "8px", right: "8px", background: "#4ade80", borderRadius: "999px", padding: "2px 8px", fontSize: "9px", color: "#0a0a0a", fontWeight: "700" }}>✓ {inCart.qty} in cart</div>
                    )}
                    <div style={{ position: "absolute", bottom: "6px", left: "10px" }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "white" }}>{product.name}</div>
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#60a5fa" }}>₹{product.price}/kg</div>
                      <div style={{ fontSize: "10px", color: "#f87171", textDecoration: "line-through" }}>₹{product.marketPrice}</div>
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "4px" }}>👨‍🌾 {product.farmer}</div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>📍 {product.location}</div>
                    <button
                      onClick={() => addToCart(product)}
                      style={{ width: "100%", border: "none", borderRadius: "8px", padding: "8px", fontSize: "11px", fontWeight: "700", cursor: "pointer", background: inCart ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #0284c7, #0369a1)", color: "white" }}
                    >
                      {inCart ? `✅ Add More (${inCart.qty})` : "Add to Cart →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "24px", paddingBottom: "8px" }}>
            <button
              onClick={() => loadProducts(page - 1)}
              disabled={page === 0}
              style={{ background: page === 0 ? "rgba(255,255,255,0.04)" : "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", color: page === 0 ? "rgba(255,255,255,0.2)" : "#60a5fa", cursor: page === 0 ? "not-allowed" : "pointer", fontFamily: "'Segoe UI', sans-serif" }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
              Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)} · {totalCount} crops
            </span>
            <button
              onClick={() => loadProducts(page + 1)}
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              style={{ background: (page + 1) * PAGE_SIZE >= totalCount ? "rgba(255,255,255,0.04)" : "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.25)", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", color: (page + 1) * PAGE_SIZE >= totalCount ? "rgba(255,255,255,0.2)" : "#60a5fa", cursor: (page + 1) * PAGE_SIZE >= totalCount ? "not-allowed" : "pointer", fontFamily: "'Segoe UI', sans-serif" }}
            >
              Next →
            </button>
          </div>
        )}
    </ConsumerLayout>
  );
}
