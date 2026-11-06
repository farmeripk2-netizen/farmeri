import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  ArrowUpRight,
  Truck,
  ShieldCheck,
  ZoomIn,
  Star,
} from "lucide-react";
import { useData, DataState, SEO, Modal, Field, ProductCard } from "./ui";
import {
  request,
  errorText,
  money,
  useCart,
  useSession,
  notify,
} from "./state";
export default function Product() {
  const { slug } = useParams();
  const q = useData(["product", slug], "/products/" + slug);
  return <DataState query={q}>{(p) => <Detail key={p._id} p={p} />}</DataState>;
}
function Detail({ p }) {
  const [image, setImage] = useState(0),
    [sku, setSku] = useState(""),
    [qty, setQty] = useState(1),
    [modal, setModal] = useState(null);
  const add = useCart((s) => s.add),
    user = useSession((s) => s.user),
    navigate = useNavigate();
  const reviews = useData(
      ["reviews", p._id],
      "/products/" + p._id + "/reviews",
    ),
    related = useData(["related", p.slug], "/products/" + p.slug + "/related");
  const variant = p.variants.find((v) => v.sku === sku);
  function addItem(buy = false) {
    if (!variant) {
      notify("Choose your size and color first");
      return;
    }
    if (qty > variant.stock) {
      notify("Not enough stock for this quantity");
      return;
    }
    add(p, variant, qty);
    if (buy) navigate("/checkout");
  }
  return (
    <div className="section">
      <SEO
        title={p.seo?.title || p.name}
        description={p.seo?.description || p.description}
        image={p.images[0]}
      />
      <div className="breadcrumbs">
        <Link to="/">Home</Link> / <Link to="/shop">Shop</Link> / {p.name}
      </div>
      <div className="product-detail">
        <div className="gallery">
          <button
            className="main-photo"
            onClick={() => setModal("zoom")}
            aria-label="Zoom product image"
          >
            <img src={p.images[image]} alt={p.name} />
            <ZoomIn />
          </button>
          <div className="thumbnails">
            {p.images.map((src, i) => (
              <button
                key={src + i}
                aria-label={"View image " + (i + 1)}
                className={image === i ? "selected" : ""}
                onClick={() => setImage(i)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="product-info">
          <span className="eyebrow">FARMERI ORIGINALS / {p.category}</span>
          <h1>{p.name}</h1>
          <div className="rating">
            <Star size={15} />
            {p.ratingAverage.toFixed(1)}{" "}
            <a href="#reviews">({p.ratingCount} reviews)</a>
          </div>
          <div className="detail-price">
            {money(p.discountPrice || p.price)}{" "}
            {p.discountPrice && <del>{money(p.price)}</del>}
          </div>
          <p className="muted">
            Inclusive of configured taxes. Shipping calculated at checkout.
          </p>
          <p>{p.description}</p>
          <div className="between">
            <strong>Select your fit</strong>
            <button className="text-button" onClick={() => setModal("size")}>
              Size guide ↗
            </button>
          </div>
          <div className="sizes">
            {p.variants.map((v) => (
              <button
                className={sku === v.sku ? "selected" : ""}
                key={v.sku}
                disabled={!v.stock}
                onClick={() => {
                  setSku(v.sku);
                  setQty(1);
                }}
              >
                {v.size}
                <small>{v.color}</small>
              </button>
            ))}
          </div>
          {variant && (
            <p className="muted">
              {variant.stock < 6 ? `Only ${variant.stock} left` : "In stock"} ·{" "}
              {variant.color}
            </p>
          )}
          <div className="purchase-row">
            <input
              type="number"
              aria-label="Quantity"
              min="1"
              max={Math.min(20, variant?.stock || 20)}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Math.min(20, Number(e.target.value))))
              }
            />
            <button className="primary" onClick={() => addItem()}>
              Add to bag <ArrowUpRight size={18} />
            </button>
            <button
              className="outline"
              aria-label="Save to wishlist"
              onClick={async () => {
                if (!user) {
                  navigate("/login");
                  return;
                }
                try {
                  await request("/users/me/wishlist/" + p._id, "post");
                  notify("Saved to wishlist");
                } catch (e) {
                  notify(errorText(e));
                }
              }}
            >
              <Heart size={18} />
            </button>
          </div>
          <button className="outline full" onClick={() => addItem(true)}>
            Buy now
          </button>
          <div className="delivery">
            <Truck size={18} />
            <span>Find delivery availability</span>
          </div>
          <form
            className="inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const r = await request("/shipping/check", "post", {
                  postalCode: new FormData(e.currentTarget).get("postalCode"),
                });
                notify(
                  r.available ? r.message : "Delivery unavailable for this postal code",
                );
              } catch (e) {
                notify(errorText(e));
              }
            }}
          >
            <input
              name="postalCode"
              placeholder="Enter postal code"
              aria-label="Delivery postal code"
              inputMode="numeric"
              pattern="[0-9]{5}"
              required
            />
            <button className="outline">Check</button>
          </form>
          <p className="muted">
            <ShieldCheck size={15} /> Secure checkout · Cash on delivery
            available
          </p>
          {[
            ["Description", p.description],
            ["Fabric & care", p.fabric + " " + p.care],
            [
              "Shipping & returns",
              "See our shipping and returns page for the current delivery and return policy.",
            ],
          ].map(([title, text]) => (
            <details key={title}>
              <summary>{title}</summary>
              <p>{text}</p>
              {title === "Shipping & returns" && (
                <Link to="/shipping-returns">Read policy ↗</Link>
              )}
            </details>
          ))}
        </div>
      </div>
      <section id="reviews" className="reviews-section">
        <div className="section-heading">
          <h2>From the community.</h2>
        </div>
        {reviews.data?.length ? (
          reviews.data.map((r) => (
            <article className="panel" key={r._id}>
              <strong>
                {r.name} · {r.rating}/5
              </strong>
              <small> Verified purchase</small>
              <h3>{r.title}</h3>
              <p>{r.comment}</p>
            </article>
          ))
        ) : (
          <p className="muted">
            No reviews yet. Be the first to share your experience after
            delivery.
          </p>
        )}
        {user && (
          <form
            className="panel form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const d = Object.fromEntries(new FormData(form));
              try {
                await request("/reviews", "post", {
                  ...d,
                  product: p._id,
                  rating: Number(d.rating),
                });
                notify("Review submitted for moderation");
                form.reset();
              } catch (e) {
                notify(errorText(e));
              }
            }}
          >
            <h3>Write a review</h3>
            <Field label="Title" name="title" required />
            <label>
              Rating
              <select name="rating">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Your experience
              <textarea name="comment" minLength="5" required />
            </label>
            <button>Submit review</button>
          </form>
        )}
      </section>
      {related.data?.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>You may also like.</h2>
          </div>
          <div className="product-grid">
            {related.data.map((p) => (
              <ProductCard p={p} key={p._id} />
            ))}
          </div>
        </section>
      )}
      {modal && (
        <Modal
          title={modal === "zoom" ? p.name : "Find your size"}
          onClose={() => setModal(null)}
        >
          {modal === "zoom" ? (
            <img className="zoom-image" src={p.images[image]} alt={p.name} />
          ) : (
            <>
              <p>
                Sample size guide. Check final garment measurements before
                ordering.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Chest (in)</th>
                    <th>Length (in)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["S", 42, 27],
                    ["M", 44, 28],
                    ["L", 46, 29],
                    ["XL", 48, 30],
                  ].map((r) => (
                    <tr key={r[0]}>
                      {r.map((v) => (
                        <td key={v}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
