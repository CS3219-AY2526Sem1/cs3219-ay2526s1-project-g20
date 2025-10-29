import React, { useEffect, useState } from "react";
import { Link, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard.jsx";
import Problems from "./pages/Problems.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import Matching from "./pages/Matching.jsx";

import Modal from "./components/Modal.jsx";
import LoginModal from "./pages/Login.jsx";
import ProfileModal from "./pages/Profile.jsx";

/* ----------------- Top Nav (only when logged in) ----------------- */
function Nav({ user, onAvatar }) {
  const { pathname } = useLocation();
  const pill = (to, label) => (
    <Link to={to} className={"pill " + (pathname === to ? "pill--active" : "pill--inactive")}>
      {label}
    </Link>
  );
  const initials = (user?.name || "JD").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="brand">PeerPrep</div>
        <nav className="nav">
          {pill("/", "Dashboard")}
          {pill("/problems", "Problems")}
        </nav>
        <button className="avatar-btn avatar-btn--grad" onClick={onAvatar} title="Profile">
          {initials}
        </button>
      </div>
    </header>
  );
}

/* ----------------------------- App ----------------------------- */
export default function App() {
  const navigate = useNavigate();

  // null = not logged in
  const [user, setUser] = useState(null);
  const [sheet, setSheet] = useState(null); // 'profile' | null

  // Persist user for refreshes
  useEffect(() => {
    const saved = localStorage.getItem("pp_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);
  useEffect(() => {
    if (user) localStorage.setItem("pp_user", JSON.stringify(user));
    else localStorage.removeItem("pp_user");
  }, [user]);

  const isAuthed = !!user;

  const openProfile = () => setSheet("profile");
  const closeSheet  = () => setSheet(null);

  const handleLogin = (u) => {
    setUser(u);
    setSheet(null);
    navigate("/"); // land on dashboard
  };

  const handleLogout = () => {
    setUser(null);
    setSheet(null);
    navigate("/"); // go back to login gate
  };

  // ----------- Gated UI: show login card when not authed -----------
  if (!isAuthed) {
    return (
      <div className="container" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
        <div className="card" style={{ maxWidth: 520, width: "100%" }}>
          <h2 style={{ margin: "4px 0 12px" }}>Welcome to PeerPrep</h2>
          <p className="p-muted" style={{ marginBottom: 12 }}>Please log in or create an account to continue.</p>
          {/* Reuse the same component; onClose not needed here */}
          <LoginModal onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  // ----------- Authenticated app -----------
  return (
    <div className="page">
      <Nav user={user} onAvatar={openProfile} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/matching" element={<Matching />} />
          {/* Block direct access when not authed (defensive) */}
          <Route
            path="/profile"
            element={isAuthed ? <ProfilePage user={user} /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>

      {sheet === "profile" && (
        <Modal title="Your Profile" onClose={closeSheet} width={640}>
          <ProfileModal user={user} onLogout={handleLogout} onClose={closeSheet} />
        </Modal>
      )}
    </div>
  );
}
