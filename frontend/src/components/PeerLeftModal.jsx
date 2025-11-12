import React, { useEffect } from "react";

export default function PeerLeftModal({ open, onContinue, onExit, onClose }) {
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
        // dark overlay behind the panel
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
        aria-labelledby="peer-left-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          padding: 16,
        }}
      >
        <div
          className="modal-card"
          style={{
            // white panel with black text
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
          {/* Close (X) button in top-right corner */}
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
            style={{
              padding: "20px 20px 10px 20px",
              textAlign: "center",
            }}
          >
            <h3
              id="peer-left-title"
              className="modal-title"
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#000000",
              }}
            >
              Your peer left the session!
            </h3>
          </div>

          {/* Body */}
          <div
            className="modal-body"
            style={{
              padding: "8px 20px 20px 20px",
              textAlign: "center",
            }}
          >
            <p
              className="modal-text"
              style={{
                margin: 0,
                color: "#000000",
              }}
            >
              The other participant has quit. You can continue editing on your
              own, or return to the dashborad.
            </p>
          </div>

          {/* Footer with evenly split buttons and breathing room above bottom border */}
          <div
            className="modal-footer"
            style={{
              display: "flex",
              gap: 12,
              padding: "14px 20px 24px 20px", // extra bottom padding to leave space from the border
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <button
              className="btn btn-ghost"
              onClick={onContinue}
              style={{
                flex: 1, // evenly split width
                borderRadius: 8,
                padding: "10px 12px",
                cursor: "pointer",
                background: "#ffffff",
                color: "#000000",
                border: "1px solid #e5e7eb",
              }}
            >
              Continue here
            </button>
            <button
              className="btn btn-primary"
              onClick={onExit}
              style={{
                flex: 1, // evenly split width
                borderRadius: 8,
                padding: "10px 12px",
                cursor: "pointer",
                background: "#111827", // dark primary
                color: "#ffffff",
                border: "1px solid #111827",
              }}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
