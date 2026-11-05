import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { collection } from "./collection";

const products = collection.filter(({ category }) => category === "oversized-tees");
const holdMs = 2000;
const wrap = (value) => ((value % products.length) + products.length) % products.length;
const distanceFrom = (index, position) => wrap(index - position + products.length / 2) - products.length / 2;

function Tee({ product, index, position, spacing, mobile, active }) {
  const distance = useTransform(position, (value) => distanceFrom(index, value));
  const x = useTransform(distance, (value) => value * spacing);
  const y = useTransform(distance, (value) => Math.min(Math.abs(value), 2) * 12 - 9);
  const scale = useTransform(distance, (value) => {
    const d = Math.abs(value);
    return d < 1 ? 1 - d * .43 : Math.max(.42, .57 - (d - 1) * .13);
  });
  const opacity = useTransform(distance, (value) => {
    const d = Math.abs(value);
    const start = mobile ? 1.12 : 2.02;
    const end = mobile ? 1.68 : 2.48;
    return d < start ? 1 - Math.min(d, 1) * .18 : Math.max(0, .82 * (end - d) / (end - start));
  });
  const visibility = useTransform(distance, (value) => Math.abs(value) >= (mobile ? 1.68 : 2.48) ? "hidden" : "visible");
  const zIndex = useTransform(distance, (value) => 30 - Math.round(Math.abs(value) * 8));

  return (
    <motion.div className="hero-tee-card" data-active={active} style={{ x, y, scale, opacity, visibility, zIndex }}>
      <Link to={"/product/" + product.slug} tabIndex={active ? 0 : -1}
        aria-label={"View " + product.name} draggable={false}>
        <img src={"/assets/hero-tees/" + product.slug + ".webp"} alt={product.name} draggable={false} />
      </Link>
    </motion.div>
  );
}

export default function HeroProductCarousel() {
  const stage = useRef(null);
  const gesture = useRef(null);
  const suppressClickUntil = useRef(0);
  const animation = useRef(null);
  const position = useMotionValue(0);
  const reduced = useReducedMotion();
  const [layout, setLayout] = useState({ spacing: 140, mobile: true });
  const [active, setActive] = useState(0);
  const [moving, setMoving] = useState(false);
  const [pointerHeld, setPointerHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const node = stage.current;
    const measure = () => {
      const width = node.clientWidth;
      const mobile = width < 768;
      setLayout({ mobile, spacing: width * (mobile ? .355 : .216) });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(node);
    const intersection = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .15 });
    intersection.observe(node);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      animation.current?.stop();
    };
  }, []);

  const goTo = useCallback((target) => {
    animation.current?.stop();
    const settle = () => {
      position.set(wrap(target));
      setActive(wrap(target));
      setMoving(false);
    };
    if (reduced || Math.abs(position.get() - target) < .001) {
      settle();
      return;
    }
    setMoving(true);
    animation.current = animate(position, target, {
      duration: .54,
      ease: [.22, .65, .32, 1],
      onComplete: settle,
    });
  }, [position, reduced]);

  const advance = useCallback((direction) => goTo(Math.round(position.get()) + direction), [goTo, position]);

  useEffect(() => {
    if (moving || pointerHeld || paused || keyboardFocus || reduced || !inView || !pageVisible) return;
    const timer = window.setTimeout(() => advance(1), holdMs);
    return () => window.clearTimeout(timer);
  }, [active, advance, moving, pointerHeld, paused, keyboardFocus, reduced, inView, pageVisible]);

  function pointerDown(event) {
    if (event.button !== 0 || !event.isPrimary || gesture.current) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position.get(), dragging: false };
    setPointerHeld(true);
  }

  function pointerMove(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.dragging) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) return pointerEnd(event);
      if (Math.abs(dx) < 9) return;
      animation.current?.stop();
      g.start = position.get();
      g.dragging = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    position.set(g.start - Math.max(-2, Math.min(2, dx / layout.spacing)));
  }

  function pointerEnd(event) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    setPointerHeld(false);
    if (!g.dragging) return;
    setDragging(false);
    suppressClickUntil.current = Date.now() + 400;
    const dx = event.clientX - g.x;
    const at = Math.round(position.get());
    const from = Math.round(g.start);
    const target = event.type === "pointerup" && at === from && Math.abs(dx) >= 24
      ? from - Math.sign(dx) : at;
    goTo(target);
  }

  return (
    <section className="hero-product-carousel tee-carousel" aria-label="Explore Farmeri T-shirts" aria-roledescription="carousel"
      onFocusCapture={(event) => setKeyboardFocus(event.target.matches(":focus-visible"))}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}>
      <div ref={stage} className={"hero-tee-stage" + (dragging ? " is-dragging" : "")}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd} onLostPointerCapture={(event) => {
          if (event.target === event.currentTarget) pointerEnd(event);
        }}
        onPointerLeave={(event) => { if (!gesture.current?.dragging) pointerEnd(event); }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (event.detail > 0 && (gesture.current?.dragging || Date.now() < suppressClickUntil.current)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}>
        {products.map((product, index) => <Tee key={product.slug} product={product} index={index}
          position={position} spacing={layout.spacing} mobile={layout.mobile} active={active === index} />)}
      </div>
      <div className="hero-carousel-tools">
        <button type="button" className="circle" aria-label="Previous T-shirt" onClick={() => advance(-1)}><ArrowLeft size={16} /></button>
        <span aria-live={paused || reduced ? "polite" : "off"}>
          <strong>{products[active].name}</strong><small>SWIPE OR TAP TO VIEW</small>
        </span>
        <button type="button" className="circle" aria-label="Next T-shirt" onClick={() => advance(1)}><ArrowRight size={16} /></button>
        {!reduced && <button type="button" className="circle hero-tee-pause"
          aria-label={paused ? "Resume autoplay" : "Pause autoplay"} onClick={() => setPaused((value) => !value)}>
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>}
      </div>
    </section>
  );
}
