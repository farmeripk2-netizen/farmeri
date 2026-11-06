import { useEffect, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { ContentLink } from "./storefront";
import { money } from "./state";
import { garmentImage } from "./product_images";

function Hanger() {
  return (
    <svg className="rack-hanger" viewBox="0 0 120 46" aria-hidden="true">
      <path className="rack-hook" d="M60 18v-3c0-4 8-5 8-9a7 7 0 0 0-14 0" />
      <path
        className="rack-wood"
        d="M58 17q2-2 4 0l49 21q5 3 1 5L60 32 8 43q-4-2 1-5Z"
      />
    </svg>
  );
}

export default function ClothingRack({ products, copy }) {
  const [selection, select] = useState(null);
  const [back, setBack] = useState(false);
  const rail = useRef(null);
  const buttons = useRef(new Map());
  const close = useRef(null);
  const preview = useRef(null);
  const reduced = useReducedMotion();
  const item = products.find((p) => p._id === selection);

  const transition = reduced
    ? { duration: 0 }
    : { type: "spring", stiffness: 265, damping: 30 };
  useEffect(() => {
    if (!item) return;
    close.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(
      () => {
        const node = preview.current;
        if (node && node.getBoundingClientRect().top + 220 > window.innerHeight)
          node.scrollIntoView({
            block: "start",
            behavior: reduced ? "instant" : "smooth",
          });
      },
      reduced ? 0 : 300,
    );
    return () => window.clearTimeout(timer);
  }, [item, reduced]);
  function open(id) {
    setBack(false);
    select(id);
  }
  function restore() {
    select(null);
    setBack(false);
    const button = buttons.current.get(selection);
    button?.focus({ preventScroll: true });
    if (button?.getBoundingClientRect().top < 80)
      button.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: reduced ? "instant" : "smooth",
      });
  }
  return (
    <section
      className="clothing-rack"
      id="rack"
      aria-labelledby="rack-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && item) restore();
      }}
    >
      <header>
        <span className="eyebrow">{copy.eyebrow}</span>
        <h2 id="rack-title">{copy.title}</h2>
        <p>{copy.description}</p>
      </header>
      {!products.length ? (
        <p className="rack-empty">{copy.emptyText}</p>
      ) : (
        <LayoutGroup>
          <div className="rack-shell">
            <motion.div className="rack-scroll" ref={rail} layoutScroll>
              <div className="rack-rail">
                {products.map((p) => (
                  <button
                    className="rack-slot"
                    type="button"
                    key={p._id}
                    ref={(node) => {
                      if (node) buttons.current.set(p._id, node);
                      else buttons.current.delete(p._id);
                    }}
                    aria-label={p.name}
                    aria-expanded={p._id === selection}
                    aria-controls={
                      p._id === selection ? "rack-preview" : undefined
                    }
                    onClick={() =>
                      p._id === selection ? restore() : open(p._id)
                    }
                  >
                    <Hanger />
                    {p._id !== selection && (
                      <motion.img
                        layoutId={"rack-garment-" + p._id}
                        className="rack-garment"
                        transition={transition}
                        src={garmentImage(p)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                      />
                    )}
                    <span className="rack-name">{p.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
            <div className="rack-arrows">
              <button
                className="circle"
                type="button"
                aria-label="Scroll rack left"
                onClick={() =>
                  rail.current?.scrollBy({
                    left: -360,
                    behavior: reduced ? "instant" : "smooth",
                  })
                }
              >
                <ArrowLeft size={17} />
              </button>
              <button
                className="circle"
                type="button"
                aria-label="Scroll rack right"
                onClick={() =>
                  rail.current?.scrollBy({
                    left: 360,
                    behavior: reduced ? "instant" : "smooth",
                  })
                }
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
          {item && (
            <div className="rack-preview" id="rack-preview" ref={preview}>
              <button
                ref={close}
                className="rack-return"
                type="button"
                onClick={restore}
              >
                <X size={17} /> {copy.returnLabel}
              </button>
              <div className="rack-preview-picture">
                <motion.img
                  layoutId={"rack-garment-" + item._id}
                  transition={transition}
                  src={back ? item.images[1] : garmentImage(item)}
                  alt={item.name}
                />
              </div>
              {item.images?.[1] && (
                <div className="rack-views">
                  <button
                    type="button"
                    aria-pressed={!back}
                    onClick={() => setBack(false)}
                  >
                    {copy.frontLabel}
                  </button>
                  <button
                    type="button"
                    aria-pressed={back}
                    onClick={() => setBack(true)}
                  >
                    {copy.backLabel}
                  </button>
                </div>
              )}
              <h3>{item.name}</h3>
              <p>{money(item.discountPrice || item.price)}</p>
              <ContentLink className="button" href={"/product/" + item.slug}>
                {copy.viewLabel} <ArrowUpRight size={17} />
              </ContentLink>
            </div>
          )}
        </LayoutGroup>
      )}
    </section>
  );
}
