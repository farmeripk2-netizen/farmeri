import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { SEO, PageHead, Field, Newsletter } from "./ui";
import { request, notify, errorText } from "./state";
const content = {
  faq: {
    title: "Good questions.",
    sections: [
      [
        "How do I choose a size?",
        "Check the size guide and each product’s fit notes. Contact us if you need help choosing.",
      ],
      [
        "Can I pay on delivery?",
        "Yes, Cash on Delivery is available for eligible delivery areas. Availability is checked at checkout.",
      ],
      [
        "Where is my order?",
        "Use the Track Order page with your order number and email. Signed-in customers can also check their account.",
      ],
      [
        "How do I care for my clothing?",
        "Follow the garment label. Each product page includes fabric and care notes.",
      ],
    ],
  },
  "shipping-returns": {
    title: "Shipping & returns.",
    sections: [
      [
        "Delivery",
        "Draft policy — owner approval required before launch. The demo checkout uses a 4–7 business-day estimate. Confirm actual dispatch times, courier coverage and charges before accepting orders.",
      ],
      [
        "Returns & exchanges",
        "Draft policy — contact support with your order number and reason for return. The owner must set the eligibility period, condition requirements, return shipping responsibility and refund timing before launch.",
      ],
      [
        "Payment issues",
        "Contact support if payment was deducted but your order remains pending. Do not place repeated orders while an existing payment is being checked.",
      ],
    ],
  },
  privacy: {
    title: "Your privacy matters.",
    sections: [
      [
        "Information used",
        "Draft for owner review. Farmeri processes account details, delivery information, order history and messages you submit to provide store services.",
      ],
      [
        "Service providers",
        "Configured payment, image hosting and email providers process information necessary to complete the requested service. Card details are entered in the payment provider’s checkout.",
      ],
      [
        "Your choices",
        "Contact the store to request access, correction or deletion of your information. Before launch, specify the responsible business, contact address, retention periods and applicable privacy obligations.",
      ],
    ],
  },
  terms: {
    title: "The fine print.",
    sections: [
      [
        "Using Farmeri",
        "Draft terms for owner review before launch. Product listings, availability and pricing are subject to confirmation at checkout.",
      ],
      [
        "Orders & payment",
        "An order may be cancelled if stock or payment cannot be confirmed. Online payment and fulfillment status can be checked in your account.",
      ],
      [
        "Policies",
        "Shipping, returns and privacy terms apply alongside these terms. The owner must add business identity, jurisdiction and approved customer policies before launch.",
      ],
    ],
  },
};
export default function Static() {
  const { pathname } = useLocation();
  const page = pathname.slice(1);
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(null);
  if (page === "about")
    return (
      <>
        <SEO title="Our story" />
        <section className="about-hero">
          <span className="eyebrow">FARMERI / OUR STORY</span>
          <h1>
            For the
            <br />
            <em>fearless soul.</em>
          </h1>
          <p>
            Style is personal. We believe what you wear should feel like an
            extension of who you are.
          </p>
          <img
            src="/assets/winged-statue.png"
            alt="Farmeri winged statue illustration"
          />
        </section>
        <section className="section about-copy">
          <span className="eyebrow">OUR POINT OF VIEW</span>
          <h2>
            Everyday pieces.
            <br />
            Independent spirit.
          </h2>
          <p>
            Farmeri brings together relaxed silhouettes and expressive graphics.
            An open invitation to wear what feels right, move at your own pace,
            and tell your own story.
          </p>
          <p>
            This is the starting point for our brand story. Founder details,
            manufacturing process and verified material information will be
            added with the final brand assets.
          </p>
          <Link className="button" to="/shop">
            Explore the collection <ArrowUpRight size={17} />
          </Link>
        </section>
        <Newsletter />
      </>
    );
  if (page === "contact" || page === "track-order")
    return (
      <div className="section narrow">
        <SEO title={page === "contact" ? "Contact" : "Track order"} />
        <PageHead
          title={page === "contact" ? "Let’s talk." : "Follow your order."}
        >
          {page === "contact"
            ? "Sizing questions, order help or a new idea. We’re listening."
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
                ? "Send message"
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
  if (page === "size-guide")
    return (
      <div className="section narrow">
        <SEO title="Size guide" />
        <PageHead title="Find your fit." />
        <p>
          Sample oversized tee measurements in inches. Replace with measured
          production garments before launch.
        </p>
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>Chest circumference</th>
              <th>Length</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["S", 42, 27],
              ["M", 44, 28],
              ["L", 46, 29],
              ["XL", 48, 30],
            ].map((r) => (
              <tr key={r[0]}>
                {r.map((v) => (
                  <td key={v}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Lay a favourite tee flat. Measure across the chest and double it, then
          compare garment length from shoulder to hem.
        </p>
      </div>
    );
  const c = content[page];
  return (
    <div className="section narrow">
      <SEO title={c?.title || "Page not found"} />
      <PageHead title={c?.title || "Lost in the right direction."} />
      {c ? (
        c.sections.map(([title, text]) => (
          <details key={title} open={page !== "faq"}>
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
