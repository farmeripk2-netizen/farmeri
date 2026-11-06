import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { SEO, PageHead, Field, Newsletter } from "./ui";
import { request, notify, errorText } from "./state";
import { ContentLink, useStorefront } from "./storefront";
export default function Static() {
  const { pathname } = useLocation();
  const page = pathname.slice(1);
  const { pages } = useStorefront();
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(null);
  if (page === "about") {
    const copy = pages.about;
    return <>
      <SEO title={copy.title} />
      <section className="about-hero">
        <span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1>
        <p>{copy.description}</p>
        {copy.image && <img src={copy.image} alt="" />}
      </section>
      <section className="section about-copy">
        <h2>{copy.storyTitle}</h2><p className="studio-multiline">{copy.story}</p>
        {copy.button.label && <ContentLink className="button" href={copy.button.href}>{copy.button.label} <ArrowUpRight size={17} /></ContentLink>}
      </section>
      <Newsletter />
    </>;
  }
  if (page === "contact" || page === "track-order")
    return (
      <div className="section narrow">
        <SEO title={page === "contact" ? pages.contact.title : "Track order"} />
        <PageHead
          title={page === "contact" ? pages.contact.title : "Follow your order."}
        >
          {page === "contact"
            ? pages.contact.description
            : "Enter the order number and email used at checkout."}
        </PageHead>
        <form
          className="form panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            try {
              const r = await request(
                page === "contact" ? "/contact" : "/orders/track",
                "post",
                Object.fromEntries(new FormData(form)),
              );
              if (page === "contact") {
                notify(r.message);
                form.reset();
              } else setResult(r);
            } catch (e) {
              notify(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {page === "contact" ? (
            <>
              <Field label="Your name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Subject" name="subject" required />
              <label>
                Message
                <textarea name="message" minLength="10" required />
              </label>
            </>
          ) : (
            <>
              <Field
                label="Order number"
                name="number"
                placeholder="FM-…"
                required
              />
              <Field label="Email" name="email" type="email" required />
            </>
          )}
          <button disabled={busy}>
            {busy
              ? "Please wait…"
              : page === "contact"
                ? pages.contact.submitLabel
                : "Track order"}
          </button>
        </form>
        {result && (
          <div className="panel">
            <h2>{result.number}</h2>
            <span className="badge">{result.status}</span>
            <ol className="timeline">
              {result.history.map((h, i) => (
                <li key={i}>
                  {h.status}
                  <span>{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ol>
            {result.trackingNumber && (
              <p>Tracking number: {result.trackingNumber}</p>
            )}
          </div>
        )}
      </div>
    );
  if (page === "size-guide") {
    const copy = pages.sizeGuide;
    return <div className="section narrow">
      <SEO title={copy.title} /><PageHead title={copy.title} />
      <p>{copy.description}</p>
      <table><thead><tr><th>Size</th><th>Chest circumference</th><th>Length</th></tr></thead>
        <tbody>{copy.rows.map(({size,chest,length},i) => <tr key={i}><td>{size}</td><td>{chest}</td><td>{length}</td></tr>)}</tbody>
      </table>
      <p>{copy.instructions}</p>
    </div>;
  }
  const c = pages[({ "shipping-returns": "shippingReturns", faq: "faq", privacy: "privacy", terms: "terms" })[page]];
  return (
    <div className="section narrow">
      <SEO title={c?.title || "Page not found"} />
      <PageHead title={c?.title || "Lost in the right direction."} />
      {c ? (
        c.sections.map(({title, text}, i) => (
          <details key={i} open={page !== "faq"}>
            <summary>{title}</summary>
            <p>{text}</p>
          </details>
        ))
      ) : (
        <>
          <p>The page you’re looking for isn’t here.</p>
          <Link className="button" to="/">
            Back to Farmeri ↗
          </Link>
        </>
      )}
    </div>
  );
}
