import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { defaults } from "./storefront";
import { request, errorText, notify } from "./state";

const names = {
  content: "Page content",
  href: "Link destination",
  label: "Label",
  enabled: "Show section",
  logoAlt: "Logo alternative text",
  hero: "Hero artwork & copy",
  fit: "Find your fit",
  everyday: "The everyday edit",
  newDrops: "New Drops",
  logo: "Logo",
  mobileLinks: "Hamburger menu links",
  links: "Links",
  navigation: "Navbar & hamburger",
  pages: "Store pages",
  shippingReturns: "Shipping & returns",
  seoTitle: "Homepage SEO title",
  seoDescription: "Homepage SEO description",
};
const nameOf = (key) =>
  names[key] ||
  (key[0].toUpperCase() + key.slice(1)).replace(/([a-z])([A-Z])/g, "$1 $2");
const imageKeys = ["logo", "image", "mountains", "statue", "clouds"];
const multiline = [
  "description",
  "story",
  "text",
  "instructions",
  "seoDescription",
];
const newRow = (node, key) => {
  if (Array.isArray(node)) return [];
  if (node && typeof node === "object")
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, newRow(v, k)]),
    );
  return key === "href" ? "/shop" : "";
};

function ImageField({ label, value, update, busyChange }) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="studio-image">
      <label>
        {label}
        <input
          value={value}
          onChange={(e) => update(e.target.value)}
          placeholder="Upload a photo or paste a Cloudinary URL"
        />
      </label>
      {value && <img src={value} alt="" />}
      <label>
        Upload {label.toLowerCase()}
        <input
          type="file"
          accept="image/png,image/webp,image/jpeg"
          disabled={uploading}
          onChange={async (event) => {
            const field = event.currentTarget;
            const file = field.files[0];
            if (!file) return;
            const body = new FormData();
            body.append("images", file);
            setUploading(true);
            busyChange(1);
            try {
              const [url] = await request("/admin/uploads", "post", body);
              update(url);
            } catch (e) {
              notify(errorText(e));
            } finally {
              field.value = "";
              setUploading(false);
              busyChange(-1);
            }
          }}
        />
      </label>
    </div>
  );
}
export { ImageField };

export function Inputs({
  field,
  value,
  example,
  change,
  busyChange,
  path = [],
}) {
  const label =
    typeof field === "number" ? "Item " + (field + 1) : nameOf(field);
  if (Array.isArray(example)) {
    const swap = (from, to) => {
      const copy = [...value];
      [copy[from], copy[to]] = [copy[to], copy[from]];
      change(path, copy);
    };
    return (
      <fieldset className="studio-group">
        <legend>{label}</legend>
        {value.map((entry, i) => (
          <div className="studio-entry" key={i}>
            <div className="between">
              <strong>{entry.label || entry.title || "Item " + (i + 1)}</strong>
              <div className="actions">
                <button
                  type="button"
                  className="outline"
                  disabled={!i}
                  aria-label="Move up"
                  onClick={() => swap(i, i - 1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="outline"
                  disabled={i === value.length - 1}
                  aria-label="Move down"
                  onClick={() => swap(i, i + 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="outline"
                  aria-label="Remove item"
                  onClick={() =>
                    change(
                      path,
                      value.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <Inputs
              field={i}
              value={entry}
              example={example[0]}
              change={change}
              busyChange={busyChange}
              path={[...path, i]}
            />
          </div>
        ))}
        <button
          type="button"
          className="outline"
          disabled={value.length >= 30}
          onClick={() => change(path, [...value, newRow(example[0])])}
        >
          <Plus size={15} /> Add item
        </button>
      </fieldset>
    );
  }
  if (typeof example === "object") {
    const controls = Object.entries(example)
      .filter(
        ([k]) =>
          !(field === "home" && ["seoTitle", "seoDescription"].includes(k)),
      )
      .map(([k, v]) => (
        <Inputs
          key={k}
          field={k}
          value={value[k]}
          example={v}
          change={change}
          busyChange={busyChange}
          path={[...path, k]}
        />
      ));
    if (typeof field === "number" || field === "button" || field === "policy")
      return <div className="form-grid">{controls}</div>;
    return (
      <details className="studio-details">
        <summary>{label}</summary>
        {controls}
      </details>
    );
  }
  if (typeof example === "boolean")
    return (
      <label className="check">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => change(path, e.target.checked)}
        />{" "}
        {label}
      </label>
    );
  if (imageKeys.includes(field))
    return (
      <ImageField
        label={label}
        value={value}
        update={(v) => change(path, v)}
        busyChange={busyChange}
      />
    );
  return (
    <label>
      {label}
      {multiline.includes(field) ? (
        <textarea
          rows={3}
          maxLength={4000}
          value={value}
          onChange={(e) => change(path, e.target.value)}
        />
      ) : (
        <input
          value={value}
          required={field === "href"}
          maxLength={field === "href" ? 1000 : 4000}
          onChange={(e) => change(path, e.target.value)}
        />
      )}
    </label>
  );
}

export function updated(value, path, next) {
  if (!path.length) return next;
  const [first, ...rest] = path;
  const copy = Array.isArray(value) ? [...value] : { ...value };
  copy[first] = updated(value[first], rest, next);
  return copy;
}

export default function StorefrontEditor({ initial, onSave }) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0);
  const change = (path, next) => setDraft((prev) => updated(prev, path, next));
  const busyChange = (delta) => setUploads((prev) => prev + delta);
  return (
    <form
      className="panel form storefront-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        if (uploads || saving) return;
        setSaving(true);
        try {
          await onSave(draft);
        } finally {
          setSaving(false);
        }
      }}
    >
      <p>
        Edit storefront text, images, menus and links. Open the section you want
        to edit, then save your changes.
      </p>
      <fieldset
        disabled={saving || uploads > 0}
        className="studio-editor-fields"
      >
        {Object.entries(defaults)
          .filter(([field]) => field !== "pages")
          .map(([field, example]) => (
            <Inputs
              key={field}
              field={field}
              value={draft[field]}
              example={example}
              change={change}
              busyChange={busyChange}
              path={[field]}
            />
          ))}
      </fieldset>
      <button disabled={saving || uploads > 0}>
        {saving ? "Saving…" : uploads ? "Uploading…" : "Save storefront"}
      </button>
    </form>
  );
}

export function RackEditor({ products, onToggle }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(null);
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="panel form">
      <p>
        {products.filter((p) => p.isRack).length} products on the rack. Changes
        save immediately and do not affect your catalogue.
      </p>
      <input
        aria-label="Find a product for the rack"
        placeholder="Find a product…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filtered.map((p) => (
        <div className="rack-admin-row" key={p._id}>
          <img src={p.hangerImage || p.images?.[0]} alt="" />
          <span>{p.name}</span>
          <button
            className="outline"
            disabled={busy !== null}
            onClick={async () => {
              setBusy(p._id);
              try {
                await onToggle(p._id, !p.isRack);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === p._id
              ? "Saving…"
              : p.isRack
                ? "Remove from rack"
                : "Add to rack"}
          </button>
        </div>
      ))}
      {!filtered.length && <p>No matching products.</p>}
    </div>
  );
}
