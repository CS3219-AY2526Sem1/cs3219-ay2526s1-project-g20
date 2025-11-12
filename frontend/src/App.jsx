import React, { useState, useEffect, useContext } from "react";
import { Link, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard.jsx";
import Problems from "./pages/Problems.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import Matching from "./pages/Matching.jsx";
import CodeEditor from "./pages/CodeEditor.jsx";
import Collaboration from "./pages/Collaboration.jsx";
import Modal from "./components/ProfilePopUpModal.jsx";
import LoginModal from "./pages/LoginModal.jsx";
import ProfileModal from "./pages/ProfileModal.jsx";

/* ----------------- Top Nav (only when logged in) ----------------- */
function Nav({ user, onAvatar }) {
  const { pathname } = useLocation();
  const pill = (to, label) => (
    <Link to={to} className={"pill " + (pathname === to ? "pill--active" : "pill--inactive")}>
      {label}
    </Link>
  );
  const initials = (user?.username || "JD").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="brand">PeerPrep</div>
        <nav className="nav">
          {pill("/", "Dashboard")}
          {pill("/problems", "Practice Problems")}
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
function AppContent() {
  const navigate = useNavigate();
  const { user, loading, logout } = useContext(AuthContext);
  const [sheet, setSheet] = useState(null); // 'profile' | null\
  const location = useLocation();

  const openProfile = () => setSheet("profile");
  const closeSheet = () => setSheet(null);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
    <div className="container" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}>
        <div className="card" style={{ maxWidth: 520, width: "100%" }}>
          <h2 style={{ margin: "4px 0 12px" }}>Welcome to PeerPrep</h2>
          <p className="p-muted" style={{ marginBottom: 12 }}>
            Please log in or create an account to continue.
          </p>
          <LoginModal onClose={() => {}} />
        </div>
      </div>
    );
  }

  const isCollaborationPage = location.pathname.startsWith("/collab");

  return (
    <div className="page">
      <Nav user={user} onAvatar={openProfile} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/matching" element={<Matching />} />
          <Route path="/collab/:sessionId" element={<Collaboration />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Code editor renders outside container for full width */}
      <Routes>
        <Route path="/code/:questionId" element={<CodeEditor />} />
      </Routes>

      {!isCollaborationPage && sheet === "profile" && (
        <Modal title="Your Profile" onClose={closeSheet} width={640}>
          <ProfileModal user={user} onLogout={logout} onClose={closeSheet} />
        </Modal>
      )}
    </div>
  );
}
