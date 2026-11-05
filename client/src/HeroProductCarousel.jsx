import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { collection } from "./collection";

const tees = collection.filter((product) => product.category === "oversized-tees");
const products = [...tees, ...tees, ...tees];
const step = 360 / products.length;
const normalizedIndex = (angle) => ((Math.round(-angle / step) % products.length) + products.length) % products.length;

function CircularProduct({ product, index, rotation, geometry, centered, dragging, blockClick, focusProduct }) {
  // A single visible arc. Products wrap only after leaving the screen;
  // there is no second row or orbit passing behind the center product.
  const position = useTransform(rotation, (value) => {
    const slot = (value + index * step) / step;
    return (((slot + products.length / 2) % products.length + products.length) % products.length - products.length / 2) / 3.4;
  });
  const x = useTransform(position, (value) => value * geometry.radius);
  const y = useTransform(position, (value) => -Math.pow(Math.min(Math.abs(value), 1.35), 1.6) * geometry.lift);
  const scale = useTransform(position, (value) => .40 + Math.pow(Math.min(Math.abs(value), 1.35), 1.8) * 1.14);
  const rotateY = useTransform(position, (value) => -value * 26);
  const opacity = useTransform(position, (value) => Math.min(1, .84 + Math.abs(value) * .16));
  const zIndex = useTransform(position, (value) => Math.round(Math.abs(value) * 100));
  const visibility = useTransform(position, (value) => Math.abs(value) > 1.35 ? "hidden" : "visible");
  return (
    <motion.div className="circle-product-position" style={{ x, y, scale, rotateY, opacity, zIndex, visibility }}>
      <Link className={"circle-product-link" + (centered ? " is-centered" : "")} to={"/product/" + product.slug}
        aria-label={product.name} draggable={false} onFocus={() => focusProduct(index)}
        onClick={(event) => { if (event.detail > 0 && (dragging.current || Date.now() < blockClick.current)) { event.preventDefault(); event.stopPropagation(); } }}>
        <img src={product.images[0]} alt={product.name} draggable={false} />
      </Link>
    </motion.div>
  );
}

export default function HeroProductCarousel() {
  const viewport = useRef(null);
  const pointer = useRef(null);
  const dragging = useRef(false);
  const blockClick = useRef(0);
  const runningAnimation = useRef(null);
  const rotation = useMotionValue(0);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [geometry, setGeometry] = useState({ radius: 480, lift: 50 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => rotation.on("change", (value) => setActive(normalizedIndex(value))), [rotation]);
  useEffect(() => {
    const node = viewport.current;
    const resize = new ResizeObserver(() => setGeometry({ radius: node.clientWidth * .51, lift: node.clientWidth < 768 ? 35 : 50 }));
    resize.observe(node);
    return () => { resize.disconnect(); runningAnimation.current?.stop(); };
  }, []);

  function turn(target) {
    runningAnimation.current?.stop();
    if (reduced) rotation.set(target);
    else runningAnimation.current = animate(rotation, target, { type: "spring", stiffness: 140, damping: 25, mass: .8 });
  }
  function focusProduct(index) {
    if (pointer.current) return;
    const angle = rotation.get();
    const cycles = Math.round((angle + index * step) / 360);
    turn(-index * step + cycles * 360);
  }
  function pointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    runningAnimation.current?.stop();
    blockClick.current = 0;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: rotation.get(), moved: false };
  }
  function pointerMove(event) {
    const current = pointer.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (!current.moved) {
      if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) { pointer.current = null; return; }
      if (Math.abs(dx) < 8) return;
      current.moved = true; dragging.current = true; setIsDragging(true);
      viewport.current.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    rotation.set(current.angle + dx * 180 / Math.max(viewport.current.clientWidth, 360));
  }
  function pointerEnd(event) {
    const current = pointer.current;
    if (!current || current.id !== event.pointerId) return;
    pointer.current = null;
    if (current.moved) {
      blockClick.current = Date.now() + 400;
      dragging.current = false; setIsDragging(false);
      if (viewport.current.hasPointerCapture(event.pointerId)) viewport.current.releasePointerCapture(event.pointerId);
      turn(Math.round(rotation.get() / step) * step);
    }
  }
  function wheel(event) {
    // Horizontal gestures move along the arc; vertical wheel scrolls the page.
    if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
    turn(rotation.get() - event.deltaX * .25);
  }
  return (
    <section className="hero-product-carousel circular-mode" aria-label="Explore Farmeri T-shirts" aria-roledescription="carousel">
      <div ref={viewport} className={"circular-product-stage" + (isDragging ? " is-dragging" : "")}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} onWheel={wheel}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => { if (event.detail > 0 && (dragging.current || Date.now() < blockClick.current)) { event.preventDefault(); event.stopPropagation(); } }}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const target = (active + (event.key === "ArrowRight" ? 1 : -1) + products.length) % products.length;
            focusProduct(target);
            viewport.current.querySelectorAll("a")[target]?.focus({ preventScroll: true });
          }
        }}>
        {products.map((product, index) => <CircularProduct key={product.slug + index} product={product} index={index}
          rotation={rotation} geometry={geometry} centered={active === index} dragging={dragging}
          blockClick={blockClick} focusProduct={focusProduct} />)}
      </div>
      <div className="hero-carousel-tools">
        <button type="button" className="circle" aria-label="Previous hero product" onClick={() => turn(Math.round(rotation.get() / step) * step + step)}><ArrowLeft size={16} /></button>
        <span><strong>{products[active]?.name}</strong><small>SWIPE THE ARC · TAP TO VIEW</small></span>
        <button type="button" className="circle" aria-label="Next hero product" onClick={() => turn(Math.round(rotation.get() / step) * step - step)}><ArrowRight size={16} /></button>
      </div>
    </section>
  );
}
