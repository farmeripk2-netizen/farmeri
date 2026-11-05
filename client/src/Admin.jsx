import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUpRight } from "lucide-react";
import { useSession, request, money, errorText, notify } from "./state";
import { useData, DataState, PageHead, Modal, Field, SEO } from "./ui";
const blankProduct = {
  name: "",
  slug: "",
  description: "",
  category: "oversized-tees",
  gender: "unisex",
  images: [],
  price: 230000,
  discountPrice: null,
  variants: [{ sku: "", size: "M", color: "Black", stock: 0 }],
  isFeatured: false,
  isNewArrival: true,
  isActive: true,
  fabric: "",
  care: "",
  tags: [],
  seo: { title: "", description: "", keywords: "" },
};
export default function Admin() {
  const user = useSession((s) => s.user),
    ready = useSession((s) => s.ready);
  const [tab, setTab] = useState("stats"),
    [edit, setEdit] = useState(null),
    [filter, setFilter] = useState("");
  const q = useData(["admin", tab], "/admin/" + tab, user?.role === "admin");
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  if (!ready) return <p className="section">Checking access…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin")
    return (
      <div className="section">
        <h1>Administrator access required.</h1>
        <Link to="/account">Return to your account</Link>
      </div>
    );
  async function mutate(path, method, data) {
    try {
      await request(path, method, data);
      notify("Saved");
      refresh();
      return true;
    } catch (e) {
      notify(errorText(e));
      return false;
    }
  }
  const tabs = [
    "stats",
    "products",
    "categories",
    "orders",
    "customers",
    "coupons",
    "reviews",
    "contacts",
    "settings",
  ];
  return (
    <div className="section admin">
      <SEO title="Admin studio" />
      <PageHead title="The studio." eyebrow="FARMERI / ADMINISTRATION" />
      <div className="admin-layout">
        <aside className="account-nav">
          {tabs.map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => {
                setTab(t);
                setFilter("");
              }}
            >
              {t === "stats" ? "Dashboard" : t}
            </button>
          ))}
          <Link to="/">View storefront ↗</Link>
        </aside>
        <div className="admin-content">
          <div className="between">
            <h2>
              {tab === "stats"
                ? "Overview"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </h2>
            {["products", "categories", "coupons"].includes(tab) && (
              <button
                onClick={() => setEdit(tab === "products" ? blankProduct : {})}
              >
                <Plus size={17} /> Add {tab.slice(0, -1)}
              </button>
            )}
          </div>
          {["products", "orders", "customers", "contacts"].includes(tab) && (
            <input
              className="admin-search"
              aria-label="Filter records"
              placeholder="Search these records…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
          <DataState query={q}>
            {(data) => {
              if (tab === "stats")
                return (
                  <>
                    <div className="stat-grid">
                      {[
                        ["Collected revenue", money(data.revenue)],
                        ["Orders", data.orders],
                        ["Customers", data.customers],
                      ].map(([label, value]) => (
                        <div className="panel" key={label}>
                          <small>{label}</small>
                          <h2>{value}</h2>
                        </div>
                      ))}
                    </div>
                    <div className="panel">
                      <h3>Top products · delivered units</h3>
                      {data.top.map((p) => (
                        <div className="bar-row" key={p._id}>
                          <span>{p.name}</span>
                          <div>
                            <i
                              style={{
                                width:
                                  Math.max(
                                    2,
                                    (p.soldCount /
                                      Math.max(
                                        1,
                                        ...data.top.map((x) => x.soldCount),
                                      )) *
                                      100,
                                  ) + "%",
                              }}
                            />
                          </div>
                          <b>{p.soldCount}</b>
                        </div>
                      ))}
                    </div>
                    <div className="panel">
                      <h3>Low stock</h3>
                      {data.lowStock.length ? (
                        data.lowStock.map((p) => (
                          <p key={p._id}>
                            {p.name} —{" "}
                            {p.variants
                              .filter((v) => v.stock <= 5)
                              .map((v) => v.size + ": " + v.stock)
                              .join(", ")}
                          </p>
                        ))
                      ) : (
                        <p>No low-stock alerts.</p>
                      )}
                    </div>
                    <h3>Recent orders</h3>
                    <Records
                      rows={data.recent}
                      columns={["number", "status", "total"]}
                      renderCell={(k, v) => (k === "total" ? money(v) : v)}
                    />
                  </>
                );
              if (tab === "settings")
                return (
                  <form
                    className="form panel"
                    key={data.updatedAt}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = e.currentTarget,
                        d = Object.fromEntries(new FormData(f));
                      await mutate("/admin/settings", "put", {
                        ...d,
                        announcementEnabled: f.announcementEnabled.checked,
                        shippingThreshold: Math.round(
                          Number(d.shippingThreshold) * 100,
                        ),
                        shippingFee: Math.round(Number(d.shippingFee) * 100),
                        taxPercent: Number(d.taxPercent),
                        serviceablePrefixes: d.serviceablePrefixes
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      });
                    }}
                  >
                    <Field
                      label="Hero headline"
                      name="headline"
                      defaultValue={data.headline}
                      required
                    />
                    <Field
                      label="Announcement"
                      name="announcement"
                      defaultValue={data.announcement}
                    />
                    <label className="check">
                      <input
                        type="checkbox"
                        name="announcementEnabled"
                        defaultChecked={data.announcementEnabled}
                      />{" "}
                      Announcement enabled
                    </label>
                    <Field
                      label="Free shipping threshold (₹)"
                      name="shippingThreshold"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={data.shippingThreshold / 100}
                    />
                    <Field
                      label="Shipping fee (₹)"
                      name="shippingFee"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={data.shippingFee / 100}
                    />
                    <Field
                      label="Tax percentage"
                      name="taxPercent"
                      type="number"
                      min="0"
                      max="30"
                      step="0.01"
                      defaultValue={data.taxPercent}
                    />
                    <Field
                      label="Support email"
                      name="supportEmail"
                      type="email"
                      defaultValue={data.supportEmail}
                      required
                    />
                    <Field
                      label="Serviceable PIN prefixes (comma-separated; blank = all)"
                      name="serviceablePrefixes"
                      defaultValue={data.serviceablePrefixes.join(",")}
                    />
                    <button>Save settings</button>
                  </form>
                );
              const rows = data.filter((r) =>
                JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()),
              );
              if (tab === "products")
                return (
                  <Records
                    rows={rows}
                    columns={["name", "price", "isActive"]}
                    renderCell={(k, v) =>
                      k === "price"
                        ? money(v)
                        : typeof v === "boolean"
                          ? v
                            ? "Active"
                            : "Archived"
                          : v
                    }
                    actions={(r) => (
                      <>
                        <button className="outline" onClick={() => setEdit(r)}>
                          Edit
                        </button>
                        <button
                          className="icon"
                          aria-label={"Archive " + r.name}
                          onClick={() => {
                            if (window.confirm("Archive this product?"))
                              mutate("/admin/products/" + r._id, "delete");
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  />
                );
              if (tab === "categories" || tab === "coupons")
                return (
                  <Records
                    rows={rows}
                    columns={
                      tab === "categories"
                        ? ["name", "slug", "isActive"]
                        : ["code", "type", "value", "usedCount", "isActive"]
                    }
                    actions={(r) => (
                      <>
                        <button className="outline" onClick={() => setEdit(r)}>
                          Edit
                        </button>
                        <button
                          className="outline"
                          onClick={() =>
                            mutate("/admin/" + tab + "/" + r._id, "delete")
                          }
                        >
                          Disable
                        </button>
                      </>
                    )}
                  />
                );
              if (tab === "customers")
                return (
                  <Records
                    rows={rows}
                    columns={["name", "email", "isVerified"]}
                  />
                );
              if (tab === "orders")
                return rows.length ? (
                  rows.map((o) => (
                    <div className="panel" key={o._id}>
                      <div className="between">
                        <Link to={"/order/" + o._id}>
                          <strong>{o.number} ↗</strong>
                        </Link>
                        <span>{money(o.total)}</span>
                      </div>
                      <p>
                        {o.email} · {o.paymentMethod} · {o.paymentStatus}
                      </p>
                      <small>
                        {o.items.map((i) => i.name + " × " + i.qty).join(" / ")}
                      </small>
                      <form
                        className="form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await mutate(
                            "/admin/orders/" + o._id + "/status",
                            "patch",
                            Object.fromEntries(new FormData(e.currentTarget)),
                          );
                        }}
                      >
                        <div className="form-grid">
                          <label>
                            Status
                            <select name="status" defaultValue={o.status}>
                              {[
                                "Pending",
                                "Confirmed",
                                "Packed",
                                "Shipped",
                                "Delivered",
                                "Cancelled",
                                "Returned",
                              ].map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </label>
                          <Field
                            label="Tracking number"
                            name="trackingNumber"
                            defaultValue={o.trackingNumber}
                          />
                        </div>
                        <Field
                          label="Refund / resolution note"
                          name="refundNote"
                          defaultValue={o.refundNote}
                        />
                        {o.paymentStatus === "refund_required" && (
                          <p className="error">
                            Resolve refund in Razorpay dashboard. This action
                            does not issue a refund.
                          </p>
                        )}
                        <button className="outline">Update order</button>
                      </form>
                    </div>
                  ))
                ) : (
                  <p>No orders yet.</p>
                );
              if (tab === "reviews")
                return rows.map((r) => (
                  <div className="panel" key={r._id}>
                    <strong>
                      {r.product?.name} — {r.rating}/5
                    </strong>
                    <p>{r.title}</p>
                    <p>{r.comment}</p>
                    <small>
                      {r.name} · {r.status}
                    </small>
                    <div className="actions">
                      {["approved", "rejected"].map((status) => (
                        <button
                          key={status}
                          className="outline"
                          onClick={() =>
                            mutate("/admin/reviews/" + r._id, "patch", {
                              status,
                            })
                          }
                        >
                          {status === "approved" ? "Approve" : "Reject"}
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              if (tab === "contacts")
                return rows.map((r) => (
                  <div className="panel" key={r._id}>
                    <h3>{r.subject}</h3>
                    <p>
                      {r.name} · {r.email}
                    </p>
                    <p className="preserve">{r.message}</p>
                    <select
                      aria-label="Message status"
                      value={r.status}
                      onChange={(e) =>
                        mutate("/admin/contacts/" + r._id, "patch", {
                          status: e.target.value,
                        })
                      }
                    >
                      {["new", "read", "resolved"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                ));
            }}
          </DataState>
        </div>
      </div>
      {edit && (
        <Modal
          title={
            edit._id ? "Edit " + tab.slice(0, -1) : "Add " + tab.slice(0, -1)
          }
          onClose={() => setEdit(null)}
        >
          {tab === "products" ? (
            <ProductEditor
              initial={edit}
              onSave={async (d) => {
                if (
                  await mutate(
                    "/admin/products" + (edit._id ? "/" + edit._id : ""),
                    edit._id ? "put" : "post",
                    d,
                  )
                )
                  setEdit(null);
              }}
            />
          ) : (
            <SimpleEditor
              type={tab}
              initial={edit}
              onSave={async (d) => {
                if (
                  await mutate(
                    "/admin/" + tab + (edit._id ? "/" + edit._id : ""),
                    edit._id ? "put" : "post",
                    d,
                  )
                )
                  setEdit(null);
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
function Records({ rows, columns, actions, renderCell }) {
  if (!rows.length) return <div className="panel">No records yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((k) => (
              <th key={k}>{k}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              {columns.map((k) => (
                <td key={k}>
                  {renderCell ? renderCell(k, r[k]) : String(r[k] ?? "—")}
                </td>
              ))}
              {actions && (
                <td>
                  <div className="actions">{actions(r)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ProductEditor({ initial, onSave }) {
  const [p, setP] = useState({ ...blankProduct, ...initial }),
    [busy, setBusy] = useState(false);
  const change = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(p);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field
        label="Name"
        value={p.name}
        onChange={(e) => change("name", e.target.value)}
        required
      />
      <Field
        label="Slug"
        value={p.slug}
        pattern="[a-z0-9-]+"
        onChange={(e) => change("slug", e.target.value)}
        required
      />
      <label>
        Description
        <textarea
          value={p.description}
          onChange={(e) => change("description", e.target.value)}
          required
        />
      </label>
      <div className="form-grid">
        <Field
          label="Category slug"
          value={p.category}
          onChange={(e) => change("category", e.target.value)}
          required
        />
        <label>
          Gender
          <select
            value={p.gender}
            onChange={(e) => change("gender", e.target.value)}
          >
            {["unisex", "men", "women"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <Field
          label="MRP (₹)"
          type="number"
          min="0.01"
          step="0.01"
          value={p.price / 100}
          onChange={(e) =>
            change("price", Math.round(Number(e.target.value) * 100))
          }
          required
        />
        <Field
          label="Sale price (₹)"
          type="number"
          min="0.01"
          step="0.01"
          value={p.discountPrice ? p.discountPrice / 100 : ""}
          onChange={(e) =>
            change(
              "discountPrice",
              e.target.value ? Math.round(Number(e.target.value) * 100) : null,
            )
          }
        />
      </div>
      <label>
        Images (one local /assets/ path or Cloudinary URL per line)
        <textarea
          value={p.images.join("\n")}
          onChange={(e) => change("images", e.target.value.split("\n"))}
          required
        />
      </label>
      <label>
        Upload images
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={async (e) => {
            const form = new FormData();
            for (const file of e.target.files) form.append("images", file);
            try {
              const urls = await request("/admin/uploads", "post", form);
              change("images", [...p.images.filter(Boolean), ...urls]);
            } catch (e) {
              notify(errorText(e));
            }
          }}
        />
      </label>
      <div className="upload-previews">
        {p.images.filter(Boolean).map((src, i) => (
          <img key={i} src={src} alt={"Product image " + (i + 1)} />
        ))}
      </div>
      <h3>Variants</h3>
      <small>
        SKUs are stable inventory identifiers. Keep existing SKUs when editing.
      </small>
      {p.variants.map((v, i) => (
        <div className="variant-row" key={i}>
          {["sku", "size", "color", "stock"].map((k) => (
            <label key={k}>
              {k}
              <input
                value={v[k]}
                type={k === "stock" ? "number" : "text"}
                min="0"
                required
                onChange={(e) =>
                  change(
                    "variants",
                    p.variants.map((old, j) =>
                      i === j
                        ? {
                            ...old,
                            [k]:
                              k === "stock"
                                ? Number(e.target.value)
                                : e.target.value,
                          }
                        : old,
                    ),
                  )
                }
              />
            </label>
          ))}
          <button
            type="button"
            className="icon"
            aria-label="Remove variant"
            disabled={p.variants.length === 1}
            onClick={() =>
              change(
                "variants",
                p.variants.filter((_, j) => i !== j),
              )
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        className="outline"
        type="button"
        onClick={() =>
          change("variants", [
            ...p.variants,
            { sku: "", size: "M", color: "Black", stock: 0 },
          ])
        }
      >
        Add variant
      </button>
      <Field
        label="Fabric"
        value={p.fabric}
        onChange={(e) => change("fabric", e.target.value)}
      />
      <Field
        label="Care"
        value={p.care}
        onChange={(e) => change("care", e.target.value)}
      />
      <Field
        label="Tags (comma-separated)"
        value={p.tags.join(",")}
        onChange={(e) => change("tags", e.target.value.split(","))}
      />
      {["isFeatured", "isNewArrival", "isActive"].map((k) => (
        <label className="check" key={k}>
          <input
            type="checkbox"
            checked={p[k]}
            onChange={(e) => change(k, e.target.checked)}
          />
          {k}
        </label>
      ))}
      <h3>Search engine preview</h3>
      {["title", "description", "keywords"].map((k) => (
        <Field
          key={k}
          label={"SEO " + k}
          value={p.seo?.[k] || ""}
          onChange={(e) => change("seo", { ...p.seo, [k]: e.target.value })}
        />
      ))}
      <button disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
    </form>
  );
}
function SimpleEditor({ type, initial, onSave }) {
  const coupon = type === "coupons";
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          d = Object.fromEntries(new FormData(form));
        d.isActive = form.isActive.checked;
        if (coupon) {
          d.value = Number(d.value);
          d.minCart = Math.round(Number(d.minCart) * 100);
          d.usageLimit = Number(d.usageLimit);
          d.maxDiscount = d.maxDiscount
            ? Math.round(Number(d.maxDiscount) * 100)
            : null;
          if (d.type === "flat") d.value = Math.round(d.value * 100);
        }
        await onSave(d);
      }}
    >
      {coupon ? (
        <>
          <Field
            label="Code"
            name="code"
            defaultValue={initial.code}
            required
          />
          <label>
            Type
            <select name="type" defaultValue={initial.type || "percent"}>
              <option value="percent">Percentage</option>
              <option value="flat">Flat amount (₹)</option>
            </select>
          </label>
          <Field
            label="Value (% or ₹)"
            name="value"
            type="number"
            step="0.01"
            min="1"
            defaultValue={
              initial.type === "flat"
                ? initial.value / 100
                : initial.value || 10
            }
            required
          />
          <Field
            label="Minimum cart (₹)"
            name="minCart"
            type="number"
            min="0"
            defaultValue={(initial.minCart || 0) / 100}
          />
          <Field
            label="Maximum discount (₹; optional)"
            name="maxDiscount"
            type="number"
            min="1"
            defaultValue={initial.maxDiscount ? initial.maxDiscount / 100 : ""}
          />
          <Field
            label="Expiry"
            name="expiry"
            type="date"
            defaultValue={initial.expiry?.slice(0, 10)}
            required
          />
          <Field
            label="Usage limit"
            name="usageLimit"
            type="number"
            min="1"
            defaultValue={initial.usageLimit || 100}
            required
          />
        </>
      ) : (
        <>
          <Field
            label="Name"
            name="name"
            defaultValue={initial.name}
            required
          />
          <Field
            label="Slug"
            name="slug"
            pattern="[a-z0-9-]+"
            defaultValue={initial.slug}
            required
          />
          <Field label="Image URL" name="image" defaultValue={initial.image} />
          <label>
            Gender
            <select name="gender" defaultValue={initial.gender || "unisex"}>
              {["unisex", "men", "women"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <label className="check">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial.isActive !== false}
        />{" "}
        Active
      </label>
      <button>Save</button>
    </form>
  );
}
