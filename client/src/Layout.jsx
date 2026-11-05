import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Search,
  Heart,
  User,
  ShoppingBag,
  Menu,
  ArrowUpRight,
} from "lucide-react";
import { useCart, useNotice, useSession, money } from "./state";
import { Modal, useData } from "./ui";
export default function Layout() {
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false),
    [search, setSearch] = useState(false),
    [term, setTerm] = useState(""),
    [debounced, setDebounced] = useState(""),
    [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const items = useCart((s) => s.items),
    user = useSession((s) => s.user),
    notice = useNotice((s) => s.notice);
  const settings = useData("settings", "/settings/public");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);
  const results = useData(
    ["suggestions", debounced],
    "/products/search?q=" + encodeURIComponent(debounced) + "&limit=5",
    debounced.length > 1,
  );
  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawer(false);
    setSearch(false);
  }, [pathname]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  const links = (
    <>
      <NavLink to="/new">New & Featured</NavLink>
      <NavLink to="/shop?category=oversized-tees">T-shirts</NavLink>
      <NavLink to="/shop?category=hoodies">Hoodies</NavLink>
    </>
  );
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {settings.data?.announcementEnabled && (
        <div className="announcement">
          {settings.data.announcement}
          <span>INDEPENDENT SPIRIT. EVERY DAY.</span>
        </div>
      )}
      <header
        className={
          "nav " +
          (scrolled ? "scrolled " : "") +
          (pathname === "/" ? "over-hero" : "")
        }
      >
        <Link className="logo" to="/" aria-label="Farmeri home">
          <img src="/assets/farmeri-logo.jpg" alt="Farmeri" width="159" height="111" />
        </Link>
        <nav className="desktop-links" aria-label="Main navigation">
          {links}
        </nav>
        <div className="nav-actions">
          <button
            className="icon"
            aria-label="Search"
            onClick={() => setSearch(true)}
          >
            <Search size={20} />
          </button>
          <Link
            className="icon hide-small"
            aria-label="Wishlist"
            to="/wishlist"
          >
            <Heart size={20} />
          </Link>
          <Link
            className="icon hide-small"
            aria-label="Account"
            to={user ? "/account" : "/login"}
          >
            <User size={20} />
          </Link>
          <Link className="icon bag" aria-label="Shopping bag" to="/cart">
            <ShoppingBag size={20} />
            <span>{items.reduce((n, i) => n + i.qty, 0)}</span>
          </Link>
          <button
            className="icon mobile-menu"
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
          >
            <Menu />
          </button>
        </div>
      </header>
      {drawer && (
        <Modal title="Explore Farmeri" onClose={() => setDrawer(false)}>
          <nav className="drawer-links">
            {links}
            <Link to="/shop">Shop all</Link>
            <Link to="/about">Our story</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to={user ? "/account" : "/login"}>Your account</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <button
            onClick={() => {
              setDrawer(false);
              setSearch(true);
            }}
          >
            Search the store
          </button>
        </Modal>
      )}
      {search && (
        <Modal
          title="Find your next favourite"
          onClose={() => setSearch(false)}
        >
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/search?q=" + encodeURIComponent(term));
              setSearch(false);
            }}
          >
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search tees, hoodies, originals…"
              aria-label="Search products"
            />
            <button type="submit">
              <Search size={20} />
            </button>
          </form>
          <div className="suggestions">
            {results.data?.items.map((p) => (
              <Link
                key={p._id}
                to={"/product/" + p.slug}
                onClick={() => setSearch(false)}
              >
                <img src={p.images[0]} alt="" />
                <span>
                  {p.name}
                  <small>{money(p.discountPrice || p.price)}</small>
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
            {debounced.length > 1 && results.data?.total === 0 && (
              <p>No matches. Try another keyword.</p>
            )}
          </div>
        </Modal>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="footer-top">
          <div>
            <Link className="logo" to="/">
              <img src="/assets/farmeri-logo.jpg" alt="Farmeri" width="159" height="111" />
            </Link>
            <p>
              For the ones who move differently.
              <br />
              Made for your own kind of everyday.
            </p>
          </div>
          <div>
            <h4>EXPLORE</h4>
            <Link to="/shop">Shop all</Link>
            <Link to="/new">New & Featured</Link>
            <Link to="/shop?category=oversized-tees">T-shirts</Link>
            <Link to="/shop?category=hoodies">Hoodies</Link>
          </div>
          <div>
            <h4>HERE TO HELP</h4>
            <Link to="/contact">Contact</Link>
            <Link to="/track-order">Track your order</Link>
            <Link to="/shipping-returns">Shipping & returns</Link>
            <Link to="/size-guide">Size guide</Link>
            <Link to="/faq">FAQs</Link>
          </div>
          <div>
            <h4>FARMERI WORLD</h4>
            <Link to="/about">Our story</Link>
            <Link to="/account">Your account</Link>
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms & conditions</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Farmeri. All rights reserved.
          </span>
          <span>INDIA / INR ₹</span>
          <span>EVERY FIT COUNTS.</span>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
