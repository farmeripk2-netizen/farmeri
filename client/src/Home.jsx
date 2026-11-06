import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ArrowUpRight, ArrowLeft, ArrowRight, ArrowDown } from "lucide-react";
import { useData, DataState, ProductCard, SEO, Newsletter } from "./ui";
import { ContentLink, useStorefront } from "./storefront";
import HeroProductCarousel from "./HeroProductCarousel";
import ClothingRack from "./ClothingRack";

function Action({ button, className }) {
  return (
    button?.label && (
      <ContentLink className={className} href={button.href}>
        {button.label} <ArrowUpRight size={17} />
      </ContentLink>
    )
  );
}

function SectionHeading({ copy, children }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{copy.eyebrow}</span>
        <h2>{copy.title}</h2>
      </div>
      {children}
    </div>
  );
}

function ProductSection({ copy, items, id, carousel = false }) {
  const row = useRef();
  if (!copy.enabled || !items.length) return null;
  return (
    <section className="section" id={id}>
      <SectionHeading copy={copy}>
        <div className="row-actions">
          <Action button={copy.button} />
          {carousel &&
            [-1, 1].map((direction) => (
              <button
                key={direction}
                type="button"
                className="circle"
                aria-label={
                  direction < 0 ? "Previous products" : "Next products"
                }
                onClick={() =>
                  row.current?.scrollBy({
                    left: direction * 340,
                    behavior: "smooth",
                  })
                }
              >
                {direction < 0 ? (
                  <ArrowLeft size={18} />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            ))}
        </div>
      </SectionHeading>
      <div className={carousel ? "product-carousel" : "product-grid"} ref={row}>
        {items.map((p) => (
          <ProductCard p={p} key={p._id} />
        ))}
      </div>
    </section>
  );
}

function Cards({ copy, everyday = false }) {
  if (!copy.enabled) return null;
  return (
    <section className={"section" + (everyday ? " lookbook" : "")}>
      <SectionHeading copy={copy}>
        {everyday && <span className="muted">{copy.note}</span>}
      </SectionHeading>
      <div className={everyday ? "lookbook-grid" : "category-grid"}>
        {copy.cards.map(({ label, href, image, tag }, i) => (
          <ContentLink
            href={href}
            key={i}
            className={everyday ? undefined : "category cat-" + i}
          >
            {tag && <span>{tag}</span>}
            {image && <img src={image} alt={label} loading="lazy" />}
            {everyday ? (
              <span>
                {label} <ArrowUpRight size={17} />
              </span>
            ) : (
              <div>
                <h3>{label}</h3>
                <span className="circle">
                  <ArrowUpRight />
                </span>
              </div>
            )}
          </ContentLink>
        ))}
      </div>
    </section>
  );
}

function Callout({ copy, id }) {
  if (!copy.enabled) return null;
  return (
    <section className="section home-callout" id={id}>
      <span className="eyebrow">{copy.eyebrow}</span>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      <Action className="pill" button={copy.button} />
    </section>
  );
}

export default function Home() {
  const settings = useData("settings", "/settings/public");
  const { home } = useStorefront();
  const merchandising = useData("homepageProducts", "/products/homepage");
  const testimonials = useData(
    "testimonials",
    "/testimonials",
    home.community.enabled,
  );
  const hero = useRef();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 100]);
  const h = home.hero;
  return (
    <>
      <SEO title={home.seoTitle} description={home.seoDescription} />
      <section className="hero" ref={hero}>
        <div className="hero-grain" />
        <div className="hero-label">
          <span>{h.leftLabel}</span>
          <span>{h.rightLabel}</span>
        </div>
        <div className="hero-heading">
          <span className="eyebrow">{h.eyebrow}</span>
          <h1>{settings.data?.headline || "EVERY FIT COUNTS"}</h1>
          <Action className="pill" button={h.button} />
        </div>
        {merchandising.data?.hero?.length > 0 && (
          <HeroProductCarousel
            key={merchandising.data.hero.map((p) => p._id).join(",")}
            products={merchandising.data.hero}
            hint={h.carouselHint}
          />
        )}
        <div className="originals" aria-hidden="true">
          {h.originals}
        </div>
        {h.mountains && (
          <img className="hero-mountains" src={h.mountains} alt="" />
        )}
        {h.statue && (
          <motion.div style={{ y }} className="hero-statue">
            <img src={h.statue} fetchPriority="high" alt="" />
          </motion.div>
        )}
        {h.clouds && <img className="clouds" src={h.clouds} alt="" />}
        <div className="hero-bottom">
          <span>{h.footerLeft}</span>
          <a href={home.rack.enabled ? "#rack" : "#homepage-products"}>
            {h.scrollLabel} <ArrowDown size={14} />
          </a>
          <span>{h.footerRight}</span>
        </div>
      </section>
      <div id="homepage-products">
        <DataState query={merchandising}>
          {({ rack, featured, newDrops }) => (
            <>
              {home.rack.enabled && (
                <ClothingRack products={rack} copy={home.rack} />
              )}
              <ProductSection
                copy={home.featured}
                items={featured.slice(0, 8)}
                id="featured"
                carousel
              />
              <Callout copy={home.fit} id="find-your-fit" />
              <Cards copy={home.collections} />
              <ProductSection
                copy={home.featuredProducts}
                items={featured}
                id="featured-products"
              />
              <ProductSection
                copy={home.newDrops}
                items={newDrops}
                id="new-drops"
              />
              <Cards copy={home.everyday} everyday />
              <Callout copy={home.contact} id="home-contact" />
            </>
          )}
        </DataState>
      </div>
      {home.statement.enabled && (
        <section className="statement">
          <span className="eyebrow">{home.statement.eyebrow}</span>
          <h2>
            {home.statement.title}
            <br />
            <em>{home.statement.emphasis}</em>
          </h2>
          <p>{home.statement.description}</p>
          <Action button={home.statement.button} className="pill" />
          {home.statement.image && (
            <span className="statement-mark" aria-hidden="true">
              <img src={home.statement.image} alt="" loading="lazy" />
            </span>
          )}
        </section>
      )}
      {home.values.enabled && (
        <section className="values">
          {home.values.cards.map(({ title, text }, i) => (
            <div key={i}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </section>
      )}
      {home.community.enabled && (
        <section className="section community">
          <SectionHeading copy={home.community} />
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
            <p className="muted">{home.community.emptyText}</p>
          )}
        </section>
      )}
      <Newsletter />
    </>
  );
}
