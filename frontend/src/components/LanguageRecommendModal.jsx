import React, { useEffect } from "react";

export default function LanguageRecommendModal({ open, onOk, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lang-reco-title"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", padding: 16 }}
      >
        <div
          className="modal-card"
          style={{
            background: "#ffffff",
            color: "#000000",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            maxWidth: 520,
            width: "100%",
            margin: "0 auto",
            position: "relative",
          }}
        >
          {/* Close (X) button */}
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#111111",
              fontSize: 18,
              lineHeight: 1,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            ×
          </button>

          {/* Header */}
          <div
            className="modal-header"
            style={{ padding: "20px 20px 10px 20px", textAlign: "center" }}
          >
            <h3
              id="lang-reco-title"
              className="modal-title"
              style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#000000" }}
            >
              Recommended Coding Language
            </h3>
          </div>

          {/* Body */}
          <div
            className="modal-body"
            style={{ padding: "8px 20px 20px 20px", textAlign: "center" }}
          >
            <p className="modal-text" style={{ margin: 0, color: "#000000" }}>
              Python is our recommended coding language since we still have limited support
              for other languages. If you decide to switch to another language, please
              inform your peer so that both of you can coordinate templates, testing,
              and runtime expectations.
            </p>
          </div>

          {/* Footer: single OK button */}
          <div
            className="modal-footer"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "14px 20px 24px 20px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <button
              className="btn btn-primary"
              onClick={onOk}
              style={{
                borderRadius: 8,
                padding: "10px 16px",
                cursor: "pointer",
                background: "#111827",
                color: "#ffffff",
                border: "1px solid #111827",
              }}
            >
              OK, got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
