import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { createCheckout } from "../lib/api";
import { openPaddleCheckout } from "../lib/paddle";
import { useAuth } from "../context/AuthContext";

export default function UpgradeModal({ onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const overlayRef = useRef();
  const modalRef = useRef();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(overlayRef.current, { opacity: 0, duration: 0.25 });
      gsap.from(modalRef.current, {
        opacity: 0,
        y: 24,
        duration: 0.3,
        ease: "power3.out",
      });
    });
    return () => ctx.revert();
  }, []);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      await openPaddleCheckout({
        email: user?.email,
        userId: user?.id,
      });
      setLoading(false);
    } catch (err) {
      // Fallback to backend-hosted checkout link if overlay setup is incomplete.
      try {
        const { url } = await createCheckout();
        window.location.href = url;
      } catch {
        setError(err.message);
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="modal" ref={modalRef}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="modal-badge">Pro Plan</div>
        <h2 className="modal-title">Unlock unlimited generations</h2>

        <div className="modal-price">
          <span className="price-amount">$12</span>
          <span className="price-period">/ month</span>
        </div>

        <ul className="modal-features">
          <li>✓ Unlimited content generations</li>
          <li>✓ All 4 tone modes</li>
          <li>✓ Edit output directly before copying</li>
          <li>✓ Full history and saved items library</li>
          <li>✓ Cancel anytime</li>
        </ul>

        <p className="modal-value-note">
          Less than one hour of writing. Pays for itself on day one.
        </p>

        {error && <p className="modal-error">{error}</p>}

        <button
          className="btn-primary btn-full"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? "Redirecting to checkout…" : "Get Pro — $12/month"}
        </button>
      </div>
    </div>
  );
}
