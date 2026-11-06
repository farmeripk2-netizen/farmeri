import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";
import { Inputs, updated } from "./StorefrontEditor";
import { defaults } from "./storefront";
import { Field } from "./ui";

const blank = {
  title: "",
  slug: "",
  intro: "",
  sections: [],
  published: false,
  seo: {
    title: "",
    description: "",
    keywords: "",
    noIndex: false,
  },
};
const sectionExample = [{ title: "", text: "" }];
const toSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "");

function PageForm({ initial, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => structuredClone(initial || blank));
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [slugChanged, setSlugChanged] = useState(false);
  const change = (path, value) =>
    setDraft((prev) => updated(prev, path, value));
  const busyChange = (delta) => setUploads((n) => n + delta);
  const example =
    draft.field === "new"
      ? { title: defaults.pages.shop.newTitle }
      : defaults.pages[draft.field];

  return (
    <form
      className="panel form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving || uploads) return;
        setSaving(true);
        try {
          await onSave(draft);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="between">
        <h3>{initial ? "Edit " + initial.label : "Add page"}</h3>
        <button
          className="outline"
          type="button"
          disabled={saving || uploads > 0}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
      {initial && (
        <p>
          Page URL: <code>{initial.path}</code>
        </p>
      )}
      <fieldset
        className="studio-editor-fields"
        disabled={saving || uploads > 0}
      >
        {!draft.builtIn ? (
          <>
            <Field
              label="Page title"
              value={draft.title}
              required
              maxLength={160}
              onChange={(e) => {
                const value = e.target.value;
                setDraft((prev) => ({
                  ...prev,
                  title: value,
                  ...(!initial && !slugChanged ? { slug: toSlug(value) } : {}),
                }));
              }}
            />
            {!initial && (
              <Field
                label="Page URL slug"
                value={draft.slug}
                required
                maxLength={80}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                onChange={(e) => {
                  setSlugChanged(true);
                  change(["slug"], e.target.value);
                }}
              />
            )}
            <label>
              Introduction
              <textarea
                rows={3}
                maxLength={1500}
                value={draft.intro}
                onChange={(e) => change(["intro"], e.target.value)}
              />
            </label>
            <Inputs
              field="sections"
              value={draft.sections}
              example={sectionExample}
              change={change}
              busyChange={busyChange}
              path={["sections"]}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => change(["published"], e.target.checked)}
              />{" "}
              Published and visible on the website
            </label>
          </>
        ) : example && draft.content ? (
          <Inputs
            field="content"
            value={draft.content}
            example={example}
            change={change}
            busyChange={busyChange}
            path={["content"]}
          />
        ) : (
          <p className="muted">
            {draft.slug === "home"
              ? "Edit homepage sections in Storefront."
              : draft.slug === "checkout"
                ? "Edit checkout copy in Storefront. Checkout behaviour stays as configured."
                : "This is a built-in store screen. Its layout and functionality stay as configured."}
          </p>
        )}
        <fieldset className="studio-group">
          <legend>Search engine settings</legend>
          <Field
            label="SEO title"
            maxLength={160}
            value={draft.seo.title}
            onChange={(e) => change(["seo", "title"], e.target.value)}
          />
          <label>
            SEO description
            <textarea
              rows={3}
              maxLength={500}
              value={draft.seo.description}
              onChange={(e) => change(["seo", "description"], e.target.value)}
            />
          </label>
          <Field
            label="SEO keywords"
            maxLength={500}
            placeholder="Separate keywords with commas"
            value={draft.seo.keywords}
            onChange={(e) => change(["seo", "keywords"], e.target.value)}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={draft.seo.noIndex}
              disabled={draft.lockedNoIndex}
              onChange={(e) => change(["seo", "noIndex"], e.target.checked)}
            />{" "}
            Keep out of search results
            {draft.lockedNoIndex ? " (built-in store screen)" : ""}
          </label>
        </fieldset>
      </fieldset>
      <button disabled={saving || uploads > 0}>
        {saving ? "Saving…" : uploads ? "Uploading…" : "Save page"}
      </button>
    </form>
  );
}

export default function PageManager({ pages, mutate }) {
  const [selection, setSelection] = useState(null);
  const [filter, setFilter] = useState("");
  const initial = pages.find((p) => p.slug === selection);
  if (selection)
    return (
      <PageForm
        key={selection}
        initial={initial}
        onCancel={() => setSelection(null)}
        onSave={async (draft) => {
          const saved = initial
            ? await mutate(
                "/admin/pages/" + encodeURIComponent(initial.slug),
                "put",
                draft,
              )
            : await mutate("/admin/pages", "post", draft);
          if (saved) setSelection(null);
        }}
      />
    );
  const matching = pages.filter((p) =>
    (p.label + " " + p.path)
      .toLowerCase()
      .includes(filter.trim().toLowerCase()),
  );
  return (
    <div className="panel form">
      <div className="between">
        <p>
          Manage existing pages and create new ones. Use Storefront to add a
          published page to your menus.
        </p>
        <button type="button" onClick={() => setSelection("+")}>
          <Plus size={17} /> Add page
        </button>
      </div>
      <input
        aria-label="Find a page"
        placeholder="Find a page…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {matching.map((page) => (
        <div className="studio-page-row" key={page.slug}>
          <div>
            <strong>{page.label}</strong>
            <small>
              {page.path} ·{" "}
              {page.builtIn
                ? "Built-in"
                : page.published
                  ? "Published"
                  : "Draft"}
            </small>
          </div>
          <div className="actions">
            {page.published && (
              <Link to={page.path} aria-label={"View " + page.label}>
                <ArrowUpRight size={17} />
              </Link>
            )}
            <button
              type="button"
              className="outline"
              onClick={() => setSelection(page.slug)}
              aria-label={"Edit " + page.label}
            >
              Edit
            </button>
          </div>
        </div>
      ))}
      {!matching.length && <p>No matching pages.</p>}
    </div>
  );
}
