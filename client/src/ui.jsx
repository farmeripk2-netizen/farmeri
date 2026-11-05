import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Heart, ArrowUpRight, X, Plus } from "lucide-react";
import {
  request,
  errorText,
  money,
  notify,
  useSession,
  useCart,
} from "./state";
export const useData = (key, path, enabled = true) =>
  useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => request(path),
    enabled,
    retry: 1,
  });
export function SEO({
  title = "Every Fit Counts",
  description = "Independent spirit. Uncompromising streetwear. Discover Farmeri graphic essentials.",
  image,
}) {
  const loc = useLocation();
  const url =
    (import.meta.env.VITE_SITE_URL || window.location.origin) + loc.pathname;
  return (
    <Helmet>
      <title>{title} | Farmeri</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title + " | Farmeri"} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      {image && <meta property="og:image" content={new URL(image, url).href} />}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}
export function DataState({ query, children }) {
  if (query.isPending)
    return (
      <div className="skeleton-grid" aria-label="Loading">
        <div />
        <div />
        <div />
      </div>
    );
  if (query.isError)
    return (
      <div className="empty" role="alert">
        <h3>Could not load this page.</h3>
        <p>{errorText(query.error)}</p>
        <button onClick={() => query.refetch()}>Try again</button>
      </div>
    );
  return children(query.data);
}
export function Empty({
  title = "Nothing here yet",
  text,
  link = "/shop",
  label = "Explore the collection",
}) {
  return (
    <div className="empty">
      <span className="eyebrow">FARMERI / YOUR SPACE</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      <Link className="button" to={link}>
        {label}
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
export function PageHead({
  eyebrow = "FARMERI / THE COLLECTION",
  title,
  children,
}) {
  return (
    <header className="page-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current.querySelectorAll(
          'button,a,input,select,textarea,[tabindex="0"]',
        );
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon" aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function ProductCard({ p }) {
  const user = useSession((s) => s.user);
  const [quick, setQuick] = useState(false);
  const add = useCart((s) => s.add);
  async function wish() {
    if (!user) {
      notify("Sign in to save your wishlist");
      return;
    }
    try {
      await request("/users/me/wishlist/" + p._id, "post");
      notify("Saved to wishlist");
    } catch (e) {
      notify(errorText(e));
    }
  }
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={"/product/" + p.slug} aria-label={p.name}>
          <img src={p.images[0]} alt={p.name} loading="lazy" />
          {p.images[1] && (
            <img
              className="alternate"
              src={p.images[1]}
              alt={`${p.name} back view`}
              loading="lazy"
            />
          )}
        </Link>
        <div className="product-flags">
          {p.isNewArrival && <span>NEW</span>}
          {p.discountPrice && <span>SALE</span>}
        </div>
        <button className="heart" aria-label={"Save " + p.name} onClick={wish}>
          <Heart size={18} />
        </button>
        <button className="quick-add" onClick={() => setQuick(true)}>
          Quick add <Plus size={16} />
        </button>
      </div>
      <Link to={"/product/" + p.slug}>
        <h3>{p.name}</h3>
      </Link>
      <p>{p.category === "hoodies" ? "Relaxed Hoodie" : "Oversized Tshirt"}</p>
      <div className="price">
        MRP : ₹{((p.discountPrice || p.price) / 100).toFixed(2)}{" "}
        {p.discountPrice && <del>{money(p.price)}</del>}
      </div>
      {quick && (
        <Modal title="Choose your fit" onClose={() => setQuick(false)}>
          <p>{p.name}</p>
          <div className="sizes">
            {p.variants.map((v) => (
              <button
                key={v.sku}
                disabled={!v.stock}
                onClick={() => {
                  add(p, v);
                  setQuick(false);
                }}
              >
                {v.size} / {v.color}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </article>
  );
}
export function Field({ label, name, type = "text", ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name || label.toLowerCase()} type={type} {...props} />
    </label>
  );
}
export function AddressFields() {
  return (
    <>
      <Field label="Full name" name="name" autoComplete="name" required />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        required
      />
      <Field
        label="Street address"
        name="line1"
        autoComplete="address-line1"
        required
      />
      <Field
        label="Apartment / landmark"
        name="line2"
        autoComplete="address-line2"
      />
      <div className="form-grid">
        <Field label="City" name="city" required />
        <Field label="State" name="state" required />
        <Field
          label="PIN code"
          name="postalCode"
          inputMode="numeric"
          pattern="[0-9]{6}"
          required
        />
        <Field label="Country" name="country" value="India" readOnly />
      </div>
    </>
  );
}
export function Summary({ data }) {
  return (
    <div className="summary-lines">
      {["subtotal", "discount", "shipping", "tax", "total"].map((k) => (
        <div key={k} className={k === "total" ? "total" : ""}>
          <span>{k}</span>
          <strong>
            {k === "discount" && data[k] > 0 ? "-" : ""}
            {money(data[k])}
          </strong>
        </div>
      ))}
    </div>
  );
}
export function Newsletter() {
  const [busy, setBusy] = useState(false);
  return (
    <section className="newsletter">
      <div>
        <span className="eyebrow">THE INNER CIRCLE</span>
        <h2>
          Good things.
          <br />
          No noise.
        </h2>
        <p>New drops, studio notes and first access. In your inbox.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          try {
            const r = await request("/newsletter", "post", {
              email: new FormData(form).get("email"),
            });
            notify(r.message);
            form.reset();
          } catch (e) {
            notify(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="sr-only" htmlFor="newsletter">
          Email address
        </label>
        <input
          id="newsletter"
          type="email"
          name="email"
          placeholder="Your email address"
          required
        />
        <button aria-label="Join newsletter" disabled={busy}>
          <ArrowUpRight />
        </button>
        <small>
          By subscribing, you agree to our{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </small>
      </form>
    </section>
  );
}
