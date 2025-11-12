import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../css/ProfileModal.css";

export default function ProfileModal({ onClose }) {
  const { user, logout } = useContext(AuthContext);

  if (!user) return <div>Loading...</div>;

  const initials = (user?.username || "JD")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="profile-modal">
      <div className="profile-header">
        <div className="avatar-lg">
          {initials}
          <span className="dot" />
        </div>
        <div>
          <div className="username">{user.username}</div>
          <div className="kicker">{user.email}</div>
        </div>
      </div>

      <div className="card stats-card">
        <div className="p-muted">Quick Stats</div>
        <div className="stats">
          <div className="stat">
            <div className="v">23</div>
            <div className="l">Sessions</div>
          </div>
          <div className="stat">
            <div className="v">45</div>
            <div className="l">Solved</div>
          </div>
          <div className="stat">
            <div className="v">7</div>
            <div className="l">Streak</div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <Link className="btn" to="/profile" onClick={onClose}>
          Full Profile
        </Link>
        <button className="btn btn--logout" onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}
