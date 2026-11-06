import { useEffect, useState } from "react";
import {
  Link,
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
import { ContentLink, useStorefront } from "./storefront";
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
  const {navigation, footer} = useStorefront();
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
  const links = (entries, onClick) => entries.map(({ label, href }, i) => (
    <ContentLink key={i} href={href === "/account" && !user ? "/login" : href} onClick={onClick}>{label}</ContentLink>
  ));
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {settings.data?.announcementEnabled && (
        <div className="announcement">
          {settings.data.announcement}
          <span>{navigation.announcementNote}</span>
        </div>
      )}
      <header
        className={
          "nav " +
          (scrolled ? "scrolled " : "") +
          (pathname === "/" ? "over-hero" : "")
        }
      >
        <Link className="logo" to="/" aria-label={navigation.logoAlt + " home"}>
          {navigation.logo ? <img src={navigation.logo} alt={navigation.logoAlt} width="159" height="111" /> : navigation.logoAlt}
        </Link>
        <nav className="desktop-links" aria-label="Main navigation">
          {links(navigation.links)}
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
        <Modal title={navigation.mobileTitle} onClose={() => setDrawer(false)}>
          <nav className="drawer-links">
            {links(navigation.mobileLinks, () => setDrawer(false))}
          </nav>
          <button
            onClick={() => {
              setDrawer(false);
              setSearch(true);
            }}
          >
            {navigation.mobileSearch}
          </button>
        </Modal>
      )}
      {search && (
        <Modal
          title={navigation.searchTitle}
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
              placeholder={navigation.searchPlaceholder}
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
            <Link className="logo" to="/">{footer.logo ? <img src={footer.logo} alt={footer.logoAlt} width="159" height="111" loading="lazy" /> : footer.logoAlt}</Link>
            <p>{footer.description}</p>
          </div>
          {footer.columns.map((column,i) => <div key={i}><h4>{column.title}</h4>{links(column.links)}</div>)}
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {footer.copyright}</span>
          <span>{footer.market}</span><span>{footer.tagline}</span>
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
