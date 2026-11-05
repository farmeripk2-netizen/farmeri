import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ArrowUpRight, ArrowLeft, ArrowRight, ArrowDown } from "lucide-react";
import { useData, DataState, ProductCard, SEO, Newsletter } from "./ui";
import HeroProductCarousel from "./HeroProductCarousel";
export default function Home() {
  const products = useData("featured", "/products/featured?limit=8"),
    arrivals = useData("arrivals", "/products/new-arrivals?limit=4");
  const testimonials = useData("testimonials", "/testimonials");
  const row = useRef(),
    hero = useRef();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 100]);
  return (
    <>
      <SEO />
      <section className="hero" ref={hero}>
        <div className="hero-grain" />
        <div className="hero-label">
          <span>INDEPENDENT STREETWEAR</span>
          <span>COLLECTION / 026</span>
        </div>
        <div className="hero-heading">
          <span className="eyebrow">FOR THE ONES WHO NEVER FIT THE MOULD</span>
          <h1>EVERY FIT COUNTS</h1>
          <Link className="pill" to="/new">
            New Arrival <ArrowUpRight size={14} />
          </Link>
        </div>
        <HeroProductCarousel />
        <img className="hero-mountains" src="/assets/hero-mountains.webp" alt="" />
        <motion.div style={{ y }} className="hero-statue">
          <img
            src="/assets/winged-statue.webp"
            fetchPriority="high"
            alt="Realistic carved stone angel with raised arms and spread wings"
          />
        </motion.div>
        <div className="originals" aria-hidden="true">
          ORIGINALS
        </div>
        <img className="clouds" src="/assets/placeholder-clouds.svg" alt="" />
        <div className="hero-bottom">
          <span>EVERY FIT COUNTS.</span>
          <a href="#featured">
            SCROLL TO EXPLORE <ArrowDown size={14} />
          </a>
          <span>EST. 2026</span>
        </div>
      </section>
      <section className="section" id="featured">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR NEXT EVERYDAY ESSENTIAL</span>
            <h2>
              Featured<span className="dot">.</span>
            </h2>
          </div>
          <div className="row-actions">
            <Link to="/shop">
              Explore all <ArrowUpRight size={17} />
            </Link>
            <button
              className="circle"
              aria-label="Previous products"
              onClick={() =>
                row.current?.scrollBy({ left: -340, behavior: "smooth" })
              }
            >
              <ArrowLeft size={18} />
            </button>
            <button
              className="circle"
              aria-label="Next products"
              onClick={() =>
                row.current?.scrollBy({ left: 340, behavior: "smooth" })
              }
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <DataState query={products}>
          {(data) => (
            <div className="product-carousel" ref={row}>
              {data.items.map((p) => (
                <ProductCard p={p} key={p._id} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <div className="ticker" aria-hidden="true">
        EVERY FIT COUNTS <span>✳</span> EVERY FIT COUNTS <span>✳</span>{" "}
        FARMERI ORIGINALS <span>✳</span> EVERY FIT COUNTS
      </div>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NO RULES. JUST YOU.</span>
            <h2>Find your fit.</h2>
          </div>
        </div>
        <div className="category-grid">
          {[
            ["T-shirts", "/shop?category=oversized-tees", "farmeri-maroon-tee-front.webp"],
            ["Hoodies", "/shop?category=hoodies", "tribal-skull-hoodie-front.webp"],
          ].map(([name, to, img], i) => (
            <Link to={to} key={name} className={"category cat-" + i}>
              <span>0{i + 1} / EXPLORE</span>
              <img
                src={"/assets/" + img}
                loading="lazy"
                alt={
                  name === "Accessories"
                    ? "Farmeri collection illustration"
                    : name + " collection"
                }
              />
              <div>
                <h3>{name}</h3>
                <span className="circle">
                  <ArrowUpRight />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="statement">
        <span className="eyebrow">MORE THAN WHAT YOU WEAR</span>
        <h2>
          Not made to fit in.
          <br />
          <em>Made to feel like you.</em>
        </h2>
        <p>
          For the quiet rebels. The restless creatives. The ones writing their
          own story. This is your space.
        </p>
        <Link className="pill" to="/about">
          The Farmeri story <ArrowUpRight size={16} />
        </Link>
        <span className="statement-mark" aria-hidden="true">
          <img src="/assets/farmeri-logo.jpg" alt="" loading="lazy" />
        </span>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FRESH OUT OF THE STUDIO</span>
            <h2>New arrivals.</h2>
          </div>
          <Link to="/new">
            View the drop <ArrowUpRight size={17} />
          </Link>
        </div>
        <DataState query={arrivals}>
          {(data) => (
            <div className="product-grid">
              {data.items.map((p) => (
                <ProductCard p={p} key={p._id} />
              ))}
            </div>
          )}
        </DataState>
      </section>
      <section className="lookbook section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FARMERI / IN THE WILD</span>
            <h2>The everyday edit.</h2>
          </div>
          <span className="muted">STUDIO LOOKBOOK — VOL. 01</span>
        </div>
        <div className="lookbook-grid">
          {[
            "rick-and-morty-hoodie-front.webp",
            "authority-graphic-tee-front.webp",
            "pink-graphic-hoodie-front.webp",
          ].map((img, i) => (
            <Link to="/shop" key={img}>
              <img src={"/assets/" + img} alt={"Studio look " + (i + 1)} loading="lazy" />
              <span>
                LOOK 0{i + 1} <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="values">
        <div>
          <span>01</span>
          <h3>Your fit. Your rules.</h3>
          <p>Relaxed silhouettes, everyday expression.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Details that matter.</h3>
          <p>Explore fabric and care on every product.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Here for your journey.</h3>
          <p>Need help? Talk to the Farmeri team.</p>
        </div>
      </section>
      <section className="section community">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WORN YOUR WAY</span>
            <h2>From our community.</h2>
          </div>
        </div>
        {testimonials.data?.length ? (
          <div className="values">
            {testimonials.data.map((r) => (
              <article className="panel" key={r._id}>
                <small>{r.rating}/5 · VERIFIED PURCHASE</small>
                <h3>{r.title}</h3>
                <p>“{r.comment}”</p>
                <strong>{r.name.split(" ")[0]}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">
            A new chapter. Verified customer stories will appear here after our
            first deliveries.
          </p>
        )}
      </section>
      <Newsletter />
    </>
  );
}
