import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useAuth } from "../context/AuthContext";
import { cancelSubscription, createCheckout } from "../lib/api";
import { openPaddleCheckout } from "../lib/paddle";

const PAGE_CONTENT = {
  "/pricing": {
    title: "Pricing",
    subtitle: "Simple monthly pricing for RepurposePro.",
    body: [],
  },
  "/terms": {
    title: "Terms of Service",
    subtitle: "These terms govern your access to and use of RepurposePro.",
    updatedAt: "May 6, 2026",
    body: [
      "By creating an account, accessing, or using RepurposePro, you agree to these Terms of Service.",
      "If you do not agree, do not use the service.",
    ],
    sections: [
      {
        heading: "1) Service description",
        points: [
          "RepurposePro is a subscription software service that helps users generate and edit written marketing content.",
          "We may add, remove, or modify features to improve security, reliability, and product quality.",
        ],
      },
      {
        heading: "2) Accounts and eligibility",
        points: [
          "You are responsible for maintaining the security of your account and credentials.",
          "You agree to provide accurate account information and keep it up to date.",
          "You are responsible for all activity under your account unless caused by our breach of security obligations.",
        ],
      },
      {
        heading: "3) Acceptable use",
        points: [
          "You may not use the service for illegal, abusive, infringing, deceptive, or harmful content or conduct.",
          "You may not attempt to reverse engineer, disrupt, or abuse the platform, including through scraping or automated misuse.",
          "We may suspend or terminate accounts that violate these terms or create risk to users, partners, or the service.",
        ],
      },
      {
        heading: "4) Billing, subscriptions, and cancellation",
        points: [
          "Paid plans are billed in advance on a recurring basis until cancelled.",
          "Payments are processed by Paddle, our merchant of record and payment provider.",
          "You can cancel at any time; cancellation prevents future renewals but does not retroactively refund already billed periods unless required by law or our Refund Policy.",
        ],
      },
      {
        heading: "5) Intellectual property",
        points: [
          "RepurposePro, including its software, branding, and platform content, is owned by us or our licensors and protected by applicable laws.",
          "You retain rights to your original inputs and outputs to the extent permitted by law and third-party rights.",
        ],
      },
      {
        heading: "6) Disclaimers and limitation of liability",
        points: [
          "The service is provided on an 'as is' and 'as available' basis without warranties to the extent permitted by law.",
          "To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages.",
          "Our total liability for claims relating to the service is limited to the amount paid by you for the service in the 12 months before the event giving rise to the claim.",
        ],
      },
      {
        heading: "7) Termination",
        points: [
          "You may stop using the service at any time.",
          "We may suspend or terminate access for violations, legal obligations, or security and abuse concerns.",
        ],
      },
      {
        heading: "8) Changes to terms",
        points: [
          "We may update these terms from time to time. The updated version will be posted on this page with a revised effective date.",
          "Continued use after updates means you accept the revised terms.",
        ],
      },
      {
        heading: "9) Contact",
        points: ["Questions about these terms: support@repurposepro.app"],
      },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    subtitle: "How we collect, use, and protect your information.",
    updatedAt: "May 6, 2026",
    body: [
      "This Privacy Policy explains what data RepurposePro collects and how we use it.",
      "By using the service, you acknowledge the practices described below.",
    ],
    sections: [
      {
        heading: "1) Information we collect",
        points: [
          "Account information: email, authentication identifiers, and basic profile information provided by your sign-in provider.",
          "Service data: prompts/inputs, generated outputs, saved items, and usage metadata necessary to run product features.",
          "Technical data: device/browser details, IP-derived security signals, and logs used for reliability, fraud prevention, and troubleshooting.",
        ],
      },
      {
        heading: "2) How we use information",
        points: [
          "To provide, maintain, and improve the service and user experience.",
          "To secure accounts, detect abuse, and enforce terms and policies.",
          "To communicate important account, product, and billing notices.",
        ],
      },
      {
        heading: "3) Payments and processors",
        points: [
          "Payments are processed by Paddle as merchant of record.",
          "We do not store full payment card data on our servers.",
          "We may use trusted processors and infrastructure providers to host and operate the product.",
        ],
      },
      {
        heading: "4) Legal bases and retention",
        points: [
          "We process data based on contract performance, legitimate interests, compliance obligations, and consent where required.",
          "We retain data only as long as necessary for service delivery, legal obligations, dispute resolution, and security purposes.",
        ],
      },
      {
        heading: "5) Your rights",
        points: [
          "You may request access, correction, or deletion of your personal data, subject to legal and operational exceptions.",
          "You may also request export of your account data where feasible.",
          "Requests can be made by contacting support@repurposepro.app.",
        ],
      },
      {
        heading: "6) International transfers and security",
        points: [
          "Your data may be processed in jurisdictions different from your own, with safeguards appropriate to applicable law.",
          "We use reasonable technical and organizational safeguards to protect personal data, but no system is 100% secure.",
        ],
      },
      {
        heading: "7) Children's privacy",
        points: [
          "RepurposePro is not intended for children under 13 (or higher minimum age required by local law).",
        ],
      },
      {
        heading: "8) Policy updates",
        points: [
          "We may update this policy from time to time. Material changes will be reflected by updating the date on this page.",
        ],
      },
    ],
  },
  "/refund-policy": {
    title: "Refund Policy",
    subtitle: "How refunds are handled for RepurposePro subscriptions.",
    updatedAt: "May 6, 2026",
    body: [
      "This Refund Policy applies to subscription purchases made for RepurposePro.",
      "It is intended to be fair while protecting against abuse.",
    ],
    sections: [
      {
        heading: "1) Eligibility",
        points: [
          "If you were charged in error (duplicate, unauthorized, or clearly incorrect charge), contact us and we will investigate promptly.",
          "Initial subscription purchases may be considered for refund requests submitted within 14 calendar days of the charge date.",
          "Renewal charges are generally non-refundable once a new billing period starts, except where required by law or where we determine exceptional circumstances.",
        ],
      },
      {
        heading: "2) Non-refundable situations",
        points: [
          "Partial-period refunds for unused time after cancellation are generally not provided.",
          "Refunds may be denied for abuse, repeated refund patterns, or substantial account usage during the billed period.",
        ],
      },
      {
        heading: "3) How to request a refund",
        points: [
          "Email support@repurposepro.app with your account email, charge date, amount, and reason for request.",
          "We may request additional details needed to verify account ownership and billing context.",
        ],
      },
      {
        heading: "4) Processing timelines",
        points: [
          "Approved refunds are issued via Paddle to the original payment method.",
          "Once approved, processing times depend on your payment provider and may take 5-10 business days.",
        ],
      },
      {
        heading: "5) Cancellations",
        points: [
          "You can cancel your subscription at any time to prevent future renewals.",
          "Cancellation does not automatically trigger a refund for prior charges unless eligibility above is met.",
        ],
      },
    ],
  },
};

export default function PublicPage({ path, usage }) {
  const { user } = useAuth();
  const containerRef = useRef(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [cancelMessage, setCancelMessage] = useState(null);
  const isCheckingSubscription = !!user && path === "/pricing" && !usage;
  const hasProPlan = usage?.plan === "pro";
  const content = PAGE_CONTENT[path];
  if (!content) return null;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(
        ".public-page-eyebrow, .public-page-title, .public-page-subtitle, .public-page-updated",
        {
          y: 14,
          opacity: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: "power3.out",
        },
      );
      gsap.from(".public-pricing-card", {
        y: 18,
        opacity: 0,
        duration: 0.4,
        delay: 0.12,
        ease: "power3.out",
      });
      gsap.from(".public-page-body, .public-page-section", {
        y: 16,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        delay: 0.16,
        ease: "power3.out",
      });
    }, containerRef);
    return () => ctx.revert();
  }, [path]);

  async function handleCheckout() {
    setLoadingCheckout(true);
    setCheckoutError(null);
    setCancelMessage(null);
    try {
      await openPaddleCheckout({
        email: user?.email,
        userId: user?.id,
      });
      setLoadingCheckout(false);
    } catch (err) {
      try {
        const { url } = await createCheckout();
        window.location.href = url;
      } catch {
        setCheckoutError(err.message || "Could not open checkout right now.");
        setLoadingCheckout(false);
      }
    }
  }

  async function handleCancelSubscription() {
    setLoadingCancel(true);
    setCheckoutError(null);
    setCancelMessage(null);
    try {
      await cancelSubscription();
      setCancelMessage(
        "Your subscription will be canceled at the end of the current billing period.",
      );
    } catch (err) {
      setCheckoutError(
        err.message || "Could not cancel subscription right now.",
      );
    } finally {
      setLoadingCancel(false);
    }
  }

  return (
    <section className="public-page" ref={containerRef}>
      <div className="public-page-card">
        <p className="public-page-eyebrow">RepurposePro</p>
        <h1 className="public-page-title">{content.title}</h1>
        <p className="public-page-subtitle">{content.subtitle}</p>
        {content.updatedAt && (
          <p className="public-page-updated">
            Last updated: {content.updatedAt}
          </p>
        )}
        {path === "/pricing" && (
          <div className="public-pricing-card">
            <div className="public-pricing-head">
              <span className="public-pricing-badge">Pro plan</span>
              <h2 className="public-pricing-price">
                <span className="public-pricing-amount">$12</span>
                <span className="public-pricing-period">/ month</span>
              </h2>
            </div>
            <ul className="public-pricing-features">
              <li>Unlimited content generations</li>
              <li>All 4 tone modes</li>
              <li>Editing, history, and saved items</li>
              <li>Cancel anytime</li>
            </ul>
            {checkoutError && (
              <p className="public-pricing-error">{checkoutError}</p>
            )}
            {isCheckingSubscription ? (
              <button className="btn-primary btn-full" disabled>
                <span className="btn-inline-loader" aria-hidden />
                Checking subscription...
              </button>
            ) : !hasProPlan ? (
              <button
                className="btn-primary btn-full"
                onClick={handleCheckout}
                disabled={loadingCheckout}
              >
                {loadingCheckout ? "Opening checkout…" : "Get Pro - $12/month"}
              </button>
            ) : (
              <p className="public-pricing-status">
                You already have Pro access.
              </p>
            )}
            {hasProPlan && (
              <>
                <button
                  className="btn-ghost btn-full"
                  onClick={handleCancelSubscription}
                  disabled={loadingCancel}
                >
                  {loadingCancel
                    ? "Cancelling subscription..."
                    : "Cancel subscription"}
                </button>
                <p className="public-pricing-cancel-note">
                  Cancel in-app without leaving this site.
                </p>
              </>
            )}
            {cancelMessage && (
              <p className="public-pricing-success">{cancelMessage}</p>
            )}
          </div>
        )}
        <div className="public-page-body">
          {content.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {content.sections?.map((section) => (
          <section className="public-page-section" key={section.heading}>
            <h2 className="public-page-section-title">{section.heading}</h2>
            <ul className="public-page-section-list">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
