import { useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useData, DataState, ProductCard, PageHead, SEO, Empty } from "./ui";
export default function Shop() {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const [filters, setFilters] = useState(false);
  const query = new URLSearchParams(params);

  if (pathname === "/new") query.set("new", "true");
  const products = useData(
    ["products", query.toString()],
    "/products?" + query,
  );
  const categories = useData("categories", "/categories");
  const title =
    pathname === "/search"
      ? "Search: " + (params.get("q") || "All products")
      : pathname === "/new"
            ? "The latest drop."
            : "The collection.";
  function update(k, v) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "page") next.delete("page");
    setParams(next);
  }
  return (
    <div className="section shop">
      <SEO title={title} />
      <PageHead title={title}>
        Considered essentials. Bold expression. Find what feels like you.
      </PageHead>
      <div className="shop-bar">
        <button className="outline" onClick={() => setFilters(!filters)}>
          <SlidersHorizontal size={16} /> Filters {filters && <X size={14} />}
        </button>
        <span className="muted">{products.data?.total ?? "—"} pieces</span>
        <select
          aria-label="Sort products"
          value={params.get("sort") || "newest"}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="best-selling">Best selling</option>
        </select>
      </div>
      <div className={"shop-layout " + (filters ? "show-filters" : "")}>
        {filters && (
          <aside className="filters">
            <h3>Refine your edit</h3>
            <label>
              Category
              <select
                value={params.get("category") || ""}
                onChange={(e) => update("category", e.target.value)}
              >
                <option value="">All categories</option>
                {categories.data?.map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Size
              <select
                value={params.get("size") || ""}
                onChange={(e) => update("size", e.target.value)}
              >
                <option value="">All sizes</option>
                {["S", "M", "L", "XL"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Color
              <select
                value={params.get("color") || ""}
                onChange={(e) => update("color", e.target.value)}
              >
                <option value="">All colors</option>
                {["Black", "White", "Maroon", "Beige", "Pink"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Maximum price (₹)
              <input
                type="number"
                min="0"
                value={params.has("max") ? Number(params.get("max")) / 100 : ""}
                onChange={(e) =>
                  update(
                    "max",
                    e.target.value ? String(Number(e.target.value) * 100) : "",
                  )
                }
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={params.get("available") === "true"}
                onChange={(e) =>
                  update("available", e.target.checked ? "true" : "")
                }
              />{" "}
              In stock only
            </label>
            <button className="outline" onClick={() => setParams({})}>
              Clear filters
            </button>
          </aside>
        )}
        <div>
          <DataState query={products}>
            {(d) =>
              d.items.length ? (
                <>
                  <div className="product-grid">
                    {d.items.map((p) => (
                      <ProductCard key={p._id} p={p} />
                    ))}
                  </div>
                  <div className="pagination">
                    <button
                      disabled={d.page === 1}
                      onClick={() => update("page", String(d.page - 1))}
                    >
                      Previous
                    </button>
                    <span>
                      {d.page} / {d.pages}
                    </span>
                    <button
                      disabled={d.page >= d.pages}
                      onClick={() => update("page", String(d.page + 1))}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <Empty
                  title="No pieces found."
                  text="Try changing your filters."
                />
              )
            }
          </DataState>
        </div>
      </div>
    </div>
  );
}
