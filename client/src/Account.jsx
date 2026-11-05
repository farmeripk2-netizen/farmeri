import { useState, useEffect } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  request,
  useSession,
  useCart,
  loginCart,
  notify,
  errorText,
  money,
} from "./state";
import {
  useData,
  DataState,
  PageHead,
  SEO,
  Field,
  AddressFields,
  ProductCard,
  Empty,
} from "./ui";
export function Auth() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const mode = pathname.slice(1);
  const schema = z.object({
    email:
      mode === "reset-password"
        ? z.string().optional()
        : z.string().email("Enter a valid email"),
    password: ["forgot-password", "verify-email"].includes(mode)
      ? z.string().optional()
      : z
          .string()
          .min(
            mode === "register" || mode === "reset-password" ? 10 : 1,
            "Use at least 10 characters",
          ),
    name:
      mode === "register"
        ? z.string().min(2, "Enter your name")
        : z.string().optional(),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  const title = {
    login: "Welcome back.",
    register: "Find your people.",
    "forgot-password": "Let’s get you back in.",
    "reset-password": "A fresh start.",
    "verify-email": "Verify your email.",
  }[mode];
  async function submit(d) {
    setError("");
    try {
      const path = {
        login: "login",
        register: "register",
        "forgot-password": "forgot-password",
        "reset-password": "reset-password",
      }[mode];
      const r = await request("/auth/" + path, "post", {
        ...d,
        ...(mode === "reset-password" ? { token: params.get("token") } : {}),
      });
      if (mode === "login" || mode === "register") {
        useSession.getState().setSession(r);
        await loginCart();
        navigate("/account");
      } else setMessage(r.message);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <section className="auth-shell">
      <div className="auth-art">
        <span className="eyebrow">FARMERI / THE INNER CIRCLE</span>
        <h2>
          YOUR WORLD.
          <br />
          YOUR RULES.
        </h2>
        <img src="/assets/winged-statue.png" alt="" />
        <span className="auth-bottom">EVERY FIT COUNTS.</span>
      </div>
      <div className="auth-form">
        <SEO title={title} />
        <PageHead title={title} eyebrow="FARMERI / YOUR ACCOUNT" />
        {mode === "verify-email" ? (
          <>
            <p>Confirm your email using the link sent to your inbox.</p>
            <button
              onClick={async () => {
                try {
                  const r = await request("/auth/verify-email", "post", {
                    token: params.get("token"),
                  });
                  setMessage(r.message);
                } catch (e) {
                  setError(errorText(e));
                }
              }}
            >
              Verify email
            </button>
          </>
        ) : (
          <form className="form" onSubmit={handleSubmit(submit)}>
            {mode === "register" && (
              <label>
                Your name
                <input autoComplete="name" {...register("name")} />
                {errors.name && (
                  <small className="error">{errors.name.message}</small>
                )}
              </label>
            )}
            {mode !== "reset-password" && (
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <small className="error">{errors.email.message}</small>
                )}
              </label>
            )}
            {mode !== "forgot-password" && (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  {...register("password")}
                />
                {errors.password && (
                  <small className="error">{errors.password.message}</small>
                )}
              </label>
            )}
            {mode === "register" && (
              <label className="check">
                <input type="checkbox" required /> I agree to the{" "}
                <Link to="/terms">terms</Link>.
              </label>
            )}
            <button disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : mode === "register"
                    ? "Create account"
                    : mode === "forgot-password"
                      ? "Send reset link"
                      : "Update password"}
            </button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link to="/forgot-password">Forgot password?</Link>
              <p>
                New around here?{" "}
                <Link to="/register">Create an account ↗</Link>
              </p>
            </>
          ) : (
            <Link to="/login">Back to sign in ↗</Link>
          )}
        </div>
      </div>
    </section>
  );
}
export function Account() {
  const user = useSession((s) => s.user),
    ready = useSession((s) => s.ready);
  const [tab, setTab] = useState("orders"),
    [editing, setEditing] = useState(null);
  const q = useData("profile", "/users/me", !!user),
    orders = useData("orders", "/orders/mine", !!user);
  const client = useQueryClient();
  if (!ready) return <p className="section">Loading session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  async function submit(e, path, method = "patch") {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      const r = await request(
        path,
        method,
        Object.fromEntries(new FormData(form)),
      );
      notify(r.message || "Saved successfully");
      client.invalidateQueries({ queryKey: ["profile"] });
      setEditing(null);
    } catch (e) {
      notify(errorText(e));
    }
  }
  return (
    <div className="section">
      <SEO title="Your account" />
      <PageHead
        title={"Hey, " + user.name.split(" ")[0] + "."}
        eyebrow="FARMERI / YOUR SPACE"
      />
      <div className="account-layout">
        <aside className="account-nav">
          {["orders", "profile", "addresses", "password"].map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <Link to="/wishlist">Wishlist</Link>
          {user.role === "admin" && <Link to="/admin">Admin studio ↗</Link>}
          <button
            onClick={async () => {
              try {
                await request("/auth/logout", "post");
              } finally {
                useSession.getState().setSession(null);
                useCart.getState().setItems([]);
                client.clear();
              }
            }}
          >
            Sign out
          </button>
        </aside>
        <div>
          {!user.isVerified && (
            <div className="panel">
              <p>Please verify your email to submit product reviews.</p>
              <button
                className="outline"
                onClick={async () => {
                  try {
                    await request("/auth/resend-verification", "post");
                    notify("Verification email queued");
                  } catch (e) {
                    notify(errorText(e));
                  }
                }}
              >
                Resend verification
              </button>
            </div>
          )}
          {tab === "orders" && (
            <DataState query={orders}>
              {(rows) =>
                rows.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((o) => (
                          <tr key={o._id}>
                            <td>{o.number}</td>
                            <td>
                              {new Date(o.createdAt).toLocaleDateString()}
                            </td>
                            <td>{money(o.total)}</td>
                            <td>
                              <span className="badge">{o.status}</span>
                            </td>
                            <td>
                              <Link to={"/order/" + o._id}>View ↗</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Your first chapter awaits."
                    text="Your orders will appear here."
                  />
                )
              }
            </DataState>
          )}
          {tab === "profile" && (
            <form
              className="form panel"
              onSubmit={(e) => submit(e, "/users/me")}
            >
              <h2>Your details</h2>
              <Field
                label="Name"
                name="name"
                defaultValue={q.data?.name || user.name}
                required
              />
              <Field label="Email" defaultValue={user.email} disabled />
              <button>Save changes</button>
            </form>
          )}
          {tab === "password" && (
            <form
              className="form panel"
              onSubmit={(e) => submit(e, "/users/me/password")}
            >
              <h2>Change password</h2>
              <Field
                label="Current password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
              <Field
                label="New password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength="10"
                required
              />
              <button>Update password</button>
            </form>
          )}
          {tab === "addresses" && (
            <>
              <h2>Saved addresses</h2>
              <div className="address-grid">
                {q.data?.addresses.map((a) => (
                  <div className="panel" key={a._id}>
                    <strong>{a.name}</strong>
                    <p>
                      {a.line1}
                      <br />
                      {a.city}, {a.postalCode}
                    </p>
                    <div className="actions">
                      <button className="outline" onClick={() => setEditing(a)}>
                        Edit
                      </button>
                      <button
                        className="outline"
                        onClick={async () => {
                          try {
                            await request(
                              "/users/me/addresses/" + a._id,
                              "delete",
                            );
                            client.invalidateQueries({ queryKey: ["profile"] });
                          } catch (e) {
                            notify(errorText(e));
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <AddressForm
                key={editing?._id || "new"}
                editing={editing}
                submit={submit}
                cancel={() => setEditing(null)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function AddressForm({ editing, submit, cancel }) {
  useEffect(() => {
    if (editing) {
      const f = document.getElementById("address-form");
      for (const [k, v] of Object.entries(editing))
        if (f.elements[k]) f.elements[k].value = v;
    }
  }, [editing]);
  return (
    <form
      id="address-form"
      className="form panel"
      onSubmit={(e) =>
        submit(
          e,
          "/users/me/addresses" + (editing ? "/" + editing._id : ""),
          editing ? "patch" : "post",
        )
      }
    >
      <h3>{editing ? "Edit address" : "Add an address"}</h3>
      <AddressFields />
      <div className="actions">
        <button>Save address</button>
        {editing && (
          <button type="button" className="outline" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
export function Wishlist() {
  const user = useSession((s) => s.user);
  const q = useData("wishlist", "/users/me/wishlist", !!user);
  if (!user)
    return (
      <Empty
        title="Keep your favourites close."
        text="Sign in to save your personal edit."
        link="/login"
        label="Sign in"
      />
    );
  return (
    <div className="section">
      <SEO title="Wishlist" />
      <PageHead title="Your favourites." />
      <DataState query={q}>
        {(rows) =>
          rows.length ? (
            <div className="product-grid">
              {rows.map((p) => (
                <div key={p._id}>
                  <ProductCard p={p} />
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await request("/users/me/wishlist/" + p._id, "delete");
                        q.refetch();
                      } catch (e) {
                        notify(errorText(e));
                      }
                    }}
                  >
                    Remove from wishlist
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="A little inspiration?" />
          )
        }
      </DataState>
    </div>
  );
}
