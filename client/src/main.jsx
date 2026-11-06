import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MotionConfig } from "framer-motion";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/unbounded/500.css";
import "@fontsource/unbounded/700.css";
import "./styles.css";
import Layout from "./Layout";
import { restoreSession } from "./state";
const Home = lazy(() => import("./Home")),
  Shop = lazy(() => import("./Shop")),
  Product = lazy(() => import("./Product")),
  Static = lazy(() => import("./Static")),
  Admin = lazy(() => import("./Admin"));
const named = (file, name) =>
  lazy(() => file().then((m) => ({ default: m[name] })));
const Auth = named(() => import("./Account"), "Auth"),
  Account = named(() => import("./Account"), "Account"),
  Wishlist = named(() => import("./Account"), "Wishlist"),
  Cart = named(() => import("./CartCheckout"), "Cart"),
  Checkout = named(() => import("./CartCheckout"), "Checkout"),
  OrderDetail = named(() => import("./CartCheckout"), "OrderDetail");
class Boundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="section empty">
        <h1>Something went wrong.</h1>
        <p>Please reload the page and try again.</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, refetchOnWindowFocus: false },
  },
});
function App() {
  useEffect(() => {
    restoreSession();
  }, []);
  return (
    <Boundary>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<div className="section">Loading Farmeri…</div>}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about-us" element={<Navigate to="/about" replace />} />
              {["shop", "new", "search"].map((path) => (
                <Route key={path} path={path} element={<Shop />} />
              ))}
              <Route path="men" element={<Navigate to="/shop" replace />} />
              <Route path="women" element={<Navigate to="/shop" replace />} />
              <Route path="product/:slug" element={<Product />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="order/:id" element={<OrderDetail />} />
              {[
                "login",
                "register",
                "forgot-password",
                "reset-password",
                "verify-email",
              ].map((path) => (
                <Route key={path} path={path} element={<Auth key={path} />} />
              ))}
              <Route path="account" element={<Account />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="admin" element={<Admin />} />
              {[
                "about",
                "contact",
                "faq",
                "shipping-returns",
                "size-guide",
                "privacy",
                "terms",
                "track-order",
              ].map((path) => (
                <Route key={path} path={path} element={<Static key={path} />} />
              ))}
              <Route path="*" element={<Static />} />
            </Route>
          </Routes>
        </Suspense>
      </MotionConfig>
    </Boundary>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(
  <HelmetProvider>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>,
);
