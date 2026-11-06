import { useStorefront } from "./storefront";
import { productImage } from "./product_images";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2, ArrowUpRight } from "lucide-react";
import {
  useCart,
  cartPayload,
  money,
  request,
  notify,
  errorText,
  useSession,
  api,
} from "./state";
import {
  useData,
  DataState,
  PageHead,
  SEO,
  Empty,
  Summary,
  AddressFields,
  Field,
} from "./ui";
export function Cart() {
  const cart = useCart();
  const [coupon, setCoupon] = useState(cart.coupon);
  const [quote, setQuote] = useState(null);
  const settings = useData("settings", "/settings/public");
  const subtotal = cart.items.reduce((n, i) => n + i.price * i.qty, 0);
  if (!cart.items.length)
    return (
      <Empty
        title="Your bag is waiting."
        text="Find the pieces that feel like you."
      />
    );
  return (
    <div className="section">
      <SEO title="Your bag" />
      <PageHead title="Your bag." eyebrow="FARMERI / YOUR EDIT" />
      <div className="checkout-layout">
        <div>
          {cart.items.map((i) => (
            <article className="cart-item" key={i.sku}>
              <Link to={"/product/" + i.slug}>
                <img src={productImage(i.image)} alt={i.name} />
              </Link>
              <div>
                <Link to={"/product/" + i.slug}>
                  <h3>{i.name}</h3>
                </Link>
                <p>
                  {i.size} / {i.color}
                </p>
                <p>{money(i.price)}</p>
                <div className="inline-form">
                  <input
                    type="number"
                    aria-label={"Quantity for " + i.name}
                    min="1"
                    max="20"
                    value={i.qty}
                    onChange={(e) => {
                      cart.quantity(i.sku, Number(e.target.value));
                      setQuote(null);
                    }}
                  />
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await request(
                          "/users/me/wishlist/" + i.product,
                          "post",
                        );
                        cart.remove(i.sku);
                        setQuote(null);
                        notify("Moved to wishlist");
                      } catch (e) {
                        notify(errorText(e));
                      }
                    }}
                  >
                    Move to wishlist
                  </button>
                </div>
              </div>
              <button
                className="icon"
                aria-label={"Remove " + i.name}
                onClick={() => {
                  cart.remove(i.sku);
                  setQuote(null);
                }}
              >
                <Trash2 size={18} />
              </button>
            </article>
          ))}
        </div>
        <aside className="panel order-summary">
          <h2>The details.</h2>
          <p>
            {subtotal >= (settings.data?.shippingThreshold ?? 199900)
              ? "Your bag qualifies for free shipping."
              : money((settings.data?.shippingThreshold ?? 199900) - subtotal) +
                " away from free shipping."}
          </p>
          <progress
            value={subtotal}
            max={Math.max(1, settings.data?.shippingThreshold ?? 199900)}
          />
          <form
            className="inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const r = await request("/checkout/quote", "post", {
                  items: cartPayload(cart.items),
                  coupon,
                });
                cart.setCoupon(coupon);
                setQuote(r);
                notify(coupon ? "Coupon applied" : "Totals updated");
              } catch (e) {
                notify(errorText(e));
              }
            }}
          >
            <input
              aria-label="Coupon code"
              placeholder="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
            <button className="outline">Apply</button>
          </form>
          {quote ? (
            <Summary data={quote} />
          ) : (
            <div className="summary-lines">
              <div className="total">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <small>
                Final shipping, tax and discounts calculated at checkout.
              </small>
            </div>
          )}
          <Link className="button full" to="/checkout">
            Go to checkout <ArrowUpRight size={18} />
          </Link>
          <Link className="text-link" to="/shop">
            Keep exploring
          </Link>
        </aside>
      </div>
    </div>
  );
}
export function Checkout() {
  const { checkout: copy } = useStorefront();
  const cart = useCart(),
    user = useSession((s) => s.user),
    navigate = useNavigate();
  const [busy, setBusy] = useState(false),
    [quote, setQuote] = useState(null),
    [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  const formRef = useRef();
  const addresses = useData("addresses", "/users/me/addresses", !!user);
  useEffect(() => {
    setQuote(null);
    key.current = crypto.randomUUID();
  }, [cart.items, cart.coupon]);
  async function totals() {
    try {
      const q = await request("/checkout/quote", "post", {
        items: cartPayload(cart.items),
        coupon: cart.coupon,
      });
      setQuote(q);
      setError("");
      return q;
    } catch (e) {
      setError(errorText(e));
      return null;
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const { email, paymentMethod, ...address } = values;
      const payload = {
        items: cartPayload(cart.items),
        coupon: cart.coupon,
        email: email || user.email,
        address,
        paymentMethod,
      };
      const r = await request("/orders", "post", payload, {
        headers: { "Idempotency-Key": key.current },
      });
      if (r.guestToken)
        sessionStorage.setItem("order:" + r.order._id, r.guestToken);
      if (paymentMethod === "razorpay") {
        await pay(r.order._id, r.guestToken, () => {
          cart.clear();
          navigate("/order/" + r.order._id);
        });
      } else {
        cart.clear();
        navigate("/order/" + r.order._id);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  if (!cart.items.length)
    return <Empty title="Add something to your bag first." />;
  return (
    <div className="section">
      <SEO title="Checkout" />
      <PageHead title={copy.title} eyebrow={copy.eyebrow} />
      <form ref={formRef} onSubmit={submit} className="checkout-layout">
        <div className="form panel">
          <h2>{copy.deliveryHeading}</h2>
          {!user && (
            <p>
              Have an account? <Link to="/login">Sign in</Link> or continue as a
              guest.
            </p>
          )}
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={user?.email}
            readOnly={!!user}
            required
          />
          {addresses.data?.some((a) => a.country === "Pakistan") && (
            <label>
              Use saved address
              <select
                defaultValue=""
                onChange={(e) => {
                  const a = addresses.data.find(
                    (a) => a._id === e.target.value,
                  );
                  if (a)
                    for (const [k, v] of Object.entries(a))
                      if (k !== "country" && formRef.current.elements[k])
                        formRef.current.elements[k].value = v;
                }}
              >
                <option value="">New address</option>
                {addresses.data.filter((a) => a.country === "Pakistan").map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} — {a.line1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <AddressFields />
          <h2>{copy.shippingHeading}</h2>
          <p>{copy.deliveryNote}</p>
          <h2>{copy.paymentHeading}</h2>
          <label className="radio">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              defaultChecked
            />{" "}
            {copy.paymentLabel}
          </label>
          <label className="check">
            <input type="checkbox" required /> I agree to the{" "}
            <Link to="/terms">terms</Link> and{" "}
            <Link to="/privacy">privacy policy</Link>.
          </label>
        </div>
        <aside className="panel order-summary">
          <h2>{copy.summaryHeading}</h2>
          {cart.items.map((i) => (
            <div className="mini-item" key={i.sku}>
              <img src={productImage(i.image)} alt="" />
              <span>
                {i.name}
                <small>
                  {i.size} / {i.color} × {i.qty}
                </small>
              </span>
              <strong>{money(i.price * i.qty)}</strong>
            </div>
          ))}
          {cart.coupon && (
            <p>
              Coupon: {cart.coupon}{" "}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  cart.setCoupon("");
                  setQuote(null);
                }}
              >
                Remove
              </button>
            </p>
          )}
          {quote ? (
            <Summary data={quote} />
          ) : (
            <p>Review the final amount before placing your order.</p>
          )}
          <button type="button" className="outline full" onClick={totals}>
            Calculate final total
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="full" disabled={busy || !quote}>
            {busy ? "Processing…" : "Place order"}
          </button>
          <small>
            Prices and availability are rechecked securely when you place your
            order.
          </small>
        </aside>
      </form>
    </div>
  );
}
async function pay(id, token, onSuccess) {
  const headers = token ? { "X-Order-Token": token } : {};
  const p = await request(
    "/payments/create-order",
    "post",
    { orderId: id },
    { headers },
  );
  if (!window.Razorpay)
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Payment window could not load"));
      document.body.appendChild(script);
    });
  await new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: p.key,
      amount: p.amount,
      currency: p.currency,
      name: "Farmeri",
      order_id: p.orderId,
      handler: async (r) => {
        try {
          await request(
            "/payments/verify",
            "post",
            {
              orderId: id,
              razorpay_payment_id: r.razorpay_payment_id,
              razorpay_signature: r.razorpay_signature,
            },
            { headers },
          );
          onSuccess();
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () =>
          reject(
            new Error(
              "Payment window closed. Your order remains pending for up to 30 minutes.",
            ),
          ),
      },
      theme: { color: "#1f6f7a" },
    });
    checkout.on("payment.failed", () =>
      reject(
        new Error(
          "Payment failed. You can try again before the order expires.",
        ),
      ),
    );
    checkout.open();
  });
}
export function OrderDetail() {
  const { id } = useParams();
  const token = sessionStorage.getItem("order:" + id);
  const [order, setOrder] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const headers = token ? { "X-Order-Token": token } : {};
  async function load() {
    try {
      setOrder(await request("/orders/" + id, "get", undefined, { headers }));
      setError("");
    } catch (e) {
      setError(errorText(e));
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  return (
    <div className="section narrow">
      <SEO title="Your order" />
      {error ? (
        <p className="error">{error}</p>
      ) : !order ? (
        <p>Loading order…</p>
      ) : (
        <>
          <PageHead
            title={
              order.paymentStatus === "pending"
                ? "One more step."
                : "Your order is in."
            }
            eyebrow={"ORDER / " + order.number}
          >
            Thank you for choosing Farmeri.
          </PageHead>
          <div className="panel">
            <div className="between">
              <span className="badge">{order.status}</span>
              <span>Payment: {order.paymentStatus}</span>
            </div>
            {order.items.map((i) => (
              <div className="mini-item" key={i.sku}>
                <img src={productImage(i.image)} alt="" />
                <span>
                  {i.name}
                  <small>
                    {i.size} / {i.color} × {i.qty}
                  </small>
                </span>
                <strong>{money(i.price * i.qty, order.currency)}</strong>
              </div>
            ))}
            <Summary data={order} />
            <p>
              {order.address.name}
              <br />
              {order.address.line1}
              <br />
              {order.address.city}, {order.address.postalCode}
            </p>
            <ol className="timeline">
              {order.history.map((h, i) => (
                <li key={i}>
                  <strong>{h.status}</strong>
                  <span>{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ol>
            {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}
            {order.paymentStatus === "refund_required" && (
              <p className="error">
                Support needs to resolve or refund this payment before
                fulfilment.
              </p>
            )}
            <div className="actions">
              <button
                onClick={async () => {
                  try {
                    const r = await api.get("/orders/" + id + "/invoice", {
                      headers,
                      responseType: "blob",
                    });
                    const url = URL.createObjectURL(r.data);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = order.number + ".pdf";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  } catch (e) {
                    notify(errorText(e));
                  }
                }}
              >
                Download invoice
              </button>
              <button className="outline" onClick={load}>
                Refresh status
              </button>
              {order.paymentMethod === "razorpay" &&
                order.paymentStatus === "pending" && (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await pay(id, token, load);
                      } catch (e) {
                        notify(errorText(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Complete payment
                  </button>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
