import React, { useEffect } from "react";

export default function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal">
        <div className="modal-card" style={{ width: `min(${width}px, calc(100% - 32px))` }}>
          <div className="modal-head">
            <div className="modal-title">{title}</div>
            <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </>
  );
}
