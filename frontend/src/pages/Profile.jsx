import React from "react";
import { Link } from "react-router-dom";
import "../css/Profile.css"; // Import the CSS file

export default function ProfileModal({ user, onLogout, onClose }) {
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
          <div className="username">{user?.username || "John Doe"}</div>
          <div className="kicker">{user?.email || "john.doe@example.com"}</div>
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
        <button className="btn btn--logout" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
